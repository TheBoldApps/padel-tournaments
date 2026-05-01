import { AdaptiveGlass } from "@/components/ui";
import { Image } from "expo-image";
import {
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

export function MenuSheet({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrap} onStartShouldSetResponder={() => true}>
          <AdaptiveGlass style={styles.sheet}>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)", justifyContent: "flex-start" },
  sheetWrap: { marginTop: 90, marginRight: 12, alignSelf: "flex-end", width: 240 },
  sheet: {
    borderRadius: 14,
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
});
