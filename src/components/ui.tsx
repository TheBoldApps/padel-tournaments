import { useTheme } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export const colors = {
  primary: "#14B8A6",
  primaryDark: "#0F766E",
  accent: "#F97316",
  accentDark: "#C2410C",
  danger: "#EF4444",
  success: "#22C55E",
  blue: "#3B82F6",
  indigo: "#6366F1",
  purple: "#8B5CF6",
  pink: "#EC4899",
  amber: "#F59E0B",
};

export const formatColors = {
  americano: { tint: "#14B8A6", soft: "#CCFBF1", deep: "#0F766E", text: "#134E4A" },
  mexicano: { tint: "#F97316", soft: "#FFEDD5", deep: "#C2410C", text: "#7C2D12" },
} as const;

export function AdaptiveGlass({
  children,
  style,
  isInteractive,
  tint = "systemMaterial",
  intensity = 80,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  isInteractive?: boolean;
  tint?: React.ComponentProps<typeof BlurView>["tint"];
  intensity?: number;
}) {
  if (process.env.EXPO_OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive={isInteractive} style={style}>
        {children}
      </GlassView>
    );
  }
  if (process.env.EXPO_OS === "ios") {
    return (
      <BlurView
        tint={tint}
        intensity={intensity}
        style={[{ overflow: "hidden" }, style]}
      >
        {children}
      </BlurView>
    );
  }
  // Android / web fallback — translucent material-ish surface
  return (
    <View
      style={[
        { backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

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
          borderCurve: "continuous",
        },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function GlassFab({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const useSymbol = process.env.EXPO_OS === "ios";
  return (
    <AdaptiveGlass
      isInteractive
      style={{
        borderRadius: 28,
        borderCurve: "continuous",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 22,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {useSymbol ? (
          <Image
            source={`sf:${icon}`}
            tintColor={PlatformColor("label") as unknown as string}
            style={{ width: 20, height: 20 }}
          />
        ) : null}
        <Text
          style={{
            color: PlatformColor("label") as unknown as string,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Pressable>
    </AdaptiveGlass>
  );
}

export function Card({
  children,
  style,
  glass,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  glass?: boolean;
}) {
  const { colors: tc } = useTheme();
  if (glass) {
    return (
      <AdaptiveGlass
        style={StyleSheet.flatten([
          styles.card,
          { borderColor: tc.border, borderCurve: "continuous" as const },
          style,
        ])}
      >
        {children}
      </AdaptiveGlass>
    );
  }
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tc.card,
          borderColor: tc.border,
          borderCurve: "continuous",
        },
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "600", fontSize: 15 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
