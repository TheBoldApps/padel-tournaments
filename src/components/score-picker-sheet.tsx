import { AdaptiveGlass, colors } from "@/components/ui";
import {
  Alert,
  Modal,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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

const COLS = 4;
const GAP = 10;
const SHEET_PAD_H = 20;
const MAX_CONTENT_WIDTH = 460;

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
  const { width: screenW } = useWindowDimensions();

  const contentWidth = Math.min(
    screenW - SHEET_PAD_H * 2,
    MAX_CONTENT_WIDTH
  );
  const cellSize = Math.floor((contentWidth - GAP * (COLS - 1)) / COLS);

  const handlePick = (n: number) => {
    onPick(n);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const handleCustom = () => {
    if (process.env.EXPO_OS === "ios") {
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

  const max = Math.min(30, pointsPerMatch);
  const cells = Array.from({ length: max + 1 }, (_, i) => i);
  const showCustomHint = pointsPerMatch > max;
  const resetDisabled = currentScore == null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <AdaptiveGlass
          style={{
            ...styles.sheet,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <Pressable onPress={() => {}} style={styles.sheetInner}>
            <View style={styles.dragHandle} />
            <View style={[styles.content, { width: contentWidth }]}>
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
                        { width: cellSize, height: cellSize },
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
              {showCustomHint ? (
                <Text style={styles.customHint}>
                  Tap &quot;Enter Custom Score&quot; for higher values.
                </Text>
              ) : null}

              <Pressable
                onPress={resetDisabled ? undefined : handleReset}
                disabled={resetDisabled}
                style={[styles.resetBtn, { opacity: resetDisabled ? 0.4 : 1 }]}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>
          </Pressable>
        </AdaptiveGlass>
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
    backgroundColor: undefined,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: "continuous",
    paddingTop: 12,
    paddingHorizontal: SHEET_PAD_H,
  },
  sheetInner: {
    alignItems: "center",
  },
  content: {
    alignSelf: "center",
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: PlatformColor("tertiaryLabel") as unknown as string,
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
    gap: GAP,
    justifyContent: "flex-start",
  },
  cell: {
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
  customHint: {
    fontSize: 12,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 8,
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
