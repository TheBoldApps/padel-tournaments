import { AdaptiveGlass, colors, formatColors } from "@/components/ui";
import { createTournament } from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepReview() {
  const router = useRouter();
  const { name, format, points, players, setPoints, isStepValid } = useWizard();
  const useSymbol = process.env.EXPO_OS === "ios";
  const palette = formatColors[format];

  const formatLabel = format === "americano" ? "Americano" : "Mexicano";
  const symbol =
    format === "americano" ? "arrow.triangle.2.circlepath" : "trophy.fill";

  const ptsNum = Math.max(1, Math.floor(Number(points) || 0));
  // Rough rounds estimate: with N players in groups of 4, americano runs
  // ~N-1 rounds; mexicano typical event is ~N rounds. Keep "estimated".
  const roundsEstimate =
    players.length >= 4
      ? Math.max(
          1,
          format === "americano" ? players.length - 1 : players.length
        )
      : 0;

  const create = () => {
    if (!isStepValid(4)) return;
    const t = createTournament({
      name: name.trim(),
      format,
      pointsPerMatch: ptsNum,
      players,
    });
    router.dismissTo(`/${t.id}`);
  };

  return (
    <StepScreen step={4} onNext={create} nextLabel="Create Tournament">
      <View style={[styles.hero, { backgroundColor: palette.soft }]}>
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroName, { color: palette.text }]}>
            {name.trim() || "Your tournament"}
          </Text>
          <View style={[styles.formatPill, { backgroundColor: palette.deep }]}>
            {useSymbol ? (
              <Image
                source={`sf:${symbol}`}
                tintColor="#FFFFFF"
                style={{ width: 12, height: 12 }}
              />
            ) : null}
            <Text style={styles.formatPillText}>{formatLabel}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.deep + "33" }]} />

        <Text style={[styles.heroStats, { color: palette.text }]}>
          {`${players.length} Players  ·  ${ptsNum} pts/match  ·  ~${roundsEstimate} rounds`}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Match settings</Text>
      <AdaptiveGlass style={styles.settingsCard}>
        <Text style={styles.settingsLabel}>Points per match</Text>
        <TextInput
          value={points}
          onChangeText={setPoints}
          keyboardType="number-pad"
          style={styles.pointsInput}
        />
        <Text style={styles.settingsHelper}>
          Total points distributed each match (e.g. 24 means team A + team B
          scores add up to 24).
        </Text>
      </AdaptiveGlass>

      <Text style={styles.sectionLabel}>Review</Text>
      <AdaptiveGlass style={styles.reviewCard}>
        <SummaryRow
          label="Name"
          value={name.trim() || "—"}
          onEdit={() => router.dismissTo("/new")}
        />
        <Divider />
        <SummaryRow
          label="Format"
          value={formatLabel}
          onEdit={() => router.dismissTo("/new/format")}
        />
        <Divider />
        <SummaryRow
          label="Players"
          value={`${players.length}`}
          onEdit={() => router.dismissTo("/new/players")}
        />
      </AdaptiveGlass>
    </StepScreen>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={10}>
        <Text style={styles.editLink}>Edit</Text>
      </Pressable>
    </View>
  );
}

function Divider() {
  return <View style={styles.summaryDivider} />;
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 22,
    marginBottom: 22,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
  },
  formatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  formatPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: { height: 1, marginVertical: 14 },
  heroStats: { fontSize: 15, fontWeight: "600" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 22,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 4,
  },
  pointsInput: {
    fontSize: 28,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
    paddingVertical: 4,
  },
  settingsHelper: {
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 4,
  },
  reviewCard: {
    borderRadius: 18,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    marginTop: 2,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
  },
  editLink: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
