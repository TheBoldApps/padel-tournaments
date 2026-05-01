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

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
              `<p>Court ${m.court}: ${m.teamA.map(esc).join(" & ")} <b>${m.scoreA ?? "–"}</b> vs <b>${m.scoreB ?? "–"}</b> ${m.teamB.map(esc).join(" & ")}</p>`
          )
          .join("") +
        (r.resting.length ? `<p><i>Resting: ${r.resting.map(esc).join(", ")}</i></p>` : "")
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t.name)}</title>
    <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;}
    h1{margin:0 0 4px}h3{margin-top:18px}p{margin:4px 0}</style></head>
    <body><h1>${esc(t.name)}</h1><p>${esc(t.format)} · ${t.players.length} players · ${t.pointsPerMatch} pts/match</p>${rows}</body></html>`;
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
