import { describe, expect, test } from "bun:test";
import { playerStandings, type Tournament } from "./tournaments";

const tournament = (matches: Array<{
  teamA: [string, string];
  teamB: [string, string];
  scoreA: number | null;
  scoreB: number | null;
}>): Tournament => ({
  id: "t",
  name: "T",
  format: "americano",
  pointsPerMatch: 16,
  players: ["A", "B", "C", "D"],
  rounds: [
    {
      number: 1,
      matches: matches.map((m, i) => ({ ...m, court: i + 1 })),
      resting: [],
    },
  ],
  createdAt: 0,
  updatedAt: 0,
});

describe("playerStandings", () => {
  test("counts wins, ties, losses correctly", () => {
    const t = tournament([
      { teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 16, scoreB: 0 },
    ]);
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    expect(s.A.won).toBe(1);
    expect(s.A.tied).toBe(0);
    expect(s.A.lost).toBe(0);
    expect(s.C.won).toBe(0);
    expect(s.C.tied).toBe(0);
    expect(s.C.lost).toBe(1);
  });

  test("tied score (8-8) credits both teams a tie, no win, no loss", () => {
    const t = tournament([
      { teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 8, scoreB: 8 },
    ]);
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    for (const p of ["A", "B", "C", "D"]) {
      expect(s[p].won).toBe(0);
      expect(s[p].tied).toBe(1);
      expect(s[p].lost).toBe(0);
      expect(s[p].played).toBe(1);
    }
  });

  test("incomplete match doesn't change played count", () => {
    const t = tournament([
      { teamA: ["A", "B"], teamB: ["C", "D"], scoreA: null, scoreB: null },
    ]);
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    expect(s.A.played).toBe(0);
  });
});
