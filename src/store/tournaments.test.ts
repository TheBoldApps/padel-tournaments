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

describe("playerStandings — settings", () => {
  test("winBonus is added to winning team's points", () => {
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D"],
      rounds: [
        {
          number: 1,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 16, scoreB: 0 },
          ],
          resting: [],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
      winBonus: 3,
    };
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    expect(s.A.points).toBe(19); // 16 + bonus 3
    expect(s.C.points).toBe(0);  // loser, no bonus
  });

  test("drawBonus is added to both teams on a tie", () => {
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D"],
      rounds: [
        {
          number: 1,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 8, scoreB: 8 },
          ],
          resting: [],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
      drawBonus: 1,
    };
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    for (const p of ["A", "B", "C", "D"]) {
      expect(s[p].points).toBe(9); // 8 + drawBonus 1
      expect(s[p].tied).toBe(1);
    }
  });

  test("sitOutPoints awarded per round of rest", () => {
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D", "REST"],
      rounds: [
        {
          number: 1,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 16, scoreB: 0 },
          ],
          resting: ["REST"],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
      sitOutPoints: 8,
    };
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    expect(s.REST.points).toBe(8);
    expect(s.REST.played).toBe(0);
  });

  test("sitOutPoints NOT awarded for unscored pre-generated rounds", () => {
    // With Americano pre-generation, all rounds exist from creation but are
    // unscored. The leaderboard must not credit sit-out points until a round
    // is actually played.
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D", "REST"],
      rounds: [
        {
          number: 1,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: null, scoreB: null },
          ],
          resting: ["REST"],
        },
        {
          number: 2,
          matches: [
            { court: 1, teamA: ["A", "C"], teamB: ["B", "D"], scoreA: null, scoreB: null },
          ],
          resting: ["REST"],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
      sitOutPoints: 8,
    };
    const s = Object.fromEntries(playerStandings(t).map((x) => [x.player, x]));
    expect(s.REST.points).toBe(0);
  });

  test("sortBy=wins ranks by win count first", () => {
    // 4 players, 2 matches: A+B beat C+D 16-0, A+B beat C+D 9-7.
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D"],
      rounds: [
        {
          number: 1,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 16, scoreB: 0 },
          ],
          resting: [],
        },
        {
          number: 2,
          matches: [
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 9, scoreB: 7 },
          ],
          resting: [],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
      sortBy: "wins",
    };
    const ranked = playerStandings(t).map((s) => s.player);
    // A and B both have 2 wins, C and D both have 0 wins.
    expect(ranked.slice(0, 2).sort()).toEqual(["A", "B"]);
    expect(ranked.slice(2).sort()).toEqual(["C", "D"]);
  });
});
