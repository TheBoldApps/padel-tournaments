import { AdaptiveGlass } from "@/components/ui";
import { Image } from "expo-image";
import {
  Dimensions,
  Modal,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type MenuItem = {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
};

const ANCHORED_WIDTH = 240;
const ANCHORED_ROW_HEIGHT = 52;
const ANCHORED_TITLE_HEIGHT = 38;
const ANCHORED_SIDE_INSET = 12;

export function MenuSheet({
  visible,
  onClose,
  items,
  title,
  placement = "topRight",
  anchorY,
}: {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  title?: string;
  placement?: "topRight" | "center" | "anchored";
  /** Window-Y coordinate (e.g. `pageY` from a press event) — used for `anchored` placement. */
  anchorY?: number;
}) {
  const isCenter = placement === "center";
  const isAnchored = placement === "anchored" && anchorY != null;

  let anchoredStyle: { top: number; right: number } | null = null;
  if (isAnchored) {
    const screenH = Dimensions.get("window").height;
    const estimatedHeight =
      items.length * ANCHORED_ROW_HEIGHT + (title ? ANCHORED_TITLE_HEIGHT : 0);
    const desiredTop = anchorY! - estimatedHeight / 2;
    const top = Math.max(
      60,
      Math.min(desiredTop, screenH - estimatedHeight - 40)
    );
    anchoredStyle = { top, right: ANCHORED_SIDE_INSET };
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[
          styles.backdrop,
          {
            justifyContent: isCenter ? "center" : "flex-start",
            backgroundColor:
              isCenter || isAnchored
                ? "rgba(0,0,0,0.25)"
                : "rgba(0,0,0,0.15)",
          },
        ]}
        onPress={onClose}
      >
        <View
          style={[
            isCenter
              ? styles.centerWrap
              : isAnchored
              ? [styles.anchoredWrap, anchoredStyle]
              : styles.topRightWrap,
          ]}
          onStartShouldSetResponder={() => true}
        >
          <AdaptiveGlass style={styles.sheet}>
            {title ? (
              <View style={[styles.titleRow, styles.rowBorder]}>
                <Text numberOfLines={1} style={styles.titleText}>
                  {title}
                </Text>
              </View>
            ) : null}
            {items.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  setTimeout(item.onPress, 0);
                }}
                style={({ pressed }) => [
                  styles.row,
                  i !== items.length - 1 && styles.rowBorder,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Image
                  source={`sf:${item.icon}`}
                  tintColor={
                    (item.destructive
                      ? PlatformColor("systemRed")
                      : PlatformColor("label")) as unknown as string
                  }
                  style={{ width: 18, height: 18 }}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: item.destructive
                        ? (PlatformColor("systemRed") as unknown as string)
                        : (PlatformColor("label") as unknown as string),
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </AdaptiveGlass>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  topRightWrap: {
    marginTop: 90,
    marginRight: 12,
    alignSelf: "flex-end",
    width: 240,
  },
  centerWrap: {
    alignSelf: "center",
    width: 280,
  },
  anchoredWrap: {
    position: "absolute",
    width: ANCHORED_WIDTH,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  sheet: {
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  rowBorder: {
    borderBottomColor: PlatformColor("separator") as unknown as string,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16, fontWeight: "500" },
  titleRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  titleText: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
