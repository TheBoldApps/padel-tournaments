import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const HEIGHT = 56;
const SHIMMER_WIDTH = 120;

export function ShimmerFab({
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
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const shimmerX = useSharedValue(-SHIMMER_WIDTH * 2);

  useEffect(() => {
    // 0 → travel across → pause → repeat. Pause is the hero of "polish".
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(360, {
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
        }),
        withDelay(2200, withTiming(360, { duration: 0 })),
        withTiming(-SHIMMER_WIDTH * 2, { duration: 0 })
      ),
      -1,
      false
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { skewX: "-22deg" }],
  }));

  return (
    <View
      style={[
        styles.shadowWrap,
        {
          // On dark BGs the indigo shadow disappears — switch to a brighter
          // glow that's actually visible.
          shadowColor: isDark ? "#A5B4FC" : "#4F46E5",
          shadowOpacity: isDark ? 0.55 : 0.45,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        {/* Base colorful layer */}
        <View style={styles.baseColor} />
        {/* Top highlight — fakes a vertical gradient by stacking a translucent
            white band over the upper half of the button. */}
        <View style={styles.topHighlight} />
        {/* Bottom darken — same trick, deeper at the bottom for depth. */}
        <View style={styles.bottomShade} />
        {/* Animated shimmer */}
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmerBar, shimmerStyle]}
        />
        {/* Inner stroke — crisp edge highlight, very Apple-y. */}
        <View style={styles.innerStroke} pointerEvents="none" />
        {/* Content */}
        <View style={styles.content}>
          {useSymbol ? (
            <Image
              source={`sf:${icon}`}
              tintColor="#FFFFFF"
              style={{ width: 20, height: 20 }}
            />
          ) : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 999,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  button: {
    height: HEIGHT,
    borderRadius: 999,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 220,
  },
  baseColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#4338CA",
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEIGHT / 3,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  bottomShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HEIGHT / 2,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  shimmerBar: {
    position: "absolute",
    top: -10,
    bottom: -10,
    width: SHIMMER_WIDTH,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.30)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
});
