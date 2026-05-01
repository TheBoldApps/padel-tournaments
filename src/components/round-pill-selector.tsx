import type { Round } from "@/store/tournaments";
import { Image } from "expo-image";
import {
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export function RoundPillSelector({
  rounds,
  selectedIndex,
  onSelect,
  onAdd,
  finished,
}: {
  rounds: Round[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  finished?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {rounds.map((r, idx) => {
        const complete = r.matches.every(
          (m) => m.scoreA != null && m.scoreB != null
        );
        const selected = idx === selectedIndex;
        return (
          <Pressable
            key={r.number}
            onPress={() => onSelect(idx)}
            style={[
              styles.pill,
              {
                backgroundColor: selected
                  ? (PlatformColor("systemBlue") as unknown as string) + "22"
                  : (PlatformColor("secondarySystemBackground") as unknown as string),
                borderColor: selected
                  ? (PlatformColor("systemBlue") as unknown as string)
                  : "transparent",
              },
            ]}
          >
            <Text style={styles.number}>{r.number}</Text>
            {complete && (
              <Image
                source="sf:checkmark"
                tintColor={"#22C55E"}
                style={{ width: 14, height: 14 }}
              />
            )}
            {r.final && (
              <Image
                source="sf:trophy.fill"
                tintColor={"#F2BF40"}
                style={{ width: 14, height: 14 }}
              />
            )}
          </Pressable>
        );
      })}
      {!finished && (
        <Pressable onPress={onAdd} style={[styles.pill, styles.addPill]}>
          <Image
            source="sf:plus"
            tintColor={PlatformColor("systemBlue") as unknown as string}
            style={{ width: 14, height: 14 }}
          />
          <Text style={styles.addText}>More</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1.5,
    minWidth: 56,
    justifyContent: "center",
  },
  number: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  addPill: { borderColor: "transparent" },
  addText: {
    fontSize: 15,
    fontWeight: "600",
    color: PlatformColor("systemBlue") as unknown as string,
  },
});
