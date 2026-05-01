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
