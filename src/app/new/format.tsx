import { colors } from "@/components/ui";
import type { Format } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PlatformColor, Pressable, StyleSheet, Text, View } from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepFormat() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { format, setFormat } = useWizard();

  return (
    <StepScreen step={2} onNext={() => router.push("/new/players")}>
      <Text style={[styles.title, { color: tc.text }]}>Choose a format</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        You can change scoring rules in the next step.
      </Text>

      <FormatCard
        active={format === "americano"}
        symbol="arrow.triangle.2.circlepath"
        title="Americano"
        description="Rotate partners every round. Everyone plays with everyone."
        onPress={() => setFormat("americano")}
      />
      <FormatCard
        active={format === "mexicano"}
        symbol="trophy"
        title="Mexicano"
        description="Pair players by current standings each round."
        onPress={() => setFormat("mexicano")}
      />
    </StepScreen>
  );
}

function FormatCard({
  active,
  symbol,
  title,
  description,
  onPress,
}: {
  active: boolean;
  symbol: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { colors: tc } = useTheme();
  const useSymbol = process.env.EXPO_OS === "ios";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: active ? colors.primary : tc.border,
          backgroundColor: active ? colors.primary + "15" : tc.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        {useSymbol ? (
          <Image
            source={`sf:${symbol}`}
            tintColor={
              active ? colors.primary : (PlatformColor("label") as unknown as string)
            }
            style={{ width: 28, height: 28 }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardTitle,
              { color: active ? colors.primary : tc.text },
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.cardDesc, { color: tc.text }]}>{description}</Text>
        </View>
        {active && useSymbol ? (
          <Image
            source="sf:checkmark.circle.fill"
            tintColor={colors.primary}
            style={{ width: 22, height: 22 }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  card: {
    borderWidth: 2,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardDesc: { fontSize: 13, opacity: 0.75, marginTop: 2 },
});
