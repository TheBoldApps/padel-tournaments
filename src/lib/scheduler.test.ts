import { describe, expect, test } from "bun:test";
import {
  generateAmericanoRound,
  generateMexicanoRound,
  regenerateUnscoredRounds,
} from "./scheduler";
import type { Tournament } from "@/store/tournaments";

const baseTournament = (
  players: string[],
  rounds: Tournament["rounds"]
): Tournament => ({
  id: "t",
  name: "T",
  format: "mexicano",
  pointsPerMatch: 16,
  players,
  rounds,
  createdAt: 0,
  updatedAt: 0,
});

describe("generateMexicanoRound — court assignment by points only", () => {
  test("the player who rested last round is NOT promoted above higher scorers", () => {
    // 5 players: 4 played round 1, "REST" sat out.
    // After round 1, scores: P1=16 P2=16 P3=0 P4=0 REST=0
    const players = ["P1", "P2", "P3", "P4", "REST"];
    const t = baseTournament(players, [
      {
        number: 1,
        matches: [
          {
            court: 1,
            teamA: ["P1", "P2"],
            teamB: ["P3", "P4"],
            scoreA: 16,
            scoreB: 0,
          },
        ],
        resting: ["REST"],
      },
    ]);

    const r = generateMexicanoRound(t);

    // 5 % 4 = 1 court, so 1 player still rests. Bug puts REST onto the court
    // (because rest-count was the primary sort key), pushing a higher scorer off.
    // Correct: lowest-points player rests; REST should keep resting OR
    // P3/P4 (also 0 points) should rest — never P1 or P2.
    expect(r.resting.length).toBe(1);
    expect(r.resting).not.toContain("P1");
    expect(r.resting).not.toContain("P2");

    // Court 1 must contain the two top scorers
    const onCourt = new Set([
      ...r.matches[0].teamA,
      ...r.matches[0].teamB,
    ]);
    expect(onCourt.has("P1")).toBe(true);
    expect(onCourt.has("P2")).toBe(true);
  });
});

describe("generateMexicanoRound — avoid immediate repeat partnerships", () => {
  test("same court 4 with identical scores swaps to alternate pairing", () => {
    // 4 players, round 1: A+D vs B+C, A+D won 16-0.
    // Round 2 ranking: A,D tied at 16; B,C tied at 0.
    // Default Mexicano pairing for [A,D,B,C] sorted is rank 1+4 vs 2+3 -> A+C vs D+B
    // (different from round 1, fine). For [A,B,C,D] sorted, default is A+D vs B+C
    // == round 1. We want to verify the NEW partnerships in round 2 do NOT repeat
    // round-1 partnerships.
    const players = ["A", "B", "C", "D"];
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "mexicano",
      pointsPerMatch: 16,
      players,
      rounds: [
        {
          number: 1,
          matches: [
            {
              court: 1,
              teamA: ["A", "D"],
              teamB: ["B", "C"],
              scoreA: 16,
              scoreB: 0,
            },
          ],
          resting: [],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };

    const r = generateMexicanoRound(t);
    const partners = (m: { teamA: string[]; teamB: string[] }) =>
      [m.teamA.slice().sort().join(""), m.teamB.slice().sort().join("")].sort();
    const r1 = partners(t.rounds[0].matches[0]);
    const r2 = partners(r.matches[0]);
    expect(r2).not.toEqual(r1);
  });
});

describe("generateAmericanoRound — iterative pre-generation", () => {
  test("4 players, 3 rounds produces every unique partnership exactly once", () => {
    const players = ["A", "B", "C", "D"];
    let t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players,
      rounds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    for (let i = 0; i < 3; i++) {
      const r = generateAmericanoRound(t);
      t = { ...t, rounds: [...t.rounds, r] };
    }
    const pairs = new Set<string>();
    for (const r of t.rounds) {
      for (const m of r.matches) {
        pairs.add([...m.teamA].sort().join("|"));
        pairs.add([...m.teamB].sort().join("|"));
      }
    }
    // C(4,2) = 6 unique pairs; each round contributes 2 fresh ones.
    expect(pairs.size).toBe(6);
  });
});

describe("regenerateUnscoredRounds — mid-tournament roster shrink", () => {
  test("7→5 players mid-tournament: scored rounds untouched, unscored regenerated with new roster only", () => {
    // Simulate the user's scenario: 7 players, Americano with 6 pre-generated
    // rounds. Round 1 is fully scored. Two players ("F", "G") drop out at the
    // start of round 2, admin removes them, schedule should be rebuilt for
    // the remaining 5 players from round 2 onward.
    let t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D", "E", "F", "G"],
      rounds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    // Pre-generate 6 rounds.
    for (let i = 0; i < 6; i++) {
      t = { ...t, rounds: [...t.rounds, generateAmericanoRound(t)] };
    }
    // Score round 1 fully.
    const r1 = t.rounds[0];
    t = {
      ...t,
      rounds: [
        {
          ...r1,
          matches: r1.matches.map((m) => ({ ...m, scoreA: 10, scoreB: 6 })),
        },
        ...t.rounds.slice(1),
      ],
    };
    const round1Snapshot = JSON.stringify(t.rounds[0]);

    // Roster shrink: drop F and G.
    const remaining = t.players.filter((p) => p !== "F" && p !== "G");
    const reduced: Tournament = { ...t, players: remaining };
    const newRounds = regenerateUnscoredRounds(reduced);

    // Round 1 (fully scored) untouched.
    expect(JSON.stringify(newRounds[0])).toBe(round1Snapshot);
    // Total round count preserved.
    expect(newRounds.length).toBe(6);
    // Rounds 2..6 must contain ONLY remaining players.
    for (let i = 1; i < newRounds.length; i++) {
      const r = newRounds[i];
      const seen = new Set<string>();
      for (const m of r.matches) for (const p of [...m.teamA, ...m.teamB]) seen.add(p);
      for (const p of r.resting) seen.add(p);
      expect([...seen].sort()).toEqual([...remaining].sort());
      // 5 players, 1 court → 4 play, 1 rests.
      expect(r.matches.length).toBe(1);
      expect(r.resting.length).toBe(1);
    }
  });

  test("all rounds unscored: every round regenerated", () => {
    let t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C", "D", "E", "F"],
      rounds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    for (let i = 0; i < 5; i++) {
      t = { ...t, rounds: [...t.rounds, generateAmericanoRound(t)] };
    }
    const reduced: Tournament = {
      ...t,
      players: ["A", "B", "C", "D"],
    };
    const out = regenerateUnscoredRounds(reduced);
    expect(out.length).toBe(5);
    for (const r of out) {
      const seen = new Set<string>();
      for (const m of r.matches) for (const p of [...m.teamA, ...m.teamB]) seen.add(p);
      for (const p of r.resting) seen.add(p);
      expect([...seen].sort()).toEqual(["A", "B", "C", "D"]);
    }
  });

  test("all rounds fully scored: nothing changes", () => {
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
            { court: 1, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 10, scoreB: 6 },
          ],
          resting: [],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const before = JSON.stringify(t.rounds);
    const out = regenerateUnscoredRounds(t);
    expect(JSON.stringify(out)).toBe(before);
  });
});

describe("scheduler — guards", () => {
  test("americano with 3 players returns 0 matches and rests everyone", () => {
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "americano",
      pointsPerMatch: 16,
      players: ["A", "B", "C"],
      rounds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const r = generateAmericanoRound(t);
    expect(r.matches).toEqual([]);
    expect(new Set(r.resting)).toEqual(new Set(["A", "B", "C"]));
  });

  test("mexicano round 1 with 3 players returns 0 matches and rests everyone", () => {
    const t: Tournament = {
      id: "t",
      name: "T",
      format: "mexicano",
      pointsPerMatch: 16,
      players: ["A", "B", "C"],
      rounds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const r = generateMexicanoRound(t);
    expect(r.matches).toEqual([]);
    expect(new Set(r.resting)).toEqual(new Set(["A", "B", "C"]));
  });
});
