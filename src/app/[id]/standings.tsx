import { Card } from "@/components/ui";
import { getTournament, playerStandings, useTournaments } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Standings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useTournaments();
  const t = useMemo(() => getTournament(id), [id, useTournaments()]);
  const { colors: tc } = useTheme();

  if (!t) return null;
  const standings = playerStandings(t);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={[styles.title, { color: tc.text }]}>{t.name}</Text>
      <Text style={{ color: tc.text, opacity: 0.6, marginBottom: 12 }}>
        After {t.rounds.length} round{t.rounds.length === 1 ? "" : "s"}
      </Text>

      <Card>
        <View style={[styles.row, { borderBottomColor: tc.border, borderBottomWidth: 1 }]}>
          <Text style={[styles.rank, { color: tc.text, opacity: 0.6 }]}>#</Text>
          <Text style={[styles.name, { color: tc.text, opacity: 0.6 }]}>Player</Text>
          <Text style={[styles.cell, { color: tc.text, opacity: 0.6 }]}>P</Text>
          <Text style={[styles.cell, { color: tc.text, opacity: 0.6 }]}>W</Text>
          <Text style={[styles.cell, { color: tc.text, opacity: 0.6 }]}>+/-</Text>
          <Text style={[styles.cell, { color: tc.text, opacity: 0.6, fontWeight: "700" }]}>
            Pts
          </Text>
        </View>
        {standings.map((s, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
          return (
            <View
              key={s.player}
              style={[
                styles.row,
                {
                  borderBottomColor: tc.border,
                  borderBottomWidth: i === standings.length - 1 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.rank, { color: tc.text }]}>
                {medal || i + 1}
              </Text>
              <Text style={[styles.name, { color: tc.text }]} numberOfLines={1}>
                {s.player}
              </Text>
              <Text style={[styles.cell, { color: tc.text }]}>{s.played}</Text>
              <Text style={[styles.cell, { color: tc.text }]}>{s.won}</Text>
              <Text
                style={[
                  styles.cell,
                  { color: s.diff > 0 ? "#10B981" : s.diff < 0 ? "#EF4444" : tc.text },
                ]}
              >
                {s.diff > 0 ? "+" : ""}
                {s.diff}
              </Text>
              <Text style={[styles.cell, { color: tc.text, fontWeight: "800" }]}>
                {s.points}
              </Text>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rank: { width: 28, fontSize: 16, fontWeight: "700" },
  name: { flex: 1, fontSize: 15, fontWeight: "600" },
  cell: { width: 40, textAlign: "center", fontSize: 14 },
});
