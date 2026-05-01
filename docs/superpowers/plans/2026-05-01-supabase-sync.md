# Supabase Auth + Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase auth (anonymous + Apple/email-OTP) and per-user cloud sync of tournaments, plus an iOS-style Settings screen accessed from the home header.

**Architecture:** Local-first store stays the UI source of truth; a thin sync layer pushes/pulls a single `tournaments` table (id, owner_id, metadata, JSONB body) gated by RLS. Auth uses `Stack.Protected` guards in the root layout. Anonymous users get a real `auth.users` row so identity-linking later preserves their data.

**Tech Stack:** Expo SDK 55, expo-router, React Native 0.83, `@supabase/supabase-js`, `expo-apple-authentication`, `expo-secure-store`, `expo-store-review`, `expo-application`, AsyncStorage (existing), `react-native-url-polyfill`.

**Spec:** `docs/superpowers/specs/2026-05-01-supabase-sync-design.md`

---

## Task 1: Wire up Supabase MCP server + install dependencies

**Files:**
- Modify: `.mcp.json`
- Modify: `package.json` (via `bunx expo add`)
- Modify: `app.json` (Apple Sign-In entitlement)
- Create: `.env.example`

- [ ] **Step 1: Add Supabase MCP server to `.mcp.json`**

Edit `.mcp.json` so it reads:

```json
{
  "mcpServers": {
    "expo-mcp": {
      "type": "http",
      "url": "https://mcp.expo.dev/mcp"
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

After saving, the user must run `/mcp` (or restart the agent) and complete the OAuth flow in the browser. Wait for the MCP tools (`mcp__supabase__list_tables`, `mcp__supabase__apply_migration`, etc.) to become available before continuing.

- [ ] **Step 2: Install runtime dependencies**

```bash
bunx expo add @supabase/supabase-js expo-apple-authentication expo-secure-store expo-store-review expo-application react-native-url-polyfill
```

Expected: `package.json` updated, `bun.lock` updated, no errors.

- [ ] **Step 3: Enable Apple Sign-In iOS entitlement**

Edit `app.json`. Under `expo.ios`, add:

```json
"usesAppleSignIn": true
```

Then under `expo.plugins` add (creating the array if needed):

```json
"expo-apple-authentication"
```

- [ ] **Step 4: Create `.env.example`**

Write `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://ifvofqwbxtooersnuwpe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Tell the user: copy to `.env` and fill in the publishable anon key from Supabase dashboard → Project Settings → API.

- [ ] **Step 5: Verify `.gitignore` excludes `.env`**

Run: `grep -n '^\.env$' .gitignore`
Expected: a line `^.env$` exists. If missing, append `.env` to `.gitignore`.

- [ ] **Step 6: Commit**

```bash
git add .mcp.json package.json bun.lock app.json .env.example .gitignore
git commit -m "feat: add Supabase + Apple Sign-In dependencies and MCP wiring"
```

---

## Task 2: Create the Supabase client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create `src/lib/supabase.ts`**

```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client with PKCE + AppState refresh"
```

---

## Task 3: Apply the `tournaments` schema migration

**Files:**
- Create: migration via Supabase MCP `apply_migration` (no local SQL file needed; we'll snapshot at end)

Prerequisite: Supabase MCP server is authenticated (Task 1 step 1).

- [ ] **Step 1: Confirm project**

Use MCP `mcp__supabase__list_projects` and locate project ref `ifvofqwbxtooersnuwpe`. If the MCP client supports it, set the active project to that ref.

- [ ] **Step 2: Inspect existing schema**

Use MCP `mcp__supabase__list_tables` (schema=`public`).
Expected: empty (no `tournaments` table yet). If a table already exists, stop and ask the user.

- [ ] **Step 3: Apply the migration**

Use MCP `mcp__supabase__apply_migration` with name `create_tournaments` and SQL:

```sql
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  format text not null check (format in ('americano','mexicano')),
  points_per_match int not null check (points_per_match > 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_owner_id_idx on public.tournaments (owner_id, updated_at desc);

alter table public.tournaments enable row level security;

create policy "owner_select" on public.tournaments
  for select using ((select auth.uid()) = owner_id);

create policy "owner_insert" on public.tournaments
  for insert with check ((select auth.uid()) = owner_id);

create policy "owner_update" on public.tournaments
  for update using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner_delete" on public.tournaments
  for delete using ((select auth.uid()) = owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();
```

- [ ] **Step 4: Verify**

Use MCP `mcp__supabase__list_tables` (schema=`public`). Expected: `tournaments` listed with RLS enabled.

Use MCP `mcp__supabase__execute_sql` with `select polname, polcmd from pg_policies where tablename = 'tournaments';`. Expected: 4 rows (`owner_select`, `owner_insert`, `owner_update`, `owner_delete`).

- [ ] **Step 5: Run advisors**

Use MCP `mcp__supabase__get_advisors` (type=`security`, then type=`performance`). Fix any errors before continuing. (Warnings: judgment call — RLS-on-anon is the design here.)

- [ ] **Step 6: Enable anonymous sign-ins**

Tell the user to go to Supabase dashboard → Authentication → Providers → Email → enable **"Allow anonymous sign-ins"** and save.

- [ ] **Step 7: Configure Apple provider (deferred to user)**

The user must add Apple credentials in Supabase dashboard → Authentication → Providers → Apple (Service ID, Team ID, Key ID, private key). Plan execution does not block on this — Apple Sign-In simply won't work in the app until configured. Note this in the handoff to the user.

- [ ] **Step 8: Commit (no local files changed; we'll snapshot the migration in Task 17)**

(Skip — no local changes to commit.)

---

## Task 4: Auth context + session provider

**Files:**
- Create: `src/lib/auth-context.tsx`

- [ ] **Step 1: Create `src/lib/auth-context.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  isLoading: boolean;
};

const Ctx = createContext<AuthState>({
  session: null,
  user: null,
  isAnonymous: false,
  isLoading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isAnonymous = Boolean(user?.is_anonymous);

  return (
    <Ctx.Provider value={{ session, user, isAnonymous, isLoading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  return useContext(Ctx);
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-context.tsx
git commit -m "feat: add SessionProvider with Supabase auth state"
```

---

## Task 5: Rewire root layout with `Stack.Protected` guards

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Replace the layout**

Overwrite `src/app/_layout.tsx`:

```tsx
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider, useSession } from "@/lib/auth-context";
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";

export default function Layout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerLargeTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerTintColor: PlatformColor("systemTeal") as unknown as string,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: "Tournaments" }} />
        <Stack.Screen
          name="new"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{ title: "Tournament", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="[id]/standings"
          options={{ title: "Standings", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: "Profile", headerLargeTitle: false }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in"
          options={{
            title: "Sign in",
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors. (TS will complain about referenced screens that don't exist yet; that's OK — they're created in subsequent tasks. If the project's tsconfig is strict and this blocks the build, temporarily comment out the missing-screen lines and uncomment as each task lands.)

- [ ] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: gate routes with Stack.Protected based on session"
```

---

## Task 6: Welcome screen

**Files:**
- Create: `src/app/welcome.tsx`

- [ ] **Step 1: Create `src/app/welcome.tsx`**

```tsx
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PlatformColor,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome() {
  const [loading, setLoading] = useState(false);

  const continueAnonymously = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (error) Alert.alert("Couldn't continue", error.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source="sf:figure.tennis"
          tintColor={PlatformColor("label") as unknown as string}
          style={{ width: 64, height: 64, marginBottom: 16 }}
        />
        <Text style={styles.title}>Padel Tournaments</Text>
        <Text style={styles.subtitle}>
          Run Americano and Mexicano nights with friends.
        </Text>
      </View>

      <View style={styles.actions}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Button
              title="Sign in / Create account"
              onPress={() => router.push("/sign-in")}
            />
            <Button
              title="Continue without account"
              variant="ghost"
              onPress={continueAnonymously}
            />
            <Text style={styles.fineprint}>
              You can create an account anytime — your tournaments stay with you.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
  },
  actions: { gap: 12, paddingBottom: 12 },
  fineprint: {
    marginTop: 8,
    fontSize: 12,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
  },
});
```

- [ ] **Step 2: Manual smoke test**

Start the app: `bunx expo start --ios`. Cold-start with no session → welcome screen renders. Tap "Continue without account" → `Stack.Protected` flips → home (`/`) shows.

- [ ] **Step 3: Commit**

```bash
git add src/app/welcome.tsx
git commit -m "feat: welcome screen with anonymous sign-in"
```

---

## Task 7: Sign-in screen with Apple + email OTP

**Files:**
- Create: `src/app/sign-in.tsx`

- [ ] **Step 1: Create `src/app/sign-in.tsx`**

```tsx
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  PlatformColor,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't send code", error.message);
      return;
    }
    setStage("code");
  };

  const verifyCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Invalid code", error.message);
      return;
    }
    router.dismissAll();
  };

  const appleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      // Save name on first sign-in (Apple only returns it once)
      if (credential.fullName?.givenName) {
        const display = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ]
          .filter(Boolean)
          .join(" ");
        await supabase.auth.updateUser({ data: { display_name: display } });
      }
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Apple Sign-In failed", String(e?.message ?? e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, gap: 16 }}
      >
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ height: 48 }}
            onPress={appleSignIn}
          />
        )}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.line} />
        </View>

        {stage === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={
                PlatformColor("placeholderText") as unknown as string
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
            <Button
              title={loading ? "Sending…" : "Email me a code"}
              onPress={sendCode}
              disabled={loading || !email.includes("@")}
            />
          </>
        ) : (
          <>
            <Text style={styles.helper}>
              We sent a 6-digit code to {email}. Enter it below.
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={
                PlatformColor("placeholderText") as unknown as string
              }
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
            <Button
              title={loading ? "Verifying…" : "Verify"}
              onPress={verifyCode}
              disabled={loading || code.length < 6}
            />
            <Button
              title="Use a different email"
              variant="ghost"
              onPress={() => {
                setStage("email");
                setCode("");
              }}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: 8 },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
  },
  dividerText: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontSize: 13,
  },
  helper: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: PlatformColor("separator") as unknown as string,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
    borderCurve: "continuous",
  },
});
```

- [ ] **Step 2: Manual smoke test (email flow)**

From welcome → "Sign in" → enter your email → "Email me a code" → check inbox → enter 6-digit code → screen dismisses, home shows.

- [ ] **Step 3: Manual smoke test (Apple flow)**

From welcome → "Sign in" → tap Apple button. If Apple credentials aren't yet configured in Supabase dashboard, this will error — that's expected; ask user to configure them and retry.

- [ ] **Step 4: Commit**

```bash
git add src/app/sign-in.tsx
git commit -m "feat: sign-in screen with Apple ID + email OTP"
```

---

## Task 8: Extend tournaments store with `updated_at` + dirty tracking

**Files:**
- Modify: `src/store/tournaments.ts`

The store needs to (a) track `updated_at` on every change so sync can compare with server timestamps, and (b) emit a "changed" signal that the sync layer subscribes to.

- [ ] **Step 1: Add `updated_at` to the type and seed it on create**

Edit `src/store/tournaments.ts`. Update the `Tournament` type:

```ts
export type Tournament = {
  id: string;
  name: string;
  format: Format;
  pointsPerMatch: number;
  players: string[];
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
};
```

- [ ] **Step 2: Stamp `updatedAt` on every mutation**

Replace `createTournament`, `updateTournament`, `deleteTournament`:

```ts
export function createTournament(input: {
  name: string;
  format: Format;
  pointsPerMatch: number;
  players: string[];
}): Tournament {
  const now = Date.now();
  const t: Tournament = {
    id: Math.random().toString(36).slice(2, 10),
    name: input.name,
    format: input.format,
    pointsPerMatch: input.pointsPerMatch,
    players: input.players,
    rounds: [],
    createdAt: now,
    updatedAt: now,
  };
  setState({ tournaments: [t, ...state.tournaments] });
  changeListeners.forEach((l) => l({ kind: "upsert", tournament: t }));
  return t;
}

export function deleteTournament(id: string) {
  setState({ tournaments: state.tournaments.filter((t) => t.id !== id) });
  changeListeners.forEach((l) => l({ kind: "delete", id }));
}

export function updateTournament(id: string, fn: (t: Tournament) => Tournament) {
  let next: Tournament | undefined;
  setState({
    tournaments: state.tournaments.map((t) => {
      if (t.id !== id) return t;
      next = { ...fn(t), updatedAt: Date.now() };
      return next;
    }),
  });
  if (next) changeListeners.forEach((l) => l({ kind: "upsert", tournament: next! }));
}
```

- [ ] **Step 3: Add a change-listener channel**

Above `setState`, add:

```ts
type Change =
  | { kind: "upsert"; tournament: Tournament }
  | { kind: "delete"; id: string };

const changeListeners = new Set<(c: Change) => void>();

export function onTournamentChange(fn: (c: Change) => void) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

// Bulk replace from sync (does NOT emit change events)
export function replaceAllTournaments(next: Tournament[]) {
  setState({ tournaments: next });
}

// Apply a single remote upsert (does NOT emit change events)
export function applyRemoteUpsert(t: Tournament) {
  const exists = state.tournaments.some((x) => x.id === t.id);
  setState({
    tournaments: exists
      ? state.tournaments.map((x) => (x.id === t.id ? t : x))
      : [t, ...state.tournaments],
  });
}

export function applyRemoteDelete(id: string) {
  setState({ tournaments: state.tournaments.filter((t) => t.id !== id) });
}
```

- [ ] **Step 4: Migrate persisted records that lack `updatedAt`**

In the `AsyncStorage.getItem` block, when parsing, fill missing `updatedAt`:

```ts
const persisted: State = JSON.parse(raw);
const fixed = persisted.tournaments.map((t) => ({
  ...t,
  updatedAt: (t as any).updatedAt ?? t.createdAt,
}));
state = { tournaments: fixed };
```

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/tournaments.ts
git commit -m "feat: add updatedAt + change events to tournaments store"
```

---

## Task 9: Sync merge logic (pure function, unit-tested)

**Files:**
- Create: `src/lib/sync-merge.ts`
- Create: `src/lib/sync-merge.test.ts`
- Modify: `package.json` (add a `test` script if not present)

This is the only piece with non-trivial logic worth testing. The rest is glue.

- [ ] **Step 1: Add a test script if missing**

If `package.json` has no `test` script, add a minimal one. Inspect `package.json` first. If no test runner is set up, install one:

```bash
bun add -d bun-types
```

Add to `package.json` scripts: `"test": "bun test"`. (Bun has a built-in test runner — no extra config needed.)

- [ ] **Step 2: Write the failing test**

Create `src/lib/sync-merge.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { mergeTournaments } from "./sync-merge";
import type { Tournament } from "@/store/tournaments";

const t = (id: string, updatedAt: number, extra: Partial<Tournament> = {}): Tournament => ({
  id,
  name: id,
  format: "americano",
  pointsPerMatch: 24,
  players: [],
  rounds: [],
  createdAt: 0,
  updatedAt,
  ...extra,
});

describe("mergeTournaments", () => {
  test("server-only rows are added", () => {
    const r = mergeTournaments({ local: [], remote: [t("a", 1)] });
    expect(r.next.map((x) => x.id)).toEqual(["a"]);
    expect(r.toUpsert).toEqual([]);
    expect(r.toDelete).toEqual([]);
  });

  test("local-only rows are queued for upsert", () => {
    const r = mergeTournaments({ local: [t("a", 1)], remote: [] });
    expect(r.next.map((x) => x.id)).toEqual(["a"]);
    expect(r.toUpsert.map((x) => x.id)).toEqual(["a"]);
  });

  test("server wins when newer", () => {
    const r = mergeTournaments({
      local: [t("a", 1, { name: "old" })],
      remote: [t("a", 2, { name: "new" })],
    });
    expect(r.next[0].name).toBe("new");
    expect(r.toUpsert).toEqual([]);
  });

  test("local wins when newer and is queued for upsert", () => {
    const r = mergeTournaments({
      local: [t("a", 5, { name: "local" })],
      remote: [t("a", 2, { name: "remote" })],
    });
    expect(r.next[0].name).toBe("local");
    expect(r.toUpsert.map((x) => x.id)).toEqual(["a"]);
  });

  test("equal updatedAt prefers server (deterministic)", () => {
    const r = mergeTournaments({
      local: [t("a", 5, { name: "local" })],
      remote: [t("a", 5, { name: "remote" })],
    });
    expect(r.next[0].name).toBe("remote");
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run: `bun test src/lib/sync-merge.test.ts`
Expected: fails because `sync-merge.ts` does not exist.

- [ ] **Step 4: Implement `src/lib/sync-merge.ts`**

```ts
import type { Tournament } from "@/store/tournaments";

export type MergeInput = { local: Tournament[]; remote: Tournament[] };
export type MergeResult = {
  next: Tournament[];
  toUpsert: Tournament[];
  toDelete: string[];
};

export function mergeTournaments({ local, remote }: MergeInput): MergeResult {
  const byId = new Map<string, { local?: Tournament; remote?: Tournament }>();
  for (const t of local) byId.set(t.id, { ...byId.get(t.id), local: t });
  for (const t of remote) byId.set(t.id, { ...byId.get(t.id), remote: t });

  const next: Tournament[] = [];
  const toUpsert: Tournament[] = [];
  const toDelete: string[] = [];

  for (const [, pair] of byId) {
    const { local: l, remote: r } = pair;
    if (l && r) {
      if (l.updatedAt > r.updatedAt) {
        next.push(l);
        toUpsert.push(l);
      } else {
        next.push(r);
      }
    } else if (r) {
      next.push(r);
    } else if (l) {
      next.push(l);
      toUpsert.push(l);
    }
  }

  next.sort((a, b) => b.updatedAt - a.updatedAt);
  return { next, toUpsert, toDelete };
}
```

- [ ] **Step 5: Run test — expect pass**

Run: `bun test src/lib/sync-merge.test.ts`
Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sync-merge.ts src/lib/sync-merge.test.ts package.json
git commit -m "feat: add tournament sync-merge with tests"
```

---

## Task 10: Sync layer (push/pull glue)

**Files:**
- Create: `src/lib/sync.ts`

- [ ] **Step 1: Create `src/lib/sync.ts`**

```ts
import { supabase } from "@/lib/supabase";
import { mergeTournaments } from "@/lib/sync-merge";
import {
  applyRemoteDelete,
  applyRemoteUpsert,
  onTournamentChange,
  replaceAllTournaments,
  type Tournament,
} from "@/store/tournaments";

type RemoteRow = {
  id: string;
  owner_id: string;
  name: string;
  format: "americano" | "mexicano";
  points_per_match: number;
  data: { players: string[]; rounds: Tournament["rounds"] };
  created_at: string;
  updated_at: string;
};

const toRemote = (t: Tournament, ownerId: string) => ({
  id: t.id,
  owner_id: ownerId,
  name: t.name,
  format: t.format,
  points_per_match: t.pointsPerMatch,
  data: { players: t.players, rounds: t.rounds },
  // server trigger sets updated_at; we send it so RLS sees a fresh row
  updated_at: new Date(t.updatedAt).toISOString(),
});

const fromRemote = (r: RemoteRow): Tournament => ({
  id: r.id,
  name: r.name,
  format: r.format,
  pointsPerMatch: r.points_per_match,
  players: r.data.players ?? [],
  rounds: r.data.rounds ?? [],
  createdAt: new Date(r.created_at).getTime(),
  updatedAt: new Date(r.updated_at).getTime(),
});

let started = false;
let ownerId: string | null = null;
let unsubscribeChange: (() => void) | null = null;

export async function startSync(localTournaments: Tournament[]) {
  if (started) return;
  started = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    started = false;
    return;
  }
  ownerId = user.id;

  // Pull
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[sync] initial pull failed", error.message);
    started = false;
    return;
  }

  const remote = (data as RemoteRow[]).map(fromRemote);
  const merged = mergeTournaments({ local: localTournaments, remote });
  replaceAllTournaments(merged.next);

  // Push any local-newer rows
  for (const t of merged.toUpsert) await pushUpsert(t);

  // Subscribe to future local changes
  unsubscribeChange = onTournamentChange((c) => {
    if (c.kind === "upsert") void pushUpsert(c.tournament);
    else void pushDelete(c.id);
  });
}

export async function stopSync() {
  unsubscribeChange?.();
  unsubscribeChange = null;
  ownerId = null;
  started = false;
}

async function pushUpsert(t: Tournament) {
  if (!ownerId) return;
  const { error } = await supabase
    .from("tournaments")
    .upsert(toRemote(t, ownerId));
  if (error) console.warn("[sync] upsert failed", t.id, error.message);
}

async function pushDelete(id: string) {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  if (error) console.warn("[sync] delete failed", id, error.message);
}

export async function refetch(localTournaments: Tournament[]) {
  if (!ownerId) return;
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", ownerId);
  if (error || !data) return;
  const remote = (data as RemoteRow[]).map(fromRemote);
  const merged = mergeTournaments({ local: localTournaments, remote });
  replaceAllTournaments(merged.next);
  for (const t of merged.toUpsert) await pushUpsert(t);
}

export function applyRemote(row: RemoteRow) {
  applyRemoteUpsert(fromRemote(row));
}
export function applyRemoteDeletion(id: string) {
  applyRemoteDelete(id);
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat: tournament sync push/pull glue"
```

---

## Task 11: Hook sync into app lifecycle

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Wire sync to session changes and AppState**

Add a `SyncDriver` component to `src/app/_layout.tsx`:

```tsx
import { refetch, startSync, stopSync } from "@/lib/sync";
import { useTournaments } from "@/store/tournaments";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
```

Add inside `RootStack` (or extract a sibling component) and render it next to `<Stack>`:

```tsx
function SyncDriver() {
  const { session } = useSession();
  const { tournaments } = useTournaments();
  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

  useEffect(() => {
    if (!session) {
      void stopSync();
      return;
    }
    void startSync(tournamentsRef.current);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refetch(tournamentsRef.current);
    });
    return () => {
      sub.remove();
    };
  }, [session?.user.id]);

  return null;
}
```

Render `<SyncDriver />` inside the `<SessionProvider>` tree, alongside `<RootStack />`.

- [ ] **Step 2: Manual test**

Sign in as anonymous → create a tournament → kill the app → relaunch → tournament still there (came from server, not just AsyncStorage). Verify in the Supabase dashboard SQL editor: `select id, owner_id, name from public.tournaments;` shows your row.

- [ ] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: drive sync from session + foreground events"
```

---

## Task 12: SettingsRow + SettingsSection components

**Files:**
- Create: `src/components/settings-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { AdaptiveGlass } from "@/components/ui";
import { Image } from "expo-image";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export function SettingsSection({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ marginTop: 24 }, style]}>
      {title && (
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      )}
      <AdaptiveGlass
        style={{
          marginHorizontal: 16,
          borderRadius: 14,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        {children}
      </AdaptiveGlass>
      {footer && <Text style={styles.sectionFooter}>{footer}</Text>}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  last,
}: {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      <View style={styles.row}>
        {icon ? (
          process.env.EXPO_OS === "ios" ? (
            <Image
              source={`sf:${icon}`}
              tintColor={
                (destructive
                  ? PlatformColor("systemRed")
                  : PlatformColor("label")) as unknown as string
              }
              style={{ width: 22, height: 22 }}
            />
          ) : (
            <View style={{ width: 22, height: 22 }} />
          )
        ) : null}
        <Text
          style={[
            styles.label,
            {
              color: destructive
                ? (PlatformColor("systemRed") as unknown as string)
                : (PlatformColor("label") as unknown as string),
            },
          ]}
        >
          {label}
        </Text>
        {value && <Text style={styles.value}>{value}</Text>}
        {onPress && process.env.EXPO_OS === "ios" && (
          <Image
            source="sf:chevron.right"
            tintColor={PlatformColor("tertiaryLabel") as unknown as string}
            style={{ width: 8, height: 14 }}
          />
        )}
      </View>
      {!last && (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            marginLeft: 50,
            backgroundColor: PlatformColor("separator") as unknown as string,
          }}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginHorizontal: 32,
    marginBottom: 6,
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    letterSpacing: 0.4,
  },
  sectionFooter: {
    marginHorizontal: 32,
    marginTop: 6,
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  label: { flex: 1, fontSize: 17 },
  value: {
    fontSize: 17,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings-row.tsx
git commit -m "feat: SettingsRow + SettingsSection primitives"
```

---

## Task 13: Settings screen

**Files:**
- Create: `src/app/settings.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as Application from "expo-application";
import { router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { Alert, Linking, ScrollView } from "react-native";

const TERMS_URL = "https://example.com/padel-tournaments/terms";
const PRIVACY_URL = "https://example.com/padel-tournaments/privacy";
const FEEDBACK_EMAIL = "hello@jiridiblik.com";

export default function Settings() {
  const { user, isAnonymous } = useSession();

  const onSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign back in to sync changes.", [
      { text: "Cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const onRate = async () => {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    } else {
      Alert.alert("Rating not available right now.");
    }
  };

  const versionFooter = `Version ${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 }}
      style={{ flex: 1 }}
    >
      <SettingsSection title="Account">
        <SettingsRow
          icon="person.crop.circle"
          label="Profile"
          value={isAnonymous ? "Guest" : user?.email ?? "Signed in"}
          onPress={() => router.push("/profile")}
        />
        {isAnonymous ? (
          <SettingsRow
            icon="person.badge.plus"
            label="Create account"
            onPress={() => router.push("/sign-in")}
            last
          />
        ) : (
          <SettingsRow
            icon="rectangle.portrait.and.arrow.right"
            label="Sign out"
            destructive
            onPress={onSignOut}
            last
          />
        )}
      </SettingsSection>

      <SettingsSection title="About" footer={versionFooter}>
        <SettingsRow
          icon="doc.text"
          label="Terms & Conditions"
          onPress={() => Linking.openURL(TERMS_URL)}
        />
        <SettingsRow
          icon="hand.raised"
          label="Privacy Policy"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <SettingsRow
          icon="star"
          label="Rate app"
          onPress={onRate}
        />
        <SettingsRow
          icon="envelope"
          label="Send feedback"
          onPress={() =>
            Linking.openURL(
              `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
                "Padel Tournaments feedback"
              )}`
            )
          }
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings.tsx
git commit -m "feat: Settings screen with account + about sections"
```

---

## Task 14: Profile screen

**Files:**
- Create: `src/app/profile.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { Button } from "@/components/ui";
import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Profile() {
  const { user, isAnonymous } = useSession();
  const [name, setName] = useState<string>(
    (user?.user_metadata?.display_name as string) ?? ""
  );
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name },
    });
    setSaving(false);
    if (error) Alert.alert("Couldn't save", error.message);
  };

  const linkApple = async () => {
    if (Platform.OS !== "ios") return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      // While the anonymous session is active, signing in with Apple links the identity
      // and preserves the same auth.users.id.
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      Alert.alert("Linked", "Your account is now signed in with Apple.");
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Couldn't link Apple", String(e?.message ?? e));
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 }}
      style={{ flex: 1 }}
    >
      <SettingsSection title="Display name">
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={
              PlatformColor("placeholderText") as unknown as string
            }
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={saveName}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Identity">
        <SettingsRow
          icon="envelope"
          label="Email"
          value={user?.email ?? "—"}
          last={isAnonymous && Platform.OS !== "ios"}
        />
        {isAnonymous && Platform.OS === "ios" && (
          <SettingsRow
            icon="apple.logo"
            label="Link Apple ID"
            onPress={linkApple}
            last
          />
        )}
      </SettingsSection>

      <View style={{ padding: 16, marginTop: 16 }}>
        <Button
          title={saving ? "Saving…" : "Save"}
          onPress={saveName}
          disabled={saving}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputRow: { paddingHorizontal: 16, paddingVertical: 12 },
  input: {
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/profile.tsx
git commit -m "feat: Profile screen with display name + Apple link"
```

---

## Task 15: Add gear icon to home `headerRight`

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Add a `Stack.Screen` block to set `headerRight`**

At the top of `src/app/index.tsx` add imports:

```tsx
import { Stack, useRouter } from "expo-router";
```

(Replace the existing `useRouter` import line.)

Then inside the rendered JSX, add a `<Stack.Screen>` block above the existing `<View>`:

```tsx
return (
  <View style={[styles.container, { backgroundColor: tc.background }]}>
    <Stack.Screen
      options={{
        title: "Tournaments",
        headerRight: () => (
          <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
            {useSymbol ? (
              <Image
                source="sf:gearshape"
                tintColor={
                  PlatformColor("systemTeal") as unknown as string
                }
                style={{ width: 24, height: 24 }}
              />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                Settings
              </Text>
            )}
          </Pressable>
        ),
      }}
    />
    <FlatList ... />
```

(Leave the rest of the file unchanged.)

- [ ] **Step 2: Manual test**

Start the app. Home screen has a gear icon in the top-right. Tap → `/settings` opens as a form-sheet. Tap a row → behaves correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: gear icon in home header opens Settings"
```

---

## Task 16: Pull-to-refresh on home (optional but cheap)

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Wire `RefreshControl`**

Inside `Home`, add:

```tsx
import { RefreshControl } from "react-native";
import { refetch } from "@/lib/sync";
import { useState } from "react";
```

```tsx
const [refreshing, setRefreshing] = useState(false);
const onRefresh = async () => {
  setRefreshing(true);
  await refetch(tournaments);
  setRefreshing(false);
};
```

Pass to FlatList:

```tsx
refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: pull-to-refresh syncs tournaments"
```

---

## Task 17: Snapshot the migration into version control

**Files:**
- Create: `supabase/migrations/<timestamp>_create_tournaments.sql` (via CLI)

- [ ] **Step 1: Initialize Supabase CLI if needed**

Run: `supabase --version`. If missing, install per https://supabase.com/docs/guides/local-development.

If `supabase/` directory doesn't exist in the repo:

```bash
supabase init
supabase link --project-ref ifvofqwbxtooersnuwpe
```

- [ ] **Step 2: Pull the migration**

```bash
supabase db pull create_tournaments
```

This generates `supabase/migrations/<timestamp>_create_tournaments.sql` containing the SQL we applied via MCP.

- [ ] **Step 3: Verify**

```bash
supabase migration list
```
Expected: the migration is listed and marked applied remotely.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "chore: snapshot tournaments migration"
```

---

## Task 18: End-to-end manual test pass

No code changes. This is a verification gate before declaring done.

- [ ] **Step 1: Cold-start as new user**

Delete the app → reinstall → cold start. Expect: welcome screen.

- [ ] **Step 2: Anonymous flow**

Tap "Continue without account" → home shows. Create a tournament. Verify in Supabase SQL editor: `select id, owner_id, name from public.tournaments;` shows your row with `owner_id` matching the anonymous user's `auth.uid()`.

- [ ] **Step 3: Cross-device sync (anonymous can't share — verify with email)**

Sign out → sign in via email OTP on device A → create a tournament → sign in with the same email on device B → tournament appears.

- [ ] **Step 4: Anonymous → email upgrade**

Cold install → continue without account → create 2 tournaments → Profile → not yet linked. Sign out IS NOT the upgrade flow — instead, from Settings → "Create account" → email OTP → verify. After verify, the same `auth.users.id` should hold the rows. Verify in SQL editor that the 2 tournaments still belong to that user.

(If Supabase's sign-in-while-anonymous flow does NOT preserve the id, this is the place where we'd add a copy-rows-to-new-id fallback. Document the actual behavior observed here.)

- [ ] **Step 5: Apple Sign-In (iOS only)**

Cold install → "Sign in / Create account" → Apple button → complete the flow → home shows. Display name captured into user_metadata (check `auth.users` row).

- [ ] **Step 6: Settings rows**

Tap each row in Settings: Profile opens, Terms opens browser, Privacy opens browser, Rate prompts (or no-ops in TestFlight), Send feedback opens mail composer. Sign out signs out and routes back to welcome.

- [ ] **Step 7: Offline edits**

Airplane mode → edit a score → see local update. Disable airplane mode → after foregrounding (or pull-to-refresh) → server has the new score.

- [ ] **Step 8: RLS smoke check**

In Supabase SQL editor, run as `anon`:
```sql
set local role anon;
select * from public.tournaments;
```
Expected: 0 rows (anon JWT has no `auth.uid()`). Then with a fresh user JWT, the count should match what they own. (Or run the advisors.)

- [ ] **Step 9: Final commit (if any docs were updated during testing)**

```bash
git add -A
git status
git commit -m "chore: post-test cleanup" || true
```

---

## Self-review summary

- **Spec coverage:**
  - Anonymous + Apple + email OTP auth → Tasks 1, 6, 7
  - Anonymous → real account upgrade → Task 14 (Apple) + Task 7 reused via Settings (email)
  - `tournaments` table + RLS + JSONB body → Task 3
  - Optimistic local writes + foreground refetch → Tasks 8–11, 16
  - Settings screen with required rows → Tasks 12–13
  - Gear icon in home header → Task 15
  - Existing AsyncStorage data migrates on first sign-in → covered by `mergeTournaments` (local-only rows are queued for upsert) in Tasks 9–10
  - MCP wiring + snapshot migration → Tasks 1, 17
- **Placeholder scan:** Terms/Privacy URLs are placeholders that the user must replace with real legal URLs before public release — explicitly marked.
- **Type consistency:** `Tournament.updatedAt` (camelCase in TS) ↔ `updated_at` (snake_case in SQL) bridged via `toRemote`/`fromRemote` in `src/lib/sync.ts`. Store function names (`replaceAllTournaments`, `applyRemoteUpsert`, `applyRemoteDelete`, `onTournamentChange`) match between Tasks 8 and 10.
