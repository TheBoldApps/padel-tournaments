# Supabase auth + cloud sync for Padel Tournaments

**Status**: design (approved 2026-05-01)
**Supabase project**: `ifvofqwbxtooersnuwpe`

## Goals

1. Users can use the app immediately without creating an account (anonymous auth).
2. Users can create a real account (Apple Sign-In on iOS, email OTP on Android/web) and keep their tournaments — the upgrade preserves the existing `user_id`.
3. Tournaments are stored in Supabase, scoped per user, with RLS.
4. The app is offline-first: writes are local-first and optimistically synced.
5. A Settings screen (gear icon, top-right of home) exposes Profile, Terms, Privacy, Rate app, Feedback, Sign out.

## Non-goals (this iteration)

- Collaborative editing of one tournament from multiple devices simultaneously.
- Realtime subscriptions (we'll add later only for the live-scoring screen if needed).
- Sharing tournaments between users.
- Stats/history beyond what's already computed locally.

## Architecture

### Stack additions

- `@supabase/supabase-js` — auth + data client.
- `expo-apple-authentication` — native Apple Sign-In on iOS.
- `expo-store-review` — in-app rating prompt.
- `expo-application` — version string for Settings footer.
- `expo-secure-store` — encrypted token storage (production-grade, replaces AsyncStorage for the auth session only).
- `react-native-url-polyfill` — required by supabase-js on RN.

Tournament data continues to use `AsyncStorage` as a local cache mirror; it is not the source of truth once the user has a session.

### File layout

```
src/
├── app/
│   ├── _layout.tsx          # SessionProvider + Stack.Protected guards
│   ├── welcome.tsx          # NEW – first-launch auth landing (anonymous / sign-in)
│   ├── sign-in.tsx          # NEW – email OTP + Apple Sign-In screen
│   ├── settings.tsx         # NEW – iOS-style grouped list
│   ├── profile.tsx          # NEW – display name, email, link/unlink identities
│   ├── index.tsx            # home (header gets gear icon)
│   ├── new/...              # unchanged
│   └── [id]/...             # unchanged
├── components/
│   ├── ui.tsx               # existing
│   └── settings-row.tsx     # NEW – Row + Section primitives for grouped lists
├── lib/
│   ├── supabase.ts          # NEW – createClient with PKCE + SecureStore
│   ├── auth-context.tsx     # NEW – SessionProvider + useSession hook
│   ├── sync.ts              # NEW – pull/push tournaments to Supabase
│   └── scheduler.ts         # existing
└── store/
    └── tournaments.ts       # extended – emit "dirty" events for sync
```

### Auth flow

```
First launch (no session)
  → welcome.tsx
      ├─ "Continue without account" → supabase.auth.signInAnonymously()
      └─ "Sign in / Create account"  → sign-in.tsx
           ├─ Apple Sign-In (iOS only) → signInWithIdToken({ provider: "apple" })
           └─ Email OTP → signInWithOtp({ email }) → verifyOtp({ email, token, type: "email" })

Anonymous → real account upgrade (from Settings → Profile)
  ├─ "Link Apple"     → linkIdentity({ provider: "apple" })  — fallback to signInWithIdToken if RN flow rejects
  └─ "Add email"      → updateUser({ email }) → user clicks email link → updateUser({ password })
                        OR signInWithOtp linking flow
The same auth.users.id is preserved, so all rows in `tournaments` (FK on owner_id) stay attached.

Sign out
  → supabase.auth.signOut() → SessionProvider clears session → Stack.Protected guard flips to welcome.
```

Auth gating uses Expo Router's `Stack.Protected` API (not the deprecated `(auth)` group + redirect-on-mount pattern). The root layout renders different screens based on `session` truthiness.

### Settings screen

Hand-rolled iOS-grouped-list look using `AdaptiveGlass` sections + `Pressable` rows. No emoji — SF Symbols on iOS via `expo-image` `source="sf:..."`. Sections:

- **Account**
  - Profile (chevron → `/profile`)
  - Sign out (destructive, only when signed in non-anonymously) OR "Create account" (when anonymous, → `/sign-in`)
- **About**
  - Terms & Conditions (`Linking.openURL` to hosted URL — placeholder until legal text is ready)
  - Privacy Policy (same)
  - Rate app (`expo-store-review.requestReview()`)
  - Send feedback (`mailto:` to a configured address)
- Footer: `Version <nativeApplicationVersion> (<nativeBuildVersion>)`

Settings is a form-sheet modal so the iOS 26 glass material picks up correctly: `presentation: "formSheet", contentStyle: { backgroundColor: "transparent" }`.

### Supabase schema

Single normalized-but-pragmatic table: tournament metadata as columns, tournament structure as JSONB.

```sql
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  format text not null check (format in ('americano','mexicano')),
  points_per_match int not null check (points_per_match > 0),
  data jsonb not null,        -- { players, rounds } — the existing Tournament shape minus duplicated fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_owner_id_idx on public.tournaments (owner_id, updated_at desc);

alter table public.tournaments enable row level security;

create policy "owner can read own tournaments"
  on public.tournaments for select
  using ((select auth.uid()) = owner_id);

create policy "owner can insert own tournaments"
  on public.tournaments for insert
  with check ((select auth.uid()) = owner_id);

create policy "owner can update own tournaments"
  on public.tournaments for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner can delete own tournaments"
  on public.tournaments for delete
  using ((select auth.uid()) = owner_id);

-- updated_at maintenance trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();
```

Why JSONB for the body: the user accepted the tradeoff. Concurrent edits to the same tournament are last-write-wins on the whole row. If we ever need collaborative live scoring, we can split out `rounds` and `matches` into normalized tables later — the column shape stays additive.

`auth.uid()` is wrapped in `(select …)` per Supabase RLS perf guidance (cached per query plan instead of per row).

### Sync model

The local store (`src/store/tournaments.ts`) stays as the UI's source of truth. We extend it with a sync layer:

1. **Hydration** (on session ready):
   - Fetch all tournaments for the current `owner_id`, ordered by `updated_at desc`.
   - Merge into the local store: server `updated_at` newer ⇒ overwrite local; local `updated_at` newer ⇒ enqueue an upsert (handles offline edits).
2. **Local writes** (existing `createTournament` / `updateTournament` / `deleteTournament`):
   - Update local state immediately (UI stays snappy, offline still works).
   - Stamp `updated_at = Date.now()` on the touched tournament.
   - Enqueue a sync op (upsert or delete) keyed by tournament id (latest replaces earlier ops for the same id).
3. **Flush**:
   - Drain the queue when online; retry with exponential backoff on failure.
   - On `AppState` `active` and on session change, drain immediately.
4. **Refetch on foreground**:
   - When the app returns to foreground, refetch the user's tournaments and merge as in step 1.

Conflict resolution: `updated_at` wins. Acceptable given the chosen JSONB-blob model and single-user-per-tournament expectation.

Existing AsyncStorage tournaments (from before this feature) are migrated on first sign-in: each is upserted to Supabase with the current `owner_id`, then we mark them as synced. After migration, AsyncStorage becomes a passive cache.

### Anonymous user lifecycle

Per Supabase RLS perf guidance, anonymous users get the same `auth.users` row as everyone else, so all FKs and policies just work. We add a `is_anonymous` claim guard if we ever need to restrict certain operations to converted accounts (not needed for v1).

A Supabase scheduled job (out of scope for this spec) can later prune stale anonymous users with no tournaments after 30 days. Not implementing now.

### Configuration

- `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key only — never the service role).
- `.mcp.json`: add the Supabase MCP server entry so we can run migrations / advisors locally during implementation.
- Supabase dashboard:
  - Enable Apple provider (Service ID, key, team ID — user provides).
  - Configure email OTP template (default is fine for v1).
  - Enable anonymous sign-ins; set a Turnstile/CAPTCHA on production (deferred).

### Error handling & edge cases

- **No network at first launch**: anonymous sign-in fails offline. Fallback: keep the welcome screen, allow "Continue without account" to retry; once it succeeds the user is anonymous and the app proceeds.
- **Token refresh during long backgrounds**: handled by the `AppState` listener wiring `startAutoRefresh` / `stopAutoRefresh`.
- **Sign-out with unsynced edits**: drain the queue before clearing the session; if drain fails (offline), warn the user "You have unsynced changes — sign out anyway?".
- **Apple Sign-In on Android/web**: hide the button; only show on iOS.

### Testing strategy

- Unit-test the sync merge logic in isolation (pure function over local + remote tournament arrays).
- Manual test matrix:
  - First-launch anonymous flow.
  - Email OTP flow (real device).
  - Apple Sign-In flow (real iOS device).
  - Anonymous → email upgrade (verify same `user_id` and tournaments preserved).
  - Anonymous → Apple upgrade.
  - Offline create → online sync.
  - Sign out → sign in on second device → tournaments appear.
  - Pull-to-refresh on home.
  - Settings rows (rate, terms, feedback).

### Out of scope / explicit deferrals

- Realtime subscriptions.
- Tournament sharing / multi-organizer collaboration.
- Push notifications on round changes.
- Server-side standings computation.
- CAPTCHA on anonymous sign-up (add before public launch).
- Anonymous-user pruning cron.
