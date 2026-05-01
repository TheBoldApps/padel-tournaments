import { colors } from "@/components/ui";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

type State = "neutral" | "winner" | "loser";

export function ScoreBox({
  value,
  state,
  onPress,
  disabled,
}: {
  value: number | null;
  state: State;
  onPress: () => void;
  disabled?: boolean;
}) {
  const bg =
    state === "winner"
      ? colors.primary
      : state === "loser"
      ? (PlatformColor("tertiarySystemFill") as unknown as string)
      : (PlatformColor("secondarySystemBackground") as unknown as string);
  const fg =
    state === "winner"
      ? "#FFFFFF"
      : state === "loser"
      ? (PlatformColor("secondaryLabel") as unknown as string)
      : (PlatformColor("label") as unknown as string);

  const display = value == null ? "––" : String(value).padStart(2, "0");

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.box,
        {
          backgroundColor: bg,
          borderCurve: "continuous",
          transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.text, { color: fg }]}>{display}</Text>
    </Pressable>
  );
}

export function scoreState(
  a: number | null,
  b: number | null,
  side: "A" | "B"
): State {
  if (a == null || b == null) return "neutral";
  if (a === b) return "neutral";
  if (side === "A") return a > b ? "winner" : "loser";
  return b > a ? "winner" : "loser";
}

const styles = StyleSheet.create({
  box: {
    width: 64,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});
