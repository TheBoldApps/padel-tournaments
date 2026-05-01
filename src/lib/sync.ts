import { supabase } from "@/lib/supabase";
import { mergeTournaments } from "@/lib/sync-merge";
import {
  applyRemoteDelete,
  applyRemoteUpsert,
  clearPendingLocalDelete,
  getAllTournaments,
  onTournamentChange,
  replaceAllTournaments,
  takePendingLocalDeletes,
  type SortBy,
  type Tournament,
  whenHydrated,
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
    // Client-set updatedAt, persisted in JSONB so it survives the server trigger
    // that always rewrites top-level updated_at to now(). This keeps LWW merge
    // comparisons consistent across devices using a single (client) clock.
    clientUpdatedAt?: number;
  };
  created_at: string;
  updated_at: string;
};

const toRemote = (t: Tournament, ownerId: string) => {
  const data: RemoteRow["data"] = {
    players: t.players,
    rounds: t.rounds,
    clientUpdatedAt: t.updatedAt,
  };
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
  // Prefer client-set updatedAt if present (avoids cross-clock drift via the
  // server's now() trigger). Fall back to the row's updated_at for legacy rows.
  updatedAt:
    r.data.clientUpdatedAt ?? new Date(r.updated_at).getTime(),
  finishedAt: r.data.finishedAt,
  sortBy: r.data.sortBy,
  courtsCount: r.data.courtsCount,
  sitOutPoints: r.data.sitOutPoints,
  roundTimerSeconds: r.data.roundTimerSeconds,
  winBonus: r.data.winBonus,
  drawBonus: r.data.drawBonus,
});

let starting = false;
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

export async function startSync(_localTournaments: Tournament[]) {
  if (started || starting) return;
  starting = true;
  const gen = ++generation;

  // Helper that only resets the starting flag if THIS invocation is still the
  // current one. Otherwise a newer startSync has already taken over and we
  // must not clobber its `starting`/`started` state.
  const cancel = () => {
    if (gen === generation) {
      starting = false;
      started = false;
    }
  };

  try {
    // Wait for AsyncStorage hydration before reading local state, otherwise
    // we race the hydration code in the store and either lose persisted rows
    // or resurrect deleted ones.
    await whenHydrated();
    if (gen !== generation) return cancel();

    let user;
    try {
      const res = await supabase.auth.getUser();
      user = res.data.user;
    } catch (e) {
      console.warn("[sync] getUser failed", (e as Error)?.message);
      return cancel();
    }
    if (gen !== generation) return cancel();
    if (!user) return cancel();
    ownerId = user.id;

    // Pull
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });

    if (gen !== generation) return cancel();

    if (error) {
      console.warn("[sync] initial pull failed", error.message);
      return cancel();
    }

    const remote = (data as RemoteRow[]).map(fromRemote);

    // Pull tombstones and apply deletions before merge
    const tombstones = await pullTombstones();
    if (gen !== generation) return cancel();

    // Subscribe BEFORE we read local state and replace it, so any mutations
    // happening concurrently are observed and forwarded. We capture a snapshot
    // of the events that arrive while we're merging, then replay them after
    // replaceAllTournaments to avoid clobbering in-flight local edits.
    const queued: { kind: "upsert" | "delete"; id: string; t?: Tournament }[] =
      [];
    let draining = false;
    unsubscribeChange = onTournamentChange((c) => {
      if (draining) {
        if (c.kind === "upsert") void pushUpsert(c.tournament);
        else void pushDelete(c.id);
        return;
      }
      if (c.kind === "upsert")
        queued.push({ kind: "upsert", id: c.tournament.id, t: c.tournament });
      else queued.push({ kind: "delete", id: c.id });
    });

    // Read the current store snapshot AFTER subscribing to avoid the gap.
    const localTournaments = getAllTournaments();
    const localFiltered = localTournaments.filter((t) => !tombstones.has(t.id));
    for (const id of tombstones) applyRemoteDelete(id);
    const remoteFiltered = remote.filter((t) => !tombstones.has(t.id));
    const merged = mergeTournaments({
      local: localFiltered,
      remote: remoteFiltered,
    });
    replaceAllTournaments(merged.next);

    // Replay any local mutations that happened while we were merging on top of
    // the merged state, then enable straight-through forwarding for new ones.
    const queuedDeleteIds: string[] = [];
    for (const ev of queued) {
      if (ev.kind === "upsert" && ev.t) applyRemoteUpsert(ev.t);
      else if (ev.kind === "delete") {
        applyRemoteDelete(ev.id);
        queuedDeleteIds.push(ev.id);
      }
    }
    draining = true;

    // Push deletions that happened while offline (persisted local tombstones)
    // plus any deletes that arrived while we were merging.
    const pendingDeletes = new Set([
      ...takePendingLocalDeletes(),
      ...queuedDeleteIds,
    ]);
    for (const id of pendingDeletes) {
      if (gen !== generation) return cancel();
      await pushDelete(id);
    }

    // Push any local-newer rows. Always push from current store state so
    // late edits are not stomped by the snapshot version from `merged`.
    const upsertIds = new Set(merged.toUpsert.map((t) => t.id));
    // Also push anything queued during merge.
    for (const ev of queued) {
      if (ev.kind === "upsert") upsertIds.add(ev.id);
    }
    const current = new Map(getAllTournaments().map((t) => [t.id, t]));
    for (const id of upsertIds) {
      if (gen !== generation) return cancel();
      const t = current.get(id);
      if (t) await pushUpsert(t);
    }

    started = true;
    starting = false;
  } catch (e) {
    console.warn("[sync] startSync failed", (e as Error)?.message);
    cancel();
  }
}

export async function stopSync() {
  generation++; // invalidate any in-flight startSync
  unsubscribeChange?.();
  unsubscribeChange = null;
  ownerId = null;
  started = false;
  starting = false;
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
  // Write the tombstone FIRST so any concurrent fetch from another device
  // sees the deletion intent before the row disappears. Otherwise a refetch
  // racing the delete would see "no row, no tombstone" and re-push the local
  // copy, resurrecting it.
  const tomb = await supabase
    .from("tournament_deletions")
    .upsert({ id, owner_id: ownerId });
  if (tomb.error) {
    console.warn("[sync] tombstone failed", id, tomb.error.message);
    // Leave the pending-local-delete entry in place so we retry on next sync.
    return;
  }
  const del = await supabase.from("tournaments").delete().eq("id", id);
  if (del.error) {
    console.warn("[sync] delete failed", id, del.error.message);
    return;
  }
  // Successfully pushed: drop the pending entry so we don't replay it.
  clearPendingLocalDelete(id);
}

export async function refetch(_localTournaments: Tournament[]) {
  if (!ownerId) return;
  await whenHydrated();
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", ownerId);
  if (error || !data) return;
  const remote = (data as RemoteRow[]).map(fromRemote);

  const tombstones = await pullTombstones();
  // Read fresh local state after the awaits above (caller-passed snapshot may
  // be stale by now).
  const localTournaments = getAllTournaments();
  const localFiltered = localTournaments.filter((t) => !tombstones.has(t.id));
  for (const id of tombstones) applyRemoteDelete(id);
  const remoteFiltered = remote.filter((t) => !tombstones.has(t.id));
  const merged = mergeTournaments({ local: localFiltered, remote: remoteFiltered });
  replaceAllTournaments(merged.next);
  // Push from current state (post-replace) to avoid pushing stale snapshots.
  const current = new Map(getAllTournaments().map((t) => [t.id, t]));
  for (const t of merged.toUpsert) {
    const fresh = current.get(t.id) ?? t;
    await pushUpsert(fresh);
  }
}

export function applyRemote(row: RemoteRow) {
  applyRemoteUpsert(fromRemote(row));
}
export function applyRemoteDeletion(id: string) {
  applyRemoteDelete(id);
}
