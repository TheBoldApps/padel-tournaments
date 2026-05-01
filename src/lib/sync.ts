import { supabase } from "@/lib/supabase";
import { mergeTournaments } from "@/lib/sync-merge";
import {
  applyRemoteDelete,
  applyRemoteUpsert,
  onTournamentChange,
  replaceAllTournaments,
  type SortBy,
  type Tournament,
} from "@/store/tournaments";

type RemoteRow = {
  id: string;
  owner_id: string;
  name: string;
  format: "americano" | "mexicano";
  points_per_match: number;
  data: {
    players?: string[];
    rounds?: Tournament["rounds"];
    finishedAt?: number;
    sortBy?: SortBy;
    courtsCount?: number;
    sitOutPoints?: number;
    roundTimerSeconds?: number;
    winBonus?: number;
    drawBonus?: number;
  };
  created_at: string;
  updated_at: string;
};

const toRemote = (t: Tournament, ownerId: string) => {
  const data: RemoteRow["data"] = { players: t.players, rounds: t.rounds };
  if (t.finishedAt != null) data.finishedAt = t.finishedAt;
  if (t.sortBy) data.sortBy = t.sortBy;
  if (t.courtsCount != null) data.courtsCount = t.courtsCount;
  if (t.sitOutPoints != null) data.sitOutPoints = t.sitOutPoints;
  if (t.roundTimerSeconds != null) data.roundTimerSeconds = t.roundTimerSeconds;
  if (t.winBonus != null) data.winBonus = t.winBonus;
  if (t.drawBonus != null) data.drawBonus = t.drawBonus;
  return {
    id: t.id,
    owner_id: ownerId,
    name: t.name,
    format: t.format,
    points_per_match: t.pointsPerMatch,
    data,
    // server trigger sets updated_at; we send it so RLS sees a fresh row
    updated_at: new Date(t.updatedAt).toISOString(),
  };
};

const fromRemote = (r: RemoteRow): Tournament => ({
  id: r.id,
  name: r.name,
  format: r.format,
  pointsPerMatch: r.points_per_match,
  players: r.data.players ?? [],
  rounds: r.data.rounds ?? [],
  createdAt: new Date(r.created_at).getTime(),
  updatedAt: new Date(r.updated_at).getTime(),
  finishedAt: r.data.finishedAt,
  sortBy: r.data.sortBy,
  courtsCount: r.data.courtsCount,
  sitOutPoints: r.data.sitOutPoints,
  roundTimerSeconds: r.data.roundTimerSeconds,
  winBonus: r.data.winBonus,
  drawBonus: r.data.drawBonus,
});

let started = false;
let ownerId: string | null = null;
let unsubscribeChange: (() => void) | null = null;
let generation = 0;

async function pullTombstones(): Promise<Set<string>> {
  if (!ownerId) return new Set();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("tournament_deletions")
    .select("id")
    .eq("owner_id", ownerId)
    .gte("deleted_at", since);
  if (error || !data) return new Set();
  return new Set((data as { id: string }[]).map((r) => r.id));
}

export async function startSync(localTournaments: Tournament[]) {
  if (started) return;
  started = true;
  const gen = ++generation;

  const { data: { user } } = await supabase.auth.getUser();
  if (gen !== generation) {
    started = false;
    return;
  }
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

  if (gen !== generation) {
    started = false;
    return;
  }

  if (error) {
    console.warn("[sync] initial pull failed", error.message);
    started = false;
    return;
  }

  const remote = (data as RemoteRow[]).map(fromRemote);

  // Pull tombstones and apply deletions before merge
  const tombstones = await pullTombstones();
  if (gen !== generation) {
    started = false;
    return;
  }
  const localFiltered = localTournaments.filter((t) => !tombstones.has(t.id));
  for (const id of tombstones) applyRemoteDelete(id);
  const remoteFiltered = remote.filter((t) => !tombstones.has(t.id));
  const merged = mergeTournaments({ local: localFiltered, remote: remoteFiltered });
  replaceAllTournaments(merged.next);

  // Subscribe to future local changes BEFORE the initial push loop, so any
  // mutations happening concurrently with our pushes still get propagated.
  unsubscribeChange = onTournamentChange((c) => {
    if (c.kind === "upsert") void pushUpsert(c.tournament);
    else void pushDelete(c.id);
  });

  // Push any local-newer rows
  for (const t of merged.toUpsert) {
    if (gen !== generation) return;
    await pushUpsert(t);
  }
}

export async function stopSync() {
  generation++; // invalidate any in-flight startSync
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
  if (!ownerId) return;
  // Delete the row (RLS enforces ownership) AND record a tombstone so other
  // devices know not to resurrect it on next merge.
  const [del, tomb] = await Promise.all([
    supabase.from("tournaments").delete().eq("id", id),
    supabase.from("tournament_deletions").upsert({ id, owner_id: ownerId }),
  ]);
  if (del.error) console.warn("[sync] delete failed", id, del.error.message);
  if (tomb.error) console.warn("[sync] tombstone failed", id, tomb.error.message);
}

export async function refetch(localTournaments: Tournament[]) {
  if (!ownerId) return;
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", ownerId);
  if (error || !data) return;
  const remote = (data as RemoteRow[]).map(fromRemote);

  const tombstones = await pullTombstones();
  const localFiltered = localTournaments.filter((t) => !tombstones.has(t.id));
  for (const id of tombstones) applyRemoteDelete(id);
  const remoteFiltered = remote.filter((t) => !tombstones.has(t.id));
  const merged = mergeTournaments({ local: localFiltered, remote: remoteFiltered });
  replaceAllTournaments(merged.next);
  for (const t of merged.toUpsert) await pushUpsert(t);
}

export function applyRemote(row: RemoteRow) {
  applyRemoteUpsert(fromRemote(row));
}
export function applyRemoteDeletion(id: string) {
  applyRemoteDelete(id);
}
