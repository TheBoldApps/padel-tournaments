import { Button, Card, Pill, colors } from "@/components/ui";
import {
  deleteTournament,
  playerStandings,
  useTournaments,
} from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { Link, useRouter } from "expo-router";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const { tournaments } = useTournaments();
  const { colors: tc } = useTheme();
  const router = useRouter();

  const confirmDelete = (id: string, name: string) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete "${name}"?`)) deleteTournament(id);
    } else {
      Alert.alert("Delete tournament", `Delete "${name}"?`, [
        { text: "Cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTournament(id) },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: tc.text }]}>🎾 No tournaments yet</Text>
            <Text style={{ color: tc.text, opacity: 0.7, textAlign: "center", marginTop: 6 }}>
              Create your first Americano or Mexicano to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const standings = playerStandings(item);
          const leader = standings[0];
          const totalMatches = item.rounds.reduce((s, r) => s + r.matches.length, 0);
          const played = item.rounds.reduce(
            (s, r) => s + r.matches.filter((m) => m.scoreA != null).length,
            0
          );
          return (
            <Pressable onPress={() => router.push(`/${item.id}`)}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[styles.name, { color: tc.text }]}>{item.name}</Text>
                  <Pressable onPress={() => confirmDelete(item.id, item.name)} hitSlop={10}>
                    <Text style={{ color: colors.danger, fontWeight: "600" }}>Delete</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <Pill
                    text={item.format === "americano" ? "Americano" : "Mexicano"}
                    color={item.format === "americano" ? colors.primary : colors.accent}
                  />
                  <Pill text={`${item.players.length} players`} color="#6366F1" />
                  <Pill text={`${played}/${totalMatches} matches`} color="#10B981" />
                </View>
                {leader && leader.played > 0 && (
                  <Text style={{ color: tc.text, marginTop: 8, opacity: 0.8 }}>
                    🏆 Leading: {leader.player} ({leader.points} pts)
                  </Text>
                )}
              </Card>
            </Pressable>
          );
        }}
      />
      <View style={styles.fab}>
        <Link href="/new" asChild>
          <Button title="+ New Tournament" onPress={() => {}} />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  fab: { position: "absolute", bottom: 24, left: 16, right: 16 },
});
