import type { Match, Round, Tournament } from "@/store/tournaments";

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function generateAmericanoRound(t: Tournament): Round {
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

  const courts = Math.floor(t.players.length / 4);
  const needed = courts * 4;
  const sortedByRest = [...t.players].sort(
    (a, b) => restCounts[a] - restCounts[b] || Math.random() - 0.5
  );
  const resting = sortedByRest.slice(needed);
  const playing = sortedByRest.slice(0, needed);

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

export function generateMexicanoRound(t: Tournament): Round {
  const roundNum = t.rounds.length + 1;
  if (t.rounds.length === 0) return generateAmericanoRound(t);

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

  const courts = Math.floor(t.players.length / 4);
  const needed = courts * 4;
  const ranked = [...t.players].sort((a, b) => {
    const r = restCounts[a] - restCounts[b];
    if (r !== 0) return r;
    return points[b] - points[a];
  });
  const playing = ranked.slice(0, needed).sort((a, b) => points[b] - points[a]);
  const resting = ranked.slice(needed);

  const matches: Match[] = [];
  for (let i = 0; i < playing.length; i += 4) {
    const g = playing.slice(i, i + 4);
    matches.push({
      court: matches.length + 1,
      teamA: [g[0], g[3]],
      teamB: [g[1], g[2]],
      scoreA: null,
      scoreB: null,
    });
  }

  return { number: roundNum, matches, resting };
}

export function generateNextRound(t: Tournament): Round {
  return t.format === "mexicano" ? generateMexicanoRound(t) : generateAmericanoRound(t);
}
