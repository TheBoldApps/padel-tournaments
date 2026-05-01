import { Button, Card, Pill, colors } from "@/components/ui";
import { generateNextRound } from "@/lib/scheduler";
import { Match, updateTournament, useTournaments } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const { colors: tc } = useTheme();
  const router = useRouter();

  if (!t) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: tc.text }}>Tournament not found.</Text>
      </View>
    );
  }

  const addRound = () => {
    const round = generateNextRound(t);
    updateTournament(t.id, (cur) => ({ ...cur, rounds: [...cur.rounds, round] }));
  };

  const setScore = (
    roundIdx: number,
    matchIdx: number,
    side: "A" | "B",
    value: string
  ) => {
    const num = value === "" ? null : Math.max(0, Math.min(t.pointsPerMatch, Number(value) || 0));
    updateTournament(t.id, (cur) => {
      const rounds = cur.rounds.map((r, ri) => {
        if (ri !== roundIdx) return r;
        const matches = r.matches.map((m, mi) => {
          if (mi !== matchIdx) return m;
          const next: Match = { ...m };
          if (side === "A") {
            next.scoreA = num;
            if (num != null) next.scoreB = cur.pointsPerMatch - num;
          } else {
            next.scoreB = num;
            if (num != null) next.scoreA = cur.pointsPerMatch - num;
          }
          return next;
        });
        return { ...r, matches };
      });
      return { ...cur, rounds };
    });
  };

  const removeLastRound = () => {
    updateTournament(t.id, (cur) => ({ ...cur, rounds: cur.rounds.slice(0, -1) }));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[styles.title, { color: tc.text }]}>{t.name}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <Pill
          text={t.format === "americano" ? "Americano" : "Mexicano"}
          color={t.format === "americano" ? colors.primary : colors.accent}
        />
        <Pill text={`${t.players.length} players`} color="#6366F1" />
        <Pill text={`${t.pointsPerMatch} pts/match`} color="#10B981" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Button title="+ New Round" onPress={addRound} style={{ flex: 1 }} />
        <Button
          title="Standings"
          variant="secondary"
          onPress={() => router.push(`/${t.id}/standings`)}
          style={{ flex: 1 }}
        />
      </View>

      {t.rounds.length === 0 && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: tc.text, fontSize: 16, fontWeight: "600" }}>
            No rounds yet
          </Text>
          <Text style={{ color: tc.text, opacity: 0.7, marginTop: 4 }}>
            Tap "New Round" to generate the first matchups.
          </Text>
        </Card>
      )}

      {[...t.rounds].reverse().map((round, ri) => {
        const realIdx = t.rounds.length - 1 - ri;
        return (
          <View key={round.number} style={{ marginTop: 18 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.section, { color: tc.text }]}>Round {round.number}</Text>
              {realIdx === t.rounds.length - 1 && (
                <Pressable onPress={removeLastRound} hitSlop={10}>
                  <Text style={{ color: colors.danger, fontWeight: "600" }}>Remove</Text>
                </Pressable>
              )}
            </View>
            {round.matches.map((m, mi) => (
              <Card key={mi}>
                <Text style={{ color: tc.text, opacity: 0.6, fontSize: 12, fontWeight: "600" }}>
                  COURT {m.court}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tc.text, fontWeight: "600" }}>
                      {m.teamA[0]} & {m.teamA[1]}
                    </Text>
                  </View>
                  <ScoreInput
                    value={m.scoreA}
                    max={t.pointsPerMatch}
                    onChange={(v) => setScore(realIdx, mi, "A", v)}
                  />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tc.text, fontWeight: "600" }}>
                      {m.teamB[0]} & {m.teamB[1]}
                    </Text>
                  </View>
                  <ScoreInput
                    value={m.scoreB}
                    max={t.pointsPerMatch}
                    onChange={(v) => setScore(realIdx, mi, "B", v)}
                  />
                </View>
              </Card>
            ))}
            {round.resting.length > 0 && (
              <Text style={{ color: tc.text, opacity: 0.6, marginTop: 4 }}>
                Resting: {round.resting.join(", ")}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function ScoreInput({
  value,
  max,
  onChange,
}: {
  value: number | null;
  max: number;
  onChange: (s: string) => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <TextInput
      value={value == null ? "" : String(value)}
      onChangeText={onChange}
      keyboardType="number-pad"
      placeholder="–"
      placeholderTextColor={tc.text + "55"}
      maxLength={String(max).length}
      style={{
        width: 60,
        textAlign: "center",
        borderWidth: 1,
        borderColor: tc.border,
        borderRadius: 8,
        padding: 8,
        color: tc.text,
        fontSize: 18,
        fontWeight: "700",
      }}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  section: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
});
