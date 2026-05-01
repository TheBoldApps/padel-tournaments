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
