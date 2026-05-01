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
