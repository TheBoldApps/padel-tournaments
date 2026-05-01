import { colors, formatColors } from "@/components/ui";
import type { Format } from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Alert,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepFormat() {
  const router = useRouter();
  const { format, setFormat } = useWizard();

  const showDiff = () =>
    Alert.alert(
      "Americano vs Mexicano",
      "Americano rotates partners on a fixed schedule so everyone plays with everyone.\n\nMexicano pairs players each round based on the current standings — the top scorers play together.",
      [{ text: "Got it" }]
    );

  return (
    <StepScreen step={2} onNext={() => router.push("/new/players")}>
      <Text style={styles.title}>Choose a format</Text>
      <Text style={styles.subtitle}>
        Pick how partners and matchups are decided each round.
      </Text>

      <FormatCard
        active={format === "americano"}
        kind="americano"
        symbol="arrow.triangle.2.circlepath"
        title="Americano"
        description="Rotate partners every round."
        bullets={["Rotates partners", "Everyone vs everyone"]}
        onPress={() => setFormat("americano")}
      />
      <FormatCard
        active={format === "mexicano"}
        kind="mexicano"
        symbol="trophy.fill"
        title="Mexicano"
        description="Pair players by current standings."
        bullets={["Top scorers play together", "Standings-driven"]}
        onPress={() => setFormat("mexicano")}
      />

      <Pressable onPress={showDiff} hitSlop={8} style={styles.diffLink}>
        <Text style={styles.diffText}>What's the difference?</Text>
      </Pressable>
    </StepScreen>
  );
}

function FormatCard({
  active,
  kind,
  symbol,
  title,
  description,
  bullets,
  onPress,
}: {
  active: boolean;
  kind: Format;
  symbol: string;
  title: string;
  description: string;
  bullets: string[];
  onPress: () => void;
}) {
  const useSymbol = process.env.EXPO_OS === "ios";
  const palette = formatColors[kind];
  // Try CSS-style gradient via experimental_backgroundImage; solid `deep` is
  // the visible fallback for older RN builds where the key is ignored.
  const gradient =
    kind === "americano"
      ? "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)"
      : "linear-gradient(135deg, #C2410C 0%, #F97316 100%)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.deep,
          // experimental_backgroundImage is honored on newer RN, ignored on
          // older versions which fall back to the solid `deep` color above.
          experimental_backgroundImage: gradient,
          transform: [{ scale: active ? 1 : 0.98 }],
          opacity: pressed ? 0.9 : active ? 1 : 0.88,
          borderWidth: active ? 3 : 0,
          borderColor: "#FFFFFF",
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        {useSymbol ? (
          <Image
            source={`sf:${symbol}`}
            tintColor="#FFFFFF"
            style={{ width: 40, height: 40 }}
          />
        ) : null}
      </View>

      <Text style={styles.cardDesc}>{description}</Text>

      <View style={styles.bulletRow}>
        {bullets.map((b, i) => (
          <View key={b} style={styles.bulletItem}>
            {i > 0 ? <Text style={styles.bulletSep}>·</Text> : null}
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>

      {active && useSymbol ? (
        <View style={styles.checkBadge}>
          <Image
            source="sf:checkmark"
            tintColor={palette.deep}
            style={{ width: 14, height: 14 }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: PlatformColor("label") as unknown as string,
  },
  subtitle: {
    fontSize: 15,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 8,
    marginBottom: 22,
  },
  card: {
    minHeight: 160,
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 20,
    marginBottom: 14,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
    paddingRight: 12,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 14,
  },
  bulletItem: { flexDirection: "row", alignItems: "center" },
  bulletText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  bulletSep: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginHorizontal: 8,
    fontWeight: "700",
  },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  diffLink: { alignSelf: "flex-start", paddingVertical: 6, marginTop: 4 },
  diffText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
});
