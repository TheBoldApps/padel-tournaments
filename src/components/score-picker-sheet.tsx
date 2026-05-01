import { colors } from "@/components/ui";
import {
  Alert,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  pointsPerMatch: number;
  currentScore: number | null;
  onPick: (score: number) => void;
  onReset: () => void;
};

export function ScorePickerSheet({
  visible,
  onClose,
  title,
  pointsPerMatch,
  currentScore,
  onPick,
  onReset,
}: Props) {
  const insets = useSafeAreaInsets();

  const handlePick = (n: number) => {
    onPick(n);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const handleCustom = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Enter score",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set",
            onPress: (v?: string) => {
              const n = Math.max(
                0,
                Math.min(pointsPerMatch, parseInt(v ?? "0", 10) || 0)
              );
              handlePick(n);
            },
          },
        ],
        "plain-text",
        currentScore == null ? "" : String(currentScore),
        "number-pad"
      );
    } else {
      Alert.alert("Custom score", "Tap a number above for now.");
    }
  };

  const cells = Array.from({ length: pointsPerMatch + 1 }, (_, i) => i);
  const resetDisabled = currentScore == null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.dragHandle} />
          <Text style={styles.title}>{title}</Text>

          <View style={styles.grid}>
            {cells.map((n) => {
              const selected = n === currentScore;
              return (
                <Pressable
                  key={n}
                  onPress={() => handlePick(n)}
                  style={({ pressed }) => [
                    styles.cell,
                    selected && { backgroundColor: colors.primary },
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color: selected
                          ? "#FFFFFF"
                          : (PlatformColor("label") as unknown as string),
                      },
                    ]}
                  >
                    {String(n).padStart(2, "0")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleCustom} style={styles.customBtn}>
            <Text style={styles.customText}>Enter Custom Score</Text>
          </Pressable>

          <Pressable
            onPress={resetDisabled ? undefined : handleReset}
            disabled={resetDisabled}
            style={[styles.resetBtn, { opacity: resetDisabled ? 0.4 : 1 }]}
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: PlatformColor("systemBackground") as unknown as string,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: "continuous",
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: PlatformColor("tertiaryLabel") as unknown as string,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    textAlign: "center",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  cell: {
    width: "18%",
    aspectRatio: 1,
    padding: 14,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: PlatformColor("systemBackground") as unknown as string,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  cellText: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  customBtn: {
    alignSelf: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  customText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  resetBtn: {
    backgroundColor: PlatformColor(
      "secondarySystemBackground"
    ) as unknown as string,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  resetText: {
    color: PlatformColor("label") as unknown as string,
    fontSize: 17,
    fontWeight: "600",
  },
});
