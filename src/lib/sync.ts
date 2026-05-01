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
