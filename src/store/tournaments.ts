import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export type Format = "americano" | "mexicano";

export type SortBy = "points" | "wins" | "winRatio";

export type Match = {
  court: number;
  teamA: string[];
  teamB: string[];
  scoreA: number | null;
  scoreB: number | null;
};

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
  /** Leaderboard sort key. Default: "points". */
  sortBy?: SortBy;
  /** Override auto courts (else floor(players/4)). Defaults to undefined. */
  courtsCount?: number;
  /** Per-round compensation for resting players. Default 0. */
  sitOutPoints?: number;
  /** Round timer duration in seconds (0 = off). */
  roundTimerSeconds?: number;
  /** Extra points awarded to each winner of a match. Default 0. */
  winBonus?: number;
  /** Extra points awarded to both teams in a tied match. Default 0. */
  drawBonus?: number;
};

type State = { tournaments: Tournament[] };

let state: State = { tournaments: [] };
let hydrated = false;
const listeners = new Set<() => void>();

const STORAGE_KEY = "padel-tournaments-v1";

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw) {
      try {
        const persisted: State = JSON.parse(raw);
        const fixed = persisted.tournaments.map((t) => ({
          ...t,
          updatedAt: (t as any).updatedAt ?? t.createdAt,
        }));
        const seen = new Set(state.tournaments.map((t) => t.id));
        const merged = [
          ...state.tournaments,
          ...fixed.filter((t) => !seen.has(t.id)),
        ];
        state = { tournaments: merged };
      } catch {}
    }
    hydrated = true;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    listeners.forEach((l) => l());
  })
  .catch(() => {
    hydrated = true;
  });

export type Change =
  | { kind: "upsert"; tournament: Tournament }
  | { kind: "delete"; id: string };

const changeListeners = new Set<(c: Change) => void>();

export function onTournamentChange(fn: (c: Change) => void) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function replaceAllTournaments(next: Tournament[]) {
  setState({ tournaments: next });
}

export function applyRemoteUpsert(t: Tournament) {
  const exists = state.tournaments.some((x) => x.id === t.id);
  setState({
    tournaments: exists
      ? state.tournaments.map((x) => (x.id === t.id ? t : x))
      : [t, ...state.tournaments],
  });
}

export function applyRemoteDelete(id: string) {
  setState({ tournaments: state.tournaments.filter((t) => t.id !== id) });
}

function setState(next: State) {
  state = next;
  if (hydrated) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }
  listeners.forEach((l) => l());
}

const store = {
  getSnapshot: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useTournaments() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function getTournament(id: string) {
  return state.tournaments.find((t) => t.id === id);
}

export function createTournament(input: {
  name: string;
  format: Format;
  pointsPerMatch: number;
  players: string[];
}): Tournament {
  const now = Date.now();
  const t: Tournament = {
    id: Math.random().toString(36).slice(2, 10),
    name: input.name,
    format: input.format,
    pointsPerMatch: input.pointsPerMatch,
    players: input.players,
    rounds: [],
    createdAt: now,
    updatedAt: now,
  };
  setState({ tournaments: [t, ...state.tournaments] });
  changeListeners.forEach((l) => l({ kind: "upsert", tournament: t }));
  return t;
}

export function deleteTournament(id: string) {
  setState({ tournaments: state.tournaments.filter((t) => t.id !== id) });
  changeListeners.forEach((l) => l({ kind: "delete", id }));
}

export function updateTournament(id: string, fn: (t: Tournament) => Tournament) {
  let next: Tournament | undefined;
  setState({
    tournaments: state.tournaments.map((t) => {
      if (t.id !== id) return t;
      next = { ...fn(t), updatedAt: Date.now() };
      return next;
    }),
  });
  if (next) changeListeners.forEach((l) => l({ kind: "upsert", tournament: next! }));
}

export function playerStandings(t: Tournament) {
  const winBonus = t.winBonus ?? 0;
  const drawBonus = t.drawBonus ?? 0;
  const sitOut = t.sitOutPoints ?? 0;
  const sortBy: SortBy = t.sortBy ?? "points";

  type Stat = {
    player: string;
    points: number;
    played: number;
    won: number;
    tied: number;
    lost: number;
    diff: number;
  };

  const stats: Record<string, Stat> = {};
  for (const p of t.players) {
    stats[p] = { player: p, points: 0, played: 0, won: 0, tied: 0, lost: 0, diff: 0 };
  }

  for (const r of t.rounds) {
    // Sit-out compensation: award `sitOut` points to every resting player
    // for every round (counts even if no matches were scored).
    if (sitOut > 0) {
      for (const p of r.resting) {
        if (stats[p]) stats[p].points += sitOut;
      }
    }
    for (const m of r.matches) {
      if (m.scoreA == null || m.scoreB == null) continue;
      const aWin = m.scoreA > m.scoreB;
      const bWin = m.scoreB > m.scoreA;
      const tie = m.scoreA === m.scoreB;
      for (const p of m.teamA) {
        if (!stats[p]) continue;
        stats[p].points += m.scoreA + (aWin ? winBonus : tie ? drawBonus : 0);
        stats[p].played += 1;
        stats[p].diff += m.scoreA - m.scoreB;
        if (aWin) stats[p].won += 1;
        else if (tie) stats[p].tied += 1;
        else stats[p].lost += 1;
      }
      for (const p of m.teamB) {
        if (!stats[p]) continue;
        stats[p].points += m.scoreB + (bWin ? winBonus : tie ? drawBonus : 0);
        stats[p].played += 1;
        stats[p].diff += m.scoreB - m.scoreA;
        if (bWin) stats[p].won += 1;
        else if (tie) stats[p].tied += 1;
        else stats[p].lost += 1;
      }
    }
  }

  const arr = Object.values(stats);
  if (sortBy === "wins") {
    arr.sort((a, b) => b.won - a.won || b.points - a.points || b.diff - a.diff);
  } else if (sortBy === "winRatio") {
    const ratio = (s: Stat) => (s.played === 0 ? 0 : s.won / s.played);
    arr.sort((a, b) => ratio(b) - ratio(a) || b.won - a.won || b.points - a.points);
  } else {
    arr.sort((a, b) => b.points - a.points || b.diff - a.diff || b.won - a.won);
  }
  return arr;
}
