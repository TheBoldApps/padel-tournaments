import { describe, expect, test } from "bun:test";
import { generateMexicanoRound } from "./scheduler";
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
