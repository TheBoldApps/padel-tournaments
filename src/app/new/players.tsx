import { Button, Card, colors } from "@/components/ui";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepPlayers() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { players, setPlayers } = useWizard();
  const [input, setInput] = useState("");

  const useSymbol = process.env.EXPO_OS === "ios";

  const add = () => {
    const n = input.trim();
    if (!n) return;
    if (players.includes(n)) return;
    setPlayers([...players, n]);
    setInput("");
  };

  const remove = (p: string) => setPlayers(players.filter((x) => x !== p));

  return (
    <StepScreen step={3} onNext={() => router.push("/new/review")}>
      <Text style={[styles.title, { color: tc.text }]}>Add players</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        4 minimum • {players.length} added
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          placeholder="Player name"
          placeholderTextColor={tc.text + "66"}
          returnKeyType="done"
          style={[
            styles.input,
            { color: tc.text, borderColor: tc.border, backgroundColor: tc.card, flex: 1 },
          ]}
        />
        <Button title="Add" onPress={add} variant="secondary" />
      </View>

      {players.length > 0 && (
        <Card glass style={{ marginTop: 12 }}>
          {players.map((p, i) => (
            <View
              key={p}
              style={[
                styles.row,
                {
                  borderBottomWidth:
                    i === players.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: tc.border,
                },
              ]}
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
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
