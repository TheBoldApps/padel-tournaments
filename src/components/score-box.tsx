import {
  PlatformColor,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

type State = "neutral" | "winner" | "loser";

export function ScoreBox({
  value,
  onChange,
  state,
  max,
}: {
  value: number | null;
  onChange: (v: string) => void;
  state: State;
  max: number;
}) {
  const bg =
    state === "winner"
      ? "#3B6BFF"
      : state === "loser"
      ? "#9AA0A6"
      : (PlatformColor("secondarySystemBackground") as unknown as string);
  const fg =
    state === "neutral"
      ? (PlatformColor("label") as unknown as string)
      : "#FFFFFF";

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: bg, borderCurve: "continuous" },
      ]}
    >
      <TextInput
        value={value == null ? "" : String(value).padStart(2, "0")}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="––"
        placeholderTextColor={fg + "88"}
        maxLength={String(max).length}
        style={[styles.input, { color: fg }]}
      />
    </View>
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
  input: {
    fontSize: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
});
