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
