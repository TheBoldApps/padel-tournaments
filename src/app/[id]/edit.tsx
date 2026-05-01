import { Button, AdaptiveGlass } from "@/components/ui";
import { updateTournament, useTournaments } from "@/store/tournaments";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function EditTournament() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const [name, setName] = useState(t?.name ?? "");
  const [pts, setPts] = useState(String(t?.pointsPerMatch ?? 24));

  if (!t) return null;

  const save = () => {
    const ptsNum = Math.max(1, Math.min(99, Number(pts) || t.pointsPerMatch));
    if (!name.trim()) {
      Alert.alert("Name is required");
      return;
    }
    updateTournament(t.id, (cur) => ({
      ...cur,
      name: name.trim(),
      pointsPerMatch: ptsNum,
    }));
    if (router.canGoBack()) router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <AdaptiveGlass style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tournament name"
          placeholderTextColor={
            PlatformColor("placeholderText") as unknown as string
          }
          style={styles.input}
        />
      </AdaptiveGlass>

      <AdaptiveGlass style={StyleSheet.flatten([styles.card, { marginTop: 16 }])}>
        <Text style={styles.label}>Points per match</Text>
        <TextInput
          value={pts}
          onChangeText={setPts}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.input}
        />
      </AdaptiveGlass>

      <View style={{ marginTop: 24 }}>
        <Button title="Save" onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderCurve: "continuous" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 6,
  },
  input: {
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
    paddingVertical: 4,
  },
});
