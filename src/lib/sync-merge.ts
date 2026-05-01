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
