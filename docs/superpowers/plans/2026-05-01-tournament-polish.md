# Tournament Polish + Mexicano Correctness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three real Mexicano scheduling/standings bugs and lift the tournament UI (home, detail, leaderboard, info, score entry) to competitor parity.

**Architecture:** Bugs first — fix the data layer (`scheduler.ts`, `store/tournaments.ts`) under TDD so later UI tasks display correct numbers. Then small reusable components (`score-box`, `match-card`, `round-pill-selector`). Then screen rewrites (detail, leaderboard, home) and new screens (round-breakdown, info, edit). Three-dot menu unlocks Final/Finish/Edit/Info routes. Exports (CSV from leaderboard, PDF from info) use `expo-print` + `expo-sharing` + `expo-file-system`.

**Tech Stack:** Expo SDK 55, expo-router, React Native 0.83, `bun:test`, existing `AdaptiveGlass`/SF Symbols/`PlatformColor` patterns from `CLAUDE.md`. New deps: `expo-sharing`, `expo-file-system`, `expo-print`.

**Spec sources:**
- Audit findings (mexicano logic + ui flows) recorded in conversation 2026-05-01.
- Competitor reference screenshots (tournament list, detail with round-pill selector, match cards, leaderboard, info sheet, three-dot menu, add-more-rounds dialog).

**Dependency graph (informational):**
- Task 1 unblocks Tasks 12, 13 (deps + new store fields).
- Task 2 unblocks Task 9 (W-T-L column needs `tied` field).
- Tasks 5, 6, 7 unblock Task 8.
- Task 12 unblocks Tasks 13, 14 (header menu routes).
- Tasks 2, 3, 4 are independent of each other; can be parallel.
- Tasks 5, 6, 7 are independent of each other; can be parallel.

---

## Task 1: Install runtime deps + extend store types

**Depends on:** none.

**Files:**
- Modify: `package.json` (via `bunx expo add`)
- Modify: `src/store/tournaments.ts`

- [ ] **Step 1: Install dependencies**

```bash
bunx expo add expo-sharing expo-file-system expo-print
```

Expected: `package.json` and `bun.lock` updated, no errors.

- [ ] **Step 2: Add `final` to `Round` and `finishedAt` to `Tournament`**

Edit `src/store/tournaments.ts`. Update the `Round` and `Tournament` types:

```ts
export type Round = {
  number: number;
  matches: Match[];
  resting: string[];
  final?: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  format: Format;
  pointsPerMatch: number;
  players: string[];
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
};
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/store/tournaments.ts
git commit -m "feat: add export deps + final/finishedAt fields to tournament types"
```

---

## Task 2: Bug — ties not credited (TDD)

**Depends on:** none.

**Files:**
- Create: `src/store/tournaments.test.ts`
- Modify: `src/store/tournaments.ts` (`playerStandings`)

- [ ] **Step 1: Write the failing test**

Create `src/store/tournaments.test.ts`:

```ts
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
      // A+B beat C+D 16-0 -> A,B won; C,D lost
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/store/tournaments.test.ts`
Expected: FAIL — `s.A.tied` is undefined (field doesn't exist yet).

- [ ] **Step 3: Update `playerStandings` in `src/store/tournaments.ts`**

Replace the function entirely:

```ts
export function playerStandings(t: Tournament) {
  const stats: Record<
    string,
    {
      player: string;
      points: number;
      played: number;
      won: number;
      tied: number;
      lost: number;
      diff: number;
    }
  > = {};
  for (const p of t.players) {
    stats[p] = { player: p, points: 0, played: 0, won: 0, tied: 0, lost: 0, diff: 0 };
  }
  for (const r of t.rounds) {
    for (const m of r.matches) {
      if (m.scoreA == null || m.scoreB == null) continue;
      const aWin = m.scoreA > m.scoreB;
      const bWin = m.scoreB > m.scoreA;
      const tie = m.scoreA === m.scoreB;
      for (const p of m.teamA) {
        if (!stats[p]) continue;
        stats[p].points += m.scoreA;
        stats[p].played += 1;
        stats[p].diff += m.scoreA - m.scoreB;
        if (aWin) stats[p].won += 1;
        else if (tie) stats[p].tied += 1;
        else stats[p].lost += 1;
      }
      for (const p of m.teamB) {
        if (!stats[p]) continue;
        stats[p].points += m.scoreB;
        stats[p].played += 1;
        stats[p].diff += m.scoreB - m.scoreA;
        if (bWin) stats[p].won += 1;
        else if (tie) stats[p].tied += 1;
        else stats[p].lost += 1;
      }
    }
  }
  return Object.values(stats).sort(
    (a, b) => b.points - a.points || b.diff - a.diff || b.won - a.won
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/store/tournaments.test.ts`
Expected: 3 pass.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/tournaments.ts src/store/tournaments.test.ts
git commit -m "fix(standings): credit ties and losses separately"
```

---

## Task 3: Bug — Mexicano rest-count demotes high scorers (TDD)

**Depends on:** none.

**Files:**
- Create: `src/lib/scheduler.test.ts`
- Modify: `src/lib/scheduler.ts` (`generateMexicanoRound`)

- [ ] **Step 1: Write the failing test**

Create `src/lib/scheduler.test.ts`:

```ts
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

    // 5 % 4 = 1 court, so 1 player still rests. The bug puts REST onto the court
    // (because rest-count is the primary sort key), pushing a higher scorer off.
    // Correct behaviour: lowest-points player rests; REST should keep resting OR
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/scheduler.test.ts -t "rested last round"`
Expected: FAIL — REST appears on court 1 because rest count outranks points.

- [ ] **Step 3: Fix `generateMexicanoRound` in `src/lib/scheduler.ts`**

Replace lines 99–111 (the `restCounts` ranking + `playing`/`resting` slicing) with:

```ts
  const restCounts: Record<string, number> = {};
  for (const p of t.players) restCounts[p] = 0;
  for (const r of t.rounds) for (const p of r.resting) restCounts[p] = (restCounts[p] ?? 0) + 1;

  const courts = Math.floor(t.players.length / 4);
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

  // Court assignment is *purely* points-driven so a previously-rested player
  // can't leapfrog a higher scorer onto a higher court.
  const playing = t.players
    .filter((p) => !restingSet.has(p))
    .sort((a, b) => points[b] - points[a]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/scheduler.test.ts`
Expected: pass.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduler.ts src/lib/scheduler.test.ts
git commit -m "fix(mexicano): assign courts by points, not rest count"
```

---

## Task 4: Bug — Mexicano can repeat the same partnership (TDD)

**Depends on:** Task 3 (same file).

**Files:**
- Modify: `src/lib/scheduler.test.ts`
- Modify: `src/lib/scheduler.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/lib/scheduler.test.ts`:

```ts
describe("generateMexicanoRound — avoid immediate repeat partnerships", () => {
  test("same court 4 with identical scores swaps to alternate pairing", () => {
    // 4 players, round 1: A+D vs B+C, A+D won 16-0.
    // Round 2 ranking: A,D tied at 16; B,C tied at 0.
    // Default Mexicano pairing for [A,D,B,C] is rank 1+4 vs 2+3 -> A+C vs D+B
    // (different from round 1, fine). But for [A,B,C,D] sorted, it would be A+D
    // vs B+C, same as round 1. We want to verify the NEW partnerships from
    // round 2 do NOT repeat round-1 partnerships.
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
    const partner = (m: { teamA: string[]; teamB: string[] }) =>
      [m.teamA.slice().sort().join(""), m.teamB.slice().sort().join("")].sort();
    const r1Partners = partner(t.rounds[0].matches[0]);
    const r2Partners = partner(r.matches[0]);
    expect(r2Partners).not.toEqual(r1Partners);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/scheduler.test.ts -t "repeat partnerships"`
Expected: FAIL — round 2 reuses A+D and B+C.

- [ ] **Step 3: Add the helper + swap logic in `src/lib/scheduler.ts`**

Inside `generateMexicanoRound`, before the `for (let i = 0; i < playing.length; i += 4)` loop, build a partnership set:

```ts
  const partnered = new Set<string>();
  for (const r of t.rounds) {
    for (const m of r.matches) {
      partnered.add(pairKey(m.teamA[0], m.teamA[1]));
      partnered.add(pairKey(m.teamB[0], m.teamB[1]));
    }
  }
```

Replace the court-loop body with:

```ts
  const matches: Match[] = [];
  for (let i = 0; i < playing.length; i += 4) {
    const g = playing.slice(i, i + 4);
    // Default Mexicano pairing: rank 1+4 vs 2+3.
    let teamA: [string, string] = [g[0], g[3]];
    let teamB: [string, string] = [g[1], g[2]];
    // If either pair already played as partners, swap to 1+3 vs 2+4.
    if (partnered.has(pairKey(teamA[0], teamA[1])) ||
        partnered.has(pairKey(teamB[0], teamB[1]))) {
      teamA = [g[0], g[2]];
      teamB = [g[1], g[3]];
    }
    matches.push({
      court: matches.length + 1,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
    });
  }
```

- [ ] **Step 4: Run all scheduler tests**

Run: `bun test src/lib/scheduler.test.ts`
Expected: all pass.

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduler.ts src/lib/scheduler.test.ts
git commit -m "fix(mexicano): avoid immediate repeat partnerships"
```

---

## Task 5: Component — `score-box.tsx` (winner/loser styling)

**Depends on:** none.

**Files:**
- Create: `src/components/score-box.tsx`

- [ ] **Step 1: Create the component**

```tsx
import {
  PlatformColor,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type State = "neutral" | "winner" | "loser";

export function ScoreBox({
  value,
  onChange,
  state,
  max,
}: {
  value: number | null;
  onChange: (v: string) => void;
  state: State;
  max: number;
}) {
  const bg =
    state === "winner"
      ? "#3B6BFF"
      : state === "loser"
      ? "#9AA0A6"
      : (PlatformColor("secondarySystemBackground") as unknown as string);
  const fg =
    state === "neutral"
      ? (PlatformColor("label") as unknown as string)
      : "#FFFFFF";

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: bg, borderCurve: "continuous" },
      ]}
    >
      <TextInput
        value={value == null ? "" : String(value).padStart(2, "0")}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="––"
        placeholderTextColor={fg + "88"}
        maxLength={String(max).length}
        style={[styles.input, { color: fg }]}
      />
    </View>
  );
}

export function scoreState(
  a: number | null,
  b: number | null,
  side: "A" | "B"
): State {
  if (a == null || b == null) return "neutral";
  if (a === b) return "neutral";
  if (side === "A") return a > b ? "winner" : "loser";
  return b > a ? "winner" : "loser";
}

const styles = StyleSheet.create({
  box: {
    width: 64,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    fontSize: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/score-box.tsx
git commit -m "feat: ScoreBox with winner/loser highlighting"
```

---

## Task 6: Component — `match-card.tsx`

**Depends on:** Task 5.

**Files:**
- Create: `src/components/match-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { AdaptiveGlass } from "@/components/ui";
import { ScoreBox, scoreState } from "@/components/score-box";
import { Image } from "expo-image";
import {
  PlatformColor,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type MatchVM = {
  court: number;
  teamA: string[];
  teamB: string[];
  scoreA: number | null;
  scoreB: number | null;
};

export function MatchCard({
  match,
  pointsPerMatch,
  onChangeA,
  onChangeB,
  disabled,
}: {
  match: MatchVM;
  pointsPerMatch: number;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.scoreRow}>
        <ScoreBox
          value={match.scoreA}
          onChange={disabled ? () => {} : onChangeA}
          state={scoreState(match.scoreA, match.scoreB, "A")}
          max={pointsPerMatch}
        />
        <ScoreBox
          value={match.scoreB}
          onChange={disabled ? () => {} : onChangeB}
          state={scoreState(match.scoreA, match.scoreB, "B")}
          max={pointsPerMatch}
        />
      </View>
      <AdaptiveGlass
        style={{
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
          marginTop: -28,
          paddingTop: 36,
        }}
      >
        <View style={styles.teams}>
          <View style={styles.team}>
            {match.teamA.map((p) => (
              <Text key={p} style={styles.player}>
                {p}
              </Text>
            ))}
          </View>
          <View style={styles.team}>
            {match.teamB.map((p) => (
              <Text key={p} style={[styles.player, { textAlign: "right" }]}>
                {p}
              </Text>
            ))}
          </View>
        </View>
      </AdaptiveGlass>
      <View style={styles.courtBadgeWrap}>
        <View style={styles.courtBadge}>
          <Image
            source="sf:rectangle.split.2x1"
            tintColor={PlatformColor("secondaryLabel") as unknown as string}
            style={{ width: 14, height: 14 }}
          />
          <Text style={styles.courtText}>{match.court}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    zIndex: 1,
  },
  teams: { flexDirection: "row", justifyContent: "space-between" },
  team: { gap: 4 },
  player: {
    fontSize: 18,
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  courtBadgeWrap: { alignItems: "center", marginTop: -14 },
  courtBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: PlatformColor("tertiarySystemBackground") as unknown as string,
  },
  courtText: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/match-card.tsx
git commit -m "feat: MatchCard with stacked players + court badge"
```

---

## Task 7: Component — `round-pill-selector.tsx`

**Depends on:** none.

**Files:**
- Create: `src/components/round-pill-selector.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { Round } from "@/store/tournaments";
import { Image } from "expo-image";
import {
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function RoundPillSelector({
  rounds,
  selectedIndex,
  onSelect,
  onAdd,
  finished,
}: {
  rounds: Round[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  finished?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {rounds.map((r, idx) => {
        const complete = r.matches.every(
          (m) => m.scoreA != null && m.scoreB != null
        );
        const selected = idx === selectedIndex;
        return (
          <Pressable
            key={r.number}
            onPress={() => onSelect(idx)}
            style={[
              styles.pill,
              {
                backgroundColor: selected
                  ? (PlatformColor("systemBlue") as unknown as string) + "22"
                  : (PlatformColor("secondarySystemBackground") as unknown as string),
                borderColor: selected
                  ? (PlatformColor("systemBlue") as unknown as string)
                  : "transparent",
              },
            ]}
          >
            <Text style={styles.number}>{r.number}</Text>
            {complete && (
              <Image
                source="sf:checkmark"
                tintColor={"#22C55E"}
                style={{ width: 14, height: 14 }}
              />
            )}
            {r.final && (
              <Image
                source="sf:trophy.fill"
                tintColor={"#F2BF40"}
                style={{ width: 14, height: 14 }}
              />
            )}
          </Pressable>
        );
      })}
      {!finished && (
        <Pressable onPress={onAdd} style={[styles.pill, styles.addPill]}>
          <Image
            source="sf:plus"
            tintColor={PlatformColor("systemBlue") as unknown as string}
            style={{ width: 14, height: 14 }}
          />
          <Text style={styles.addText}>More</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1.5,
    minWidth: 56,
    justifyContent: "center",
  },
  number: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  addPill: { borderColor: "transparent" },
  addText: {
    fontSize: 15,
    fontWeight: "600",
    color: PlatformColor("systemBlue") as unknown as string,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/round-pill-selector.tsx
git commit -m "feat: RoundPillSelector with completion checkmarks"
```

---

## Task 8: Tournament detail screen redesign

**Depends on:** Tasks 1, 5, 6, 7.

**Files:**
- Modify: `src/app/[id]/index.tsx`

- [ ] **Step 1: Replace the screen**

Overwrite `src/app/[id]/index.tsx` with:

```tsx
import { AdaptiveGlass, Button } from "@/components/ui";
import { MatchCard } from "@/components/match-card";
import { RoundPillSelector } from "@/components/round-pill-selector";
import { generateNextRound } from "@/lib/scheduler";
import { Match, updateTournament, useTournaments } from "@/store/tournaments";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Default-select the latest round whenever the round count changes.
  useEffect(() => {
    if (t && t.rounds.length > 0) setSelectedIdx(t.rounds.length - 1);
  }, [t?.rounds.length]);

  if (!t) {
    return (
      <View style={styles.center}>
        <Text style={{ color: PlatformColor("label") as unknown as string }}>
          Tournament not found.
        </Text>
      </View>
    );
  }

  const finished = t.finishedAt != null;

  const addRound = () => {
    const round = generateNextRound(t);
    updateTournament(t.id, (cur) => ({ ...cur, rounds: [...cur.rounds, round] }));
  };

  const setScore = (
    roundIdx: number,
    matchIdx: number,
    side: "A" | "B",
    value: string
  ) => {
    if (finished) return;
    const num =
      value === ""
        ? null
        : Math.max(0, Math.min(t.pointsPerMatch, Number(value) || 0));
    updateTournament(t.id, (cur) => {
      const rounds = cur.rounds.map((r, ri) => {
        if (ri !== roundIdx) return r;
        const matches = r.matches.map((m, mi) => {
          if (mi !== matchIdx) return m;
          const next: Match = { ...m };
          if (side === "A") {
            next.scoreA = num;
            if (num != null) next.scoreB = cur.pointsPerMatch - num;
          } else {
            next.scoreB = num;
            if (num != null) next.scoreA = cur.pointsPerMatch - num;
          }
          return next;
        });
        return { ...r, matches };
      });
      return { ...cur, rounds };
    });
  };

  const finishOrLeaderboard = () => {
    if (!finished) {
      Alert.alert(
        "Finish tournament?",
        "You can no longer edit scores after finishing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish",
            style: "destructive",
            onPress: () => {
              updateTournament(t.id, (cur) => ({ ...cur, finishedAt: Date.now() }));
              router.push(`/${t.id}/standings`);
            },
          },
        ]
      );
    } else {
      router.push(`/${t.id}/standings`);
    }
  };

  const round = t.rounds[selectedIdx];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.name}</Text>
          <Text style={styles.subtitle}>
            {t.format === "americano" ? "Classic Americano" : "Classic Mexicano"}
          </Text>
          <Text style={styles.subtitle}>
            {new Date(t.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>{t.pointsPerMatch}</Text>
            <Image
              source="sf:scope"
              tintColor={PlatformColor("secondaryLabel") as unknown as string}
              style={{ width: 18, height: 18 }}
            />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>{t.players.length}</Text>
            <Image
              source="sf:person.2.fill"
              tintColor={PlatformColor("secondaryLabel") as unknown as string}
              style={{ width: 18, height: 18 }}
            />
          </View>
        </View>
      </View>

      <RoundPillSelector
        rounds={t.rounds}
        selectedIndex={selectedIdx}
        onSelect={setSelectedIdx}
        onAdd={addRound}
        finished={finished}
      />

      {!round ? (
        <Text style={styles.empty}>Tap More to add the first round.</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {round.matches.map((m, mi) => (
            <MatchCard
              key={mi}
              match={m}
              pointsPerMatch={t.pointsPerMatch}
              onChangeA={(v) => setScore(selectedIdx, mi, "A", v)}
              onChangeB={(v) => setScore(selectedIdx, mi, "B", v)}
              disabled={finished}
            />
          ))}
          {round.resting.length > 0 && (
            <AdaptiveGlass
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 14,
                borderCurve: "continuous",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Image
                  source="sf:chair.lounge"
                  tintColor={PlatformColor("secondaryLabel") as unknown as string}
                  style={{ width: 16, height: 16 }}
                />
                <Text style={styles.restingHeader}>Resting Players</Text>
              </View>
              <Text style={styles.restingNames}>
                {round.resting.join(", ")}
              </Text>
            </AdaptiveGlass>
          )}
        </View>
      )}

      <View style={styles.bottomBar}>
        <Button
          title="+ More"
          variant="ghost"
          onPress={addRound}
          style={{ flex: 1 }}
        />
        <Button
          title={finished ? "Leaderboard" : "Finish"}
          onPress={finishOrLeaderboard}
          style={{ flex: 1.4 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  restingHeader: {
    fontWeight: "700",
    fontSize: 15,
    color: PlatformColor("label") as unknown as string,
  },
  restingNames: {
    fontSize: 15,
    color: PlatformColor("label") as unknown as string,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 24,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Open a tournament. Verify: header layout, round-pill selector, score boxes change to blue/gray as scores fill, resting players card with chair icon, "+ More" / "Finish" bottom bar. Tapping "Finish" prompts and locks scores.

- [ ] **Step 4: Commit**

```bash
git add src/app/[id]/index.tsx
git commit -m "feat: redesign tournament detail with pill selector + match cards"
```

---

## Task 9: Leaderboard polish + W-T-L column

**Depends on:** Task 2.

**Files:**
- Modify: `src/app/[id]/standings.tsx`
- Modify: `src/app/_layout.tsx` (add `presentation: "formSheet"` to standings route + `headerLargeTitle: false`)

- [ ] **Step 1: Update the standings route to a form sheet**

In `src/app/_layout.tsx`, replace the `[id]/standings` Stack.Screen with:

```tsx
<Stack.Screen
  name="[id]/standings"
  options={{
    title: "Leaderboard",
    presentation: "formSheet",
    contentStyle: { backgroundColor: "transparent" },
    headerLargeTitle: false,
  }}
/>
```

- [ ] **Step 2: Replace the standings screen**

Overwrite `src/app/[id]/standings.tsx`:

```tsx
import { AdaptiveGlass } from "@/components/ui";
import { playerStandings, useTournaments } from "@/store/tournaments";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MEDAL_COLORS = ["#F2BF40", "#A8A8A8", "#CD7F32"];

export default function Standings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);

  if (!t) {
    return (
      <View style={styles.center}>
        <Text>Tournament not found.</Text>
      </View>
    );
  }
  const standings = playerStandings(t);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.headerCell, { flex: 1, textAlign: "left" }]}>
          {""}
        </Text>
        <Text style={[styles.cell, styles.headerCell]}>P</Text>
        <Text style={[styles.cell, styles.headerCell, { width: 64 }]}>W-T-L</Text>
      </View>

      <AdaptiveGlass style={styles.table}>
        {standings.map((s, i) => (
          <View
            key={s.player}
            style={[
              styles.row,
              i === standings.length - 1 ? null : styles.rowBorder,
            ]}
          >
            <View style={{ alignItems: "center", marginRight: 12 }}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View
                style={{
                  height: 3,
                  width: 16,
                  marginTop: 2,
                  backgroundColor: MEDAL_COLORS[i] ?? "transparent",
                  borderRadius: 2,
                }}
              />
            </View>
            <Text style={[styles.player]} numberOfLines={1}>
              {s.player}
            </Text>
            <Text style={styles.cell}>{s.points}</Text>
            <Text style={[styles.cell, { width: 64 }]}>
              {s.won}-{s.tied}-{s.lost}
            </Text>
          </View>
        ))}
      </AdaptiveGlass>

      <Text style={styles.legend}>
        • P: Points - The total number of points earned.{"\n"}
        • W-T-L: Wins-Ties-Losses - Each participant's record.
      </Text>

      <Pressable
        onPress={() => router.push(`/${t.id}/round-breakdown`)}
        style={styles.linkRow}
      >
        <Image
          source="sf:square.grid.3x3"
          tintColor={PlatformColor("secondaryLabel") as unknown as string}
          style={{ width: 18, height: 18 }}
        />
        <Text style={styles.linkText}>Round Breakdown</Text>
        <Image
          source="sf:chevron.right"
          tintColor={PlatformColor("tertiaryLabel") as unknown as string}
          style={{ width: 8, height: 14, marginLeft: "auto" }}
        />
      </Pressable>

      <Text style={styles.exportHeader}>EXPORT</Text>
      <Pressable
        onPress={() => router.push(`/${t.id}/standings/csv`)}
        style={styles.linkRow}
      >
        <Image
          source="sf:square.and.arrow.up"
          tintColor={PlatformColor("label") as unknown as string}
          style={{ width: 18, height: 18 }}
        />
        <Text style={styles.linkText}>Export CSV</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerCell: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontWeight: "600",
  },
  table: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomColor: PlatformColor("separator") as unknown as string,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    fontSize: 18,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  player: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  cell: {
    width: 48,
    textAlign: "center",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  legend: {
    marginTop: 16,
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontSize: 13,
    paddingHorizontal: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginTop: 10,
    backgroundColor: PlatformColor("secondarySystemBackground") as unknown as string,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  linkText: {
    fontSize: 17,
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  exportHeader: {
    marginTop: 24,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    paddingHorizontal: 4,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: errors only about the new `[id]/round-breakdown` and `[id]/standings/csv` routes that don't exist yet — those are added in Tasks 10 and 11. **Skip this step's expectation if those tasks haven't run yet — re-run after Task 11.**

- [ ] **Step 4: Commit**

```bash
git add src/app/[id]/standings.tsx src/app/_layout.tsx
git commit -m "feat: leaderboard polish — colored medals + W-T-L column"
```

---

## Task 10: Round breakdown screen

**Depends on:** Task 2 (uses standings/per-round logic).

**Files:**
- Create: `src/app/[id]/round-breakdown.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Register the route**

In `src/app/_layout.tsx`, inside the protected stack, add:

```tsx
<Stack.Screen
  name="[id]/round-breakdown"
  options={{ title: "Round Breakdown", headerLargeTitle: false }}
/>
```

- [ ] **Step 2: Create the screen**

```tsx
import { AdaptiveGlass } from "@/components/ui";
import { useTournaments, type Round } from "@/store/tournaments";
import { useLocalSearchParams } from "expo-router";
import {
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function pointsForPlayerInRound(player: string, r: Round): number {
  let pts = 0;
  for (const m of r.matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    if (m.teamA.includes(player)) pts += m.scoreA;
    else if (m.teamB.includes(player)) pts += m.scoreB;
  }
  return pts;
}

export default function RoundBreakdown() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  if (!t) return null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      horizontal={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <AdaptiveGlass style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.player]}>Player</Text>
            {t.rounds.map((r) => (
              <Text key={r.number} style={[styles.cell, styles.headerCell]}>
                R{r.number}
              </Text>
            ))}
            <Text style={[styles.cell, styles.headerCell]}>Total</Text>
          </View>
          {t.players.map((p) => {
            const perRound = t.rounds.map((r) => pointsForPlayerInRound(p, r));
            const total = perRound.reduce((a, b) => a + b, 0);
            return (
              <View key={p} style={styles.row}>
                <Text style={[styles.cell, styles.player]} numberOfLines={1}>
                  {p}
                </Text>
                {perRound.map((v, i) => (
                  <Text key={i} style={styles.cell}>
                    {v || "-"}
                  </Text>
                ))}
                <Text style={[styles.cell, { fontWeight: "800" }]}>{total}</Text>
              </View>
            );
          })}
        </AdaptiveGlass>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    minWidth: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomColor: PlatformColor("separator") as unknown as string,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { backgroundColor: PlatformColor("tertiarySystemBackground") as unknown as string },
  player: { width: 120, textAlign: "left" },
  cell: {
    width: 56,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: PlatformColor("label") as unknown as string,
  },
  headerCell: {
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors related to this file.

- [ ] **Step 4: Commit**

```bash
git add src/app/[id]/round-breakdown.tsx src/app/_layout.tsx
git commit -m "feat: per-round point breakdown screen"
```

---

## Task 11: CSV export from leaderboard

**Depends on:** Task 1 (deps installed), Task 2 (W-T-L), Task 9 (route).

**Files:**
- Create: `src/lib/export-csv.ts`
- Create: `src/app/[id]/standings/csv.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: CSV builder**

```ts
// src/lib/export-csv.ts
import type { Tournament } from "@/store/tournaments";
import { playerStandings } from "@/store/tournaments";

export function tournamentCsv(t: Tournament): string {
  const rows: string[][] = [];
  rows.push(["Rank", "Player", "Points", "Played", "Wins", "Ties", "Losses", "Diff"]);
  const standings = playerStandings(t);
  standings.forEach((s, i) => {
    rows.push([
      String(i + 1),
      s.player,
      String(s.points),
      String(s.played),
      String(s.won),
      String(s.tied),
      String(s.lost),
      String(s.diff),
    ]);
  });
  return rows
    .map((r) => r.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)).join(","))
    .join("\n");
}
```

- [ ] **Step 2: Register the route**

In `src/app/_layout.tsx`, add:

```tsx
<Stack.Screen
  name="[id]/standings/csv"
  options={{ title: "Export CSV", headerLargeTitle: false }}
/>
```

- [ ] **Step 3: Create the export screen**

```tsx
// src/app/[id]/standings/csv.tsx
import { Button } from "@/components/ui";
import { tournamentCsv } from "@/lib/export-csv";
import { useTournaments } from "@/store/tournaments";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

export default function CsvExport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const ran = useRef(false);

  useEffect(() => {
    if (!t || ran.current) return;
    ran.current = true;
    (async () => {
      const csv = tournamentCsv(t);
      const safeName = t.name.replace(/[^a-z0-9_-]+/gi, "_") || "tournament";
      const path = `${FileSystem.cacheDirectory}${safeName}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: "text/csv" });
      } else {
        Alert.alert("Sharing not available on this device.");
      }
      if (router.canGoBack()) router.back();
    })();
  }, [t?.id]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-csv.ts src/app/[id]/standings/csv.tsx src/app/_layout.tsx
git commit -m "feat: CSV export of leaderboard via expo-sharing"
```

---

## Task 12: Three-dot tournament menu + Final-round generator

**Depends on:** Task 1, Task 8.

**Files:**
- Create: `src/components/menu-sheet.tsx`
- Modify: `src/app/[id]/index.tsx`
- Modify: `src/lib/scheduler.ts`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Build a reusable action-sheet menu**

```tsx
// src/components/menu-sheet.tsx
import { AdaptiveGlass } from "@/components/ui";
import { Image } from "expo-image";
import {
  Modal,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type MenuItem = {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
};

export function MenuSheet({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrap} onStartShouldSetResponder={() => true}>
          <AdaptiveGlass style={styles.sheet}>
            {items.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  setTimeout(item.onPress, 0);
                }}
                style={({ pressed }) => [
                  styles.row,
                  i !== items.length - 1 && styles.rowBorder,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Image
                  source={`sf:${item.icon}`}
                  tintColor={
                    (item.destructive
                      ? PlatformColor("systemRed")
                      : PlatformColor("label")) as unknown as string
                  }
                  style={{ width: 18, height: 18 }}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: item.destructive
                        ? (PlatformColor("systemRed") as unknown as string)
                        : (PlatformColor("label") as unknown as string),
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </AdaptiveGlass>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)", justifyContent: "flex-start" },
  sheetWrap: { marginTop: 90, marginRight: 12, alignSelf: "flex-end", width: 240 },
  sheet: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  rowBorder: {
    borderBottomColor: PlatformColor("separator") as unknown as string,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16, fontWeight: "500" },
});
```

- [ ] **Step 2: Add a `generateFinalRound` helper**

Append to `src/lib/scheduler.ts`:

```ts
import { playerStandings } from "@/store/tournaments";

export function generateFinalRound(t: Tournament): Round {
  const ranked = playerStandings(t).map((s) => s.player);
  if (ranked.length < 4) {
    throw new Error("Need at least 4 players to start a final round");
  }
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
```

- [ ] **Step 3: Wire the menu into the tournament screen**

In `src/app/[id]/index.tsx`, after the existing imports add:

```tsx
import { MenuSheet, type MenuItem } from "@/components/menu-sheet";
import { generateFinalRound } from "@/lib/scheduler";
import { Stack } from "expo-router";
import { useState } from "react";
```

Above `return (` inside `TournamentScreen`, add:

```tsx
const [menuOpen, setMenuOpen] = useState(false);

const startFinalRound = () => {
  Alert.alert(
    "Start final round?",
    "Adds a championship match between the top 4 players.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: () => {
          const round = generateFinalRound(t);
          updateTournament(t.id, (cur) => ({
            ...cur,
            rounds: [...cur.rounds, round],
          }));
        },
      },
    ]
  );
};

const finishTournament = () => {
  Alert.alert("Finish tournament?", "Scores will be locked.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Finish",
      style: "destructive",
      onPress: () =>
        updateTournament(t.id, (cur) => ({ ...cur, finishedAt: Date.now() })),
    },
  ]);
};

const menuItems: MenuItem[] = [
  { label: "Tournament Info", icon: "info.circle", onPress: () => router.push(`/${t.id}/info`) },
  { label: "Edit Tournament", icon: "pencil", onPress: () => router.push(`/${t.id}/edit`) },
  { label: "Start Final Round", icon: "trophy", onPress: startFinalRound },
  {
    label: finished ? "Reopen Tournament" : "Finish Tournament",
    icon: finished ? "lock.open" : "checkmark.circle",
    onPress: finished
      ? () =>
          updateTournament(t.id, (cur) => ({ ...cur, finishedAt: undefined }))
      : finishTournament,
  },
];
```

Add a `<Stack.Screen>` at the very top of the returned JSX (above `<ScrollView>` if you have to wrap them in a fragment):

```tsx
<Stack.Screen
  options={{
    headerRight: () => (
      <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
        <Image
          source="sf:ellipsis.circle"
          tintColor={PlatformColor("systemTeal") as unknown as string}
          style={{ width: 26, height: 26 }}
        />
      </Pressable>
    ),
  }}
/>
```

(Add `Pressable` and `Image` to the imports if not already there.)

Render the menu inside the fragment:

```tsx
<MenuSheet
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  items={menuItems}
/>
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: errors only for `/${t.id}/info` and `/${t.id}/edit` routes (created in Tasks 13–14).

- [ ] **Step 5: Commit**

```bash
git add src/components/menu-sheet.tsx src/lib/scheduler.ts src/app/[id]/index.tsx
git commit -m "feat: tournament three-dot menu + final round + finish toggle"
```

---

## Task 13: Tournament Info screen + PDF export

**Depends on:** Task 1, Task 12.

**Files:**
- Create: `src/app/[id]/info.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Register the route**

In `src/app/_layout.tsx`:

```tsx
<Stack.Screen
  name="[id]/info"
  options={{
    title: "Tournament Information",
    presentation: "formSheet",
    contentStyle: { backgroundColor: "transparent" },
    headerLargeTitle: false,
  }}
/>
```

- [ ] **Step 2: Create the screen**

```tsx
import { AdaptiveGlass } from "@/components/ui";
import { useTournaments, type Tournament } from "@/store/tournaments";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import {
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function summary(t: Tournament): string[] {
  const courts = Math.max(1, Math.floor(t.players.length / 4));
  const totalMatches = courts * (t.rounds.length || 0);
  const minutesPerRound = t.format === "mexicano" ? 15 : 12;
  const duration = (t.rounds.length || 0) * minutesPerRound;
  return [
    `You are playing ${t.format} style tournament.`,
    `${t.players.length} players play on ${courts} court(s).`,
    t.format === "americano"
      ? "Players are paired up in unique teams until everyone has played with everyone and against everyone."
      : "Each round, top scorers play together on higher courts. Pairings rotate based on standings.",
    `Each round is played up to ${t.pointsPerMatch} points. Each ball won gives a point to the winning pair.`,
    `Rounds played: ${t.rounds.length}`,
    `Total matches: ${totalMatches}`,
    `Estimated duration: ${Math.floor(duration / 60)}h ${duration % 60}m`,
  ];
}

function pdfHtml(t: Tournament): string {
  const rows = t.rounds
    .map(
      (r) =>
        `<h3>Round ${r.number}${r.final ? " (Final)" : ""}</h3>` +
        r.matches
          .map(
            (m) =>
              `<p>Court ${m.court}: ${m.teamA.join(" & ")} <b>${m.scoreA ?? "–"}</b> vs <b>${m.scoreB ?? "–"}</b> ${m.teamB.join(" & ")}</p>`
          )
          .join("") +
        (r.resting.length ? `<p><i>Resting: ${r.resting.join(", ")}</i></p>` : "")
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${t.name}</title>
    <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;}
    h1{margin:0 0 4px}h3{margin-top:18px}p{margin:4px 0}</style></head>
    <body><h1>${t.name}</h1><p>${t.format} · ${t.players.length} players · ${t.pointsPerMatch} pts/match</p>${rows}</body></html>`;
}

export default function Info() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  if (!t) return null;

  const exportPdf = async () => {
    const { uri } = await Print.printToFileAsync({ html: pdfHtml(t) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <AdaptiveGlass style={styles.card}>
        {summary(t).map((line, i) => (
          <Text key={i} style={styles.line}>
            • {line}
          </Text>
        ))}
      </AdaptiveGlass>
      <Text style={styles.sectionHeader}>EXPORT</Text>
      <Pressable onPress={exportPdf} style={styles.row}>
        <Image
          source="sf:printer"
          tintColor={PlatformColor("label") as unknown as string}
          style={{ width: 22, height: 22 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Export PDF</Text>
          <Text style={styles.sublabel}>
            Export the full tournament schedule to PDF file
          </Text>
        </View>
        <Image
          source="sf:square.and.arrow.up"
          tintColor={PlatformColor("secondaryLabel") as unknown as string}
          style={{ width: 18, height: 18 }}
        />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 14, borderCurve: "continuous" },
  line: {
    fontSize: 16,
    lineHeight: 22,
    color: PlatformColor("label") as unknown as string,
    marginBottom: 8,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 0.4,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: PlatformColor("secondarySystemBackground") as unknown as string,
  },
  label: { fontSize: 17, fontWeight: "600", color: PlatformColor("label") as unknown as string },
  sublabel: {
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 2,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[id]/info.tsx src/app/_layout.tsx
git commit -m "feat: Tournament Information sheet with PDF export"
```

---

## Task 14: Edit Tournament screen

**Depends on:** Task 12.

**Files:**
- Create: `src/app/[id]/edit.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Register the route**

```tsx
<Stack.Screen
  name="[id]/edit"
  options={{
    title: "Edit Tournament",
    presentation: "formSheet",
    contentStyle: { backgroundColor: "transparent" },
    headerLargeTitle: false,
  }}
/>
```

- [ ] **Step 2: Create the screen**

```tsx
import { Button, AdaptiveGlass } from "@/components/ui";
import { updateTournament, useTournaments } from "@/store/tournaments";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function EditTournament() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const [name, setName] = useState(t?.name ?? "");
  const [pts, setPts] = useState(String(t?.pointsPerMatch ?? 24));

  if (!t) return null;

  const save = () => {
    const ptsNum = Math.max(1, Math.min(99, Number(pts) || t.pointsPerMatch));
    if (!name.trim()) {
      Alert.alert("Name is required");
      return;
    }
    updateTournament(t.id, (cur) => ({
      ...cur,
      name: name.trim(),
      pointsPerMatch: ptsNum,
    }));
    if (router.canGoBack()) router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <AdaptiveGlass style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tournament name"
          placeholderTextColor={
            PlatformColor("placeholderText") as unknown as string
          }
          style={styles.input}
        />
      </AdaptiveGlass>

      <AdaptiveGlass style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.label}>Points per match</Text>
        <TextInput
          value={pts}
          onChangeText={setPts}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.input}
        />
      </AdaptiveGlass>

      <View style={{ marginTop: 24 }}>
        <Button title="Save" onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderCurve: "continuous" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 6,
  },
  input: {
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
    paddingVertical: 4,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[id]/edit.tsx src/app/_layout.tsx
git commit -m "feat: edit tournament name + points per match"
```

---

## Task 15: Home — month grouping + card redesign

**Depends on:** none (independent of other tasks).

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Replace the home screen with a SectionList**

Overwrite `src/app/index.tsx`:

```tsx
import { AdaptiveGlass, GlassFab, colors } from "@/components/ui";
import { refetch } from "@/lib/sync";
import {
  deleteTournament,
  useTournaments,
  type Tournament,
} from "@/store/tournaments";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  PlatformColor,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function groupByMonth(items: Tournament[]) {
  const map = new Map<string, Tournament[]>();
  for (const t of items) {
    const key = MONTH_FORMAT.format(new Date(t.createdAt));
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function Home() {
  const { tournaments } = useTournaments();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const sections = useMemo(() => groupByMonth(tournaments), [tournaments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch(tournaments);
    setRefreshing(false);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert("Delete tournament", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTournament(id),
      },
    ]);
  };

  const useSymbol = process.env.EXPO_OS === "ios";

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Tournaments",
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
              {useSymbol ? (
                <Image
                  source="sf:gearshape"
                  tintColor={PlatformColor("systemTeal") as unknown as string}
                  style={{ width: 24, height: 24 }}
                />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  Settings
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image
              source="sf:trophy"
              tintColor={
                PlatformColor("secondaryLabel") as unknown as string
              }
              style={{ width: 48, height: 48, marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>No tournaments yet</Text>
            <Text style={styles.emptySub}>
              Tap "Create Tournament" to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const totalMatches = item.rounds.reduce(
            (s, r) => s + r.matches.length,
            0
          );
          return (
            <Pressable
              onPress={() => router.push(`/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
            >
              <AdaptiveGlass style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.format}>
                    {item.format === "americano"
                      ? "Classic Americano"
                      : "Classic Mexicano"}
                  </Text>
                  <Text style={styles.date}>
                    {DATE_FORMAT.format(new Date(item.createdAt))}
                  </Text>
                </View>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.divider} />
                <Text style={styles.meta}>
                  {item.players.length} Players · {item.rounds.length} Rounds
                  {totalMatches ? ` · ${totalMatches} Matches` : ""}
                </Text>
              </AdaptiveGlass>
            </Pressable>
          );
        }}
      />
      <View style={styles.fab}>
        <GlassFab
          icon="plus"
          label="Create Tournament"
          onPress={() => router.push("/new")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  format: {
    fontSize: 14,
    fontWeight: "500",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  date: {
    fontSize: 14,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
    marginVertical: 10,
  },
  meta: {
    fontSize: 14,
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  emptySub: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
    marginTop: 6,
  },
  fab: { position: "absolute", bottom: 28, alignSelf: "center" },
});
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: home — month-grouped sections + new card layout"
```

---

## Task 16: End-to-end manual test pass

No code changes. This is a verification gate.

- [ ] **Step 1: tsc + tests clean**

```bash
bunx tsc --noEmit
bun test
```
Expected: tsc no errors, all tests pass.

- [ ] **Step 2: Reload sim**

Press `r` in the Metro terminal (or shake → Reload in the simulator).

- [ ] **Step 3: Home**

Tournaments grouped under month headers. Each card shows format / date / title / "N Players · M Rounds". FAB now reads "Create Tournament".

- [ ] **Step 4: Tournament detail (Mexicano)**

Open a Mexicano tournament with at least 8 players and 1 completed round. Verify:
- Round-pill selector at top with green ✅ on completed rounds.
- Big target-points number + player count icon top-right of header.
- Match cards: scores in winner-blue / loser-gray boxes; players left/right; court badge in middle.
- "Resting Players" card with chair icon when applicable.
- "+ More" / "Finish" bottom action bar.

- [ ] **Step 5: Mexicano correctness**

Create a 5-player Mexicano. Play round 1 with one player resting. Generate round 2.
- The 4 highest scorers must be on court 1; the previously-rested player should not leapfrog any of them.
- Repeat for 8 players: confirm the round-2 partnerships differ from round-1.

- [ ] **Step 6: Leaderboard**

From any tournament, navigate to the leaderboard.
- Rank 1/2/3 have gold/silver/bronze underline.
- Column reads `W-T-L`. Score 8-8 in a match → both players show a tie (not a loss).
- "Round Breakdown" row opens the per-round table.
- "Export CSV" produces a CSV in the share sheet.

- [ ] **Step 7: Three-dot menu**

Tap `…` in the tournament header. Verify all four items work:
- **Tournament Info** opens the formSheet with bullet summary; Export PDF triggers the share sheet.
- **Edit Tournament** opens formSheet; changing name + points-per-match persists.
- **Start Final Round** appends a round with `final: true` (trophy badge appears on the round pill).
- **Finish Tournament** locks scores; menu now offers "Reopen".

- [ ] **Step 8: Final commit (if anything tweaked during testing)**

```bash
git add -A
git status
git commit -m "chore: post-test cleanup" || true
```

---

## Self-review summary

**Spec coverage:**
- Mexicano correctness bugs (ties, rest-rank, repeat partners) → Tasks 2–4 (TDD).
- Tournament detail redesign → Tasks 5–8 (3 components + screen).
- Leaderboard polish + W-T-L → Task 9 (depends on Task 2).
- Round breakdown table → Task 10.
- CSV export → Task 11.
- Three-dot menu + Final/Finish → Task 12.
- Tournament Info + PDF export → Task 13.
- Edit Tournament → Task 14.
- Home month grouping + card redesign → Task 15.
- E2E verification → Task 16.

**Parallelizable groups (when running with subagent-driven-development):**
- Wave A: Tasks 1, 2, 3, 4 — Task 1 is small (deps + type field), the three TDD bugs touch different files (`tournaments.ts`, `scheduler.ts`); 2 vs 3+4 can run together.
- Wave B: Tasks 5, 6, 7 — three independent components.
- Wave C: Task 8 (consumes B) AND Task 15 (independent home screen) in parallel.
- Wave D: Tasks 9, 10, 11 — leaderboard polish + sub-screens; 9 depends on 2; 11 depends on 1, 9.
- Wave E: Task 12 (menu) — gates 13 and 14 routes.
- Wave F: Tasks 13, 14 — independent of each other, depend on 12.
- Wave G: Task 16 — manual.

**Placeholder/TODO scan:** None. All steps include the actual code or command. Reference URLs (Terms / Privacy) are unchanged from the prior plan and are not in scope here.

**Type consistency:**
- `Round.final?: boolean` introduced in Task 1, consumed in `RoundPillSelector` (Task 7), `generateFinalRound` (Task 12), and PDF export (Task 13).
- `Tournament.finishedAt?: number` introduced in Task 1, consumed in tournament detail (Task 8), three-dot menu (Task 12), and round-pill selector (Task 7 via `finished` prop).
- Standings stat shape (`won/tied/lost`) defined in Task 2, consumed in Task 9 (leaderboard) and Task 11 (CSV).
- `MenuItem` defined in Task 12, only used there.
- Scheduler signature unchanged: `generateNextRound`, `generateAmericanoRound`, `generateMexicanoRound` keep their existing arities; `generateFinalRound(t: Tournament): Round` is additive.

**Out of scope / deferred:**
- Real-time / push-based sync of remote score edits between devices (current refetch-on-foreground is sufficient).
- Localization of month names beyond `Intl.DateTimeFormat` (relies on device locale).
- Custom Product Pages / store listing copy.
- The seven other Settings/Profile follow-ups already shipped earlier today are not re-touched here.
