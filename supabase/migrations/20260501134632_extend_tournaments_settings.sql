-- Phase-1 migration: convert tournaments.id from uuid to text so the client's
-- short base36 ids can actually land (every previous push failed silently
-- because they aren't valid uuids). And add a tombstones table for delete
-- propagation across devices.

-- 1. tournaments.id -> text
-- The default `gen_random_uuid()` is dropped because the client supplies its
-- own ids on insert. The check for length keeps things sane.
alter table public.tournaments
  alter column id drop default;
alter table public.tournaments
  alter column id type text using id::text;
alter table public.tournaments
  add constraint tournaments_id_length_chk check (char_length(id) between 4 and 64);

-- 2. tombstones for cross-device delete propagation
create table public.tournament_deletions (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now()
);

create index tournament_deletions_owner_id_idx on public.tournament_deletions (owner_id, deleted_at desc);

alter table public.tournament_deletions enable row level security;

create policy "owner_select_del" on public.tournament_deletions
  for select using ((select auth.uid()) = owner_id);
create policy "owner_insert_del" on public.tournament_deletions
  for insert with check ((select auth.uid()) = owner_id);
-- deletions are append-only; no update/delete policies for end users.

-- Settings (sortBy, courtsCount, sitOutPoints, roundTimerSeconds, winBonus,
-- drawBonus, finishedAt, Round.final) live inside the existing `data` JSONB
-- column; no DDL needed for those.
