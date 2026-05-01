import type { Match, Round, Tournament } from "@/store/tournaments";

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function generateAmericanoRound(t: Tournament): Round {
  const courts = Math.max(
    1,
    Math.min(
      Math.floor(t.players.length / 4),
      t.courtsCount ?? Math.floor(t.players.length / 4)
    )
  );
  if (courts < 1 || t.players.length < 4) {
    return {
      number: t.rounds.length + 1,
      matches: [],
      resting: [...t.players],
    };
  }

  const roundNum = t.rounds.length + 1;
  const partnered = new Set<string>();
  const opposed = new Set<string>();
  for (const r of t.rounds) {
    for (const m of r.matches) {
      partnered.add(pairKey(m.teamA[0], m.teamA[1]));
      partnered.add(pairKey(m.teamB[0], m.teamB[1]));
      for (const a of m.teamA) for (const b of m.teamB) opposed.add(pairKey(a, b));
    }
  }

  const restCounts: Record<string, number> = {};
  for (const p of t.players) restCounts[p] = 0;
  for (const r of t.rounds) for (const p of r.resting) restCounts[p] = (restCounts[p] ?? 0) + 1;

  const needed = courts * 4;
  const sortedByRest = [...t.players].sort(
    (a, b) => restCounts[b] - restCounts[a] || Math.random() - 0.5
  );
  const playing = sortedByRest.slice(0, needed);
  const resting = sortedByRest.slice(needed);

  const best = bestMatching(playing, partnered, opposed);
  const matches: Match[] = best.map((m, i) => ({
    court: i + 1,
    teamA: m.teamA,
    teamB: m.teamB,
    scoreA: null,
    scoreB: null,
  }));

  return { number: roundNum, matches, resting };
}

function bestMatching(
  players: string[],
  partnered: Set<string>,
  opposed: Set<string>
): { teamA: string[]; teamB: string[] }[] {
  let best: { teamA: string[]; teamB: string[] }[] | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches: { teamA: string[]; teamB: string[] }[] = [];
    let score = 0;
    for (let i = 0; i < shuffled.length; i += 4) {
      const group = shuffled.slice(i, i + 4);
      const splits = [
        [[group[0], group[1]], [group[2], group[3]]],
        [[group[0], group[2]], [group[1], group[3]]],
        [[group[0], group[3]], [group[1], group[2]]],
      ];
      let bestSplit = splits[0];
      let bestSplitScore = Infinity;
      for (const s of splits) {
        let sc = 0;
        if (partnered.has(pairKey(s[0][0], s[0][1]))) sc += 10;
        if (partnered.has(pairKey(s[1][0], s[1][1]))) sc += 10;
        for (const a of s[0]) for (const b of s[1]) if (opposed.has(pairKey(a, b))) sc += 1;
        if (sc < bestSplitScore) {
          bestSplitScore = sc;
          bestSplit = s;
        }
      }
      score += bestSplitScore;
      matches.push({ teamA: bestSplit[0], teamB: bestSplit[1] });
    }
    if (score < bestScore) {
      bestScore = score;
      best = matches;
      if (score === 0) break;
    }
  }
  return best!;
}

function pickPairing(
  g: string[],
  partnered: Set<string>
): { teamA: [string, string]; teamB: [string, string] } {
  // Three Mexicano-friendly splits, in priority order:
  //   default: 1+4 vs 2+3 (strongest+weakest pairing)
  //   alt-1:   1+3 vs 2+4
  //   alt-2:   1+2 vs 3+4 (top vs bottom — last resort, less balanced)
  const splits: Array<{ teamA: [string, string]; teamB: [string, string] }> = [
    { teamA: [g[0], g[3]], teamB: [g[1], g[2]] },
    { teamA: [g[0], g[2]], teamB: [g[1], g[3]] },
    { teamA: [g[0], g[1]], teamB: [g[2], g[3]] },
  ];
  for (const s of splits) {
    if (
      !partnered.has(pairKey(s.teamA[0], s.teamA[1])) &&
      !partnered.has(pairKey(s.teamB[0], s.teamB[1]))
    ) {
      return s;
    }
  }
  return splits[0]; // Every split has a repeat — pick default deterministically.
}

export function generateMexicanoRound(t: Tournament): Round {
  if (t.rounds.length === 0) return generateAmericanoRound(t);

  const courts = Math.max(
    1,
    Math.min(
      Math.floor(t.players.length / 4),
      t.courtsCount ?? Math.floor(t.players.length / 4)
    )
  );
  if (courts < 1 || t.players.length < 4) {
    return {
      number: t.rounds.length + 1,
      matches: [],
      resting: [...t.players],
    };
  }

  const roundNum = t.rounds.length + 1;

  const points: Record<string, number> = {};
  for (const p of t.players) points[p] = 0;
  for (const r of t.rounds) {
    for (const m of r.matches) {
      if (m.scoreA == null || m.scoreB == null) continue;
      for (const p of m.teamA) points[p] += m.scoreA;
      for (const p of m.teamB) points[p] += m.scoreB;
    }
  }

  const restCounts: Record<string, number> = {};
  for (const p of t.players) restCounts[p] = 0;
  for (const r of t.rounds) for (const p of r.resting) restCounts[p] = (restCounts[p] ?? 0) + 1;

  const needed = courts * 4;

  // Pick who rests first: lowest by points, with rest-count as a stability
  // tiebreak (whoever has rested least sits out next).
  const restOrder = [...t.players].sort((a, b) => {
    const p = points[a] - points[b];
    if (p !== 0) return p;
    return restCounts[a] - restCounts[b];
  });
  const restingSet = new Set(restOrder.slice(0, t.players.length - needed));
  const resting = [...restingSet];

  // Court assignment is purely points-driven so a previously-rested player
  // can't leapfrog a higher scorer onto a higher court.
  const playing = t.players
    .filter((p) => !restingSet.has(p))
    .sort((a, b) => points[b] - points[a]);

  const partnered = new Set<string>();
  for (const r of t.rounds) {
    for (const m of r.matches) {
      partnered.add(pairKey(m.teamA[0], m.teamA[1]));
      partnered.add(pairKey(m.teamB[0], m.teamB[1]));
    }
  }

  const matches: Match[] = [];
  for (let i = 0; i < playing.length; i += 4) {
    const g = playing.slice(i, i + 4);
    const { teamA, teamB } = pickPairing(g, partnered);
    matches.push({
      court: matches.length + 1,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
    });
  }

  return { number: roundNum, matches, resting };
}

export function generateNextRound(t: Tournament): Round {
  return t.format === "mexicano" ? generateMexicanoRound(t) : generateAmericanoRound(t);
}

export function generateFinalRound(t: Tournament): Round {
  if (t.players.length < 4) {
    throw new Error("Need at least 4 players to start a final round");
  }
  // Always rank by points (regardless of t.sortBy) so the final round picks
  // the actual top scorers. Bonuses count, sit-out compensation does not (the
  // final is about play, not chair time).
  const winBonus = t.winBonus ?? 0;
  const drawBonus = t.drawBonus ?? 0;
  const points: Record<string, number> = {};
  for (const p of t.players) points[p] = 0;
  for (const r of t.rounds) {
    for (const m of r.matches) {
      if (m.scoreA == null || m.scoreB == null) continue;
      const aWin = m.scoreA > m.scoreB;
      const bWin = m.scoreB > m.scoreA;
      const tie = m.scoreA === m.scoreB;
      for (const p of m.teamA) {
        points[p] = (points[p] ?? 0) + m.scoreA + (aWin ? winBonus : tie ? drawBonus : 0);
      }
      for (const p of m.teamB) {
        points[p] = (points[p] ?? 0) + m.scoreB + (bWin ? winBonus : tie ? drawBonus : 0);
      }
    }
  }
  const ranked = [...t.players].sort((a, b) => (points[b] ?? 0) - (points[a] ?? 0));
  const [p1, p2, p3, p4] = ranked;
  return {
    number: t.rounds.length + 1,
    final: true,
    matches: [
      { court: 1, teamA: [p1, p2], teamB: [p3, p4], scoreA: null, scoreB: null },
    ],
    resting: ranked.slice(4),
  };
}
