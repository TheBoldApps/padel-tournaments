import { AdaptiveGlass, colors, formatColors } from "@/components/ui";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepPlayers() {
  const router = useRouter();
  const { players, setPlayers, format } = useWizard();
  const [input, setInput] = useState("");

  const useSymbol = process.env.EXPO_OS === "ios";
  const palette = formatColors[format];

  const count = players.length;
  const isFull = count >= 4 && count % 4 === 0;
  const isPartial = count >= 4 && count % 4 !== 0;
  const heroColor = isFull
    ? colors.success
    : isPartial
    ? colors.amber
    : colors.danger;

  const heroSubtitle = isFull
    ? "Perfect — full courts every round."
    : isPartial
    ? `${count % 4} will rest each round.`
    : count === 0
    ? "Add at least 4 players to continue."
    : `${4 - count} more to start.`;

  const add = () => {
    const n = input.trim();
    if (!n) return;
    if (players.includes(n)) return;
    setPlayers([...players, n]);
    setInput("");
  };

  const remove = (p: string) => setPlayers(players.filter((x) => x !== p));

  return (
    <StepScreen step={3} onNext={() => router.push("/new/review")}>
      <Text style={styles.title}>Add players</Text>
      <Text style={styles.subtitle}>
        Padel runs on courts of 4 — multiples of 4 fill all courts.
      </Text>

      <AdaptiveGlass style={styles.heroCard}>
        <Text style={[styles.heroNumber, { color: heroColor }]}>{count}</Text>
        <Text style={styles.heroLabel}>
          {count === 1 ? "player" : "players"}
        </Text>
        <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
      </AdaptiveGlass>

      <AdaptiveGlass style={styles.inputCard}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          placeholder="Player name"
          placeholderTextColor={
            PlatformColor("placeholderText") as unknown as string
          }
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable
          onPress={add}
          disabled={!input.trim()}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              opacity: !input.trim() ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
          hitSlop={6}
        >
          {useSymbol ? (
            <Image
              source="sf:plus"
              tintColor="#FFFFFF"
              style={{ width: 18, height: 18 }}
            />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>+</Text>
          )}
        </Pressable>
      </AdaptiveGlass>

      {players.length > 0 ? (
        <View style={styles.chipWrap}>
          {players.map((p, i) => (
            <View
              key={p}
              style={[styles.chip, { backgroundColor: palette.soft }]}
            >
              <Text style={[styles.chipText, { color: palette.text }]}>
                <Text style={styles.chipIndex}>{i + 1}</Text>
                {`  ${p}`}
              </Text>
              <Pressable
                onPress={() => remove(p)}
                hitSlop={8}
                style={styles.chipClose}
              >
                {useSymbol ? (
                  <Image
                    source="sf:xmark"
                    tintColor={palette.text}
                    style={{ width: 11, height: 11 }}
                  />
                ) : (
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    ×
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </StepScreen>
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
    marginBottom: 18,
  },
  heroCard: {
    borderRadius: 24,
    borderCurve: "continuous",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 78,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 10,
    textAlign: "center",
  },
  inputCard: {
    borderRadius: 18,
    borderCurve: "continuous",
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    paddingVertical: 14,
    color: PlatformColor("label") as unknown as string,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
  },
  chipText: { fontSize: 15, fontWeight: "600" },
  chipIndex: { fontWeight: "800", opacity: 0.6 },
  chipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
});
