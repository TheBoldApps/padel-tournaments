import { Button, Card, colors } from "@/components/ui";
import { Format, createTournament } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function NewTournament() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("americano");
  const [points, setPoints] = useState("24");
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<string[]>([]);

  const useSymbol = process.env.EXPO_OS === "ios";

  const addPlayer = () => {
    const n = playerInput.trim();
    if (!n) return;
    if (players.includes(n)) return;
    setPlayers([...players, n]);
    setPlayerInput("");
  };

  const remove = (p: string) => setPlayers(players.filter((x) => x !== p));

  const pointsInt = Math.floor(Number(points));
  const canCreate =
    name.trim().length > 0 && players.length >= 4 && Number.isFinite(pointsInt) && pointsInt > 0;

  const create = () => {
    if (!canCreate) return;
    const t = createTournament({
      name: name.trim(),
      format,
      pointsPerMatch: pointsInt,
      players,
    });
    router.replace(`/${t.id}`);
  };

  const inputStyle = [
    styles.input,
    {
      color: tc.text,
      borderColor: tc.border,
      backgroundColor: tc.card,
      borderCurve: "continuous" as const,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >
        <Text style={[styles.label, { color: tc.text }]}>Tournament name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Friday night padel"
          placeholderTextColor={tc.text + "66"}
          style={inputStyle}
        />

        <Text style={[styles.label, { color: tc.text }]}>Format</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <FormatChip
            active={format === "americano"}
            label="Americano"
            sub="Rotate partners"
            onPress={() => setFormat("americano")}
          />
          <FormatChip
            active={format === "mexicano"}
            label="Mexicano"
            sub="By standings"
            onPress={() => setFormat("mexicano")}
          />
        </View>

        <Text style={[styles.label, { color: tc.text }]}>Points per match</Text>
        <TextInput
          value={points}
          onChangeText={setPoints}
          keyboardType="number-pad"
          style={inputStyle}
        />
        <Text style={{ color: tc.text, opacity: 0.6, fontSize: 12, marginTop: 4 }}>
          Total points distributed each match (e.g. 24 → team A score + team B score = 24)
        </Text>

        <Text style={[styles.label, { color: tc.text }]}>
          Players ({players.length})
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={playerInput}
            onChangeText={setPlayerInput}
            onSubmitEditing={addPlayer}
            placeholder="Player name"
            placeholderTextColor={tc.text + "66"}
            style={[inputStyle, { flex: 1 }]}
          />
          <Button title="Add" onPress={addPlayer} variant="secondary" />
        </View>
        {players.length > 0 && (
          <Card glass style={{ marginTop: 10 }}>
            {players.map((p, i) => (
              <View
                key={p}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderBottomWidth: i === players.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: tc.border,
                }}
              >
                <Text style={{ color: tc.text, fontSize: 16 }}>
                  {i + 1}. {p}
                </Text>
                <Pressable onPress={() => remove(p)} hitSlop={10}>
                  {useSymbol ? (
                    <Image
                      source="sf:minus.circle.fill"
                      tintColor={colors.danger}
                      style={{ width: 22, height: 22 }}
                    />
                  ) : (
                    <Text style={{ color: colors.danger }}>Remove</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        {players.length > 0 && players.length < 4 && (
          <Text style={{ color: colors.danger, marginTop: 8 }}>
            Need at least 4 players.
          </Text>
        )}
        {players.length >= 4 && players.length % 4 !== 0 && (
          <Text style={{ color: colors.accent, marginTop: 8 }}>
            With {players.length} players, {players.length % 4} will rest each round.
          </Text>
        )}

        <Button
          title="Create Tournament"
          onPress={create}
          disabled={!canCreate}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormatChip({
  active,
  label,
  sub,
  onPress,
}: {
  active: boolean;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 14,
        borderCurve: "continuous",
        borderWidth: 2,
        borderColor: active ? colors.primary : tc.border,
        backgroundColor: active ? colors.primary + "15" : tc.card,
      }}
    >
      <Text
        style={{
          color: active ? colors.primary : (PlatformColor("label") as unknown as string),
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
      <Text style={{ color: tc.text, opacity: 0.7, fontSize: 12, marginTop: 2 }}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
});
