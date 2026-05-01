import { useTheme } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

export const colors = {
  primary: "#0EA5A4",
  primaryDark: "#0B7C7B",
  accent: "#F59E0B",
  danger: "#EF4444",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { colors: tc } = useTheme();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.danger
      : variant === "ghost"
      ? "transparent"
      : tc.card;
  const fg = variant === "secondary" || variant === "ghost" ? tc.text : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: tc.border,
        },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors: tc } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tc.card, borderColor: tc.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: (color ?? colors.primary) + "22" }]}>
      <Text style={{ color: color ?? colors.primary, fontSize: 12, fontWeight: "600" }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "600", fontSize: 15 },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
