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
