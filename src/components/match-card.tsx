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
  pointsPerMatch: _pointsPerMatch,
  onPickA,
  onPickB,
  disabled,
}: {
  match: MatchVM;
  pointsPerMatch: number;
  onPickA: () => void;
  onPickB: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.scoreRow}>
        <ScoreBox
          value={match.scoreA}
          onPress={disabled ? () => {} : onPickA}
          state={scoreState(match.scoreA, match.scoreB, "A")}
          disabled={disabled}
        />
        <ScoreBox
          value={match.scoreB}
          onPress={disabled ? () => {} : onPickB}
          state={scoreState(match.scoreA, match.scoreB, "B")}
          disabled={disabled}
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
