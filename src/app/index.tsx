import { Card, GlassFab, Pill, colors } from "@/components/ui";
import {
  deleteTournament,
  playerStandings,
  useTournaments,
} from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Home() {
  const { tournaments } = useTournaments();
  const { colors: tc } = useTheme();
  const router = useRouter();

  const confirmDelete = (id: string, name: string) => {
    if (process.env.EXPO_OS === "web") {
      if (confirm(`Delete "${name}"?`)) deleteTournament(id);
    } else {
      Alert.alert("Delete tournament", `Delete "${name}"?`, [
        { text: "Cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTournament(id) },
      ]);
    }
  };

  const useSymbol = process.env.EXPO_OS === "ios";

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={tournaments}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {useSymbol ? (
              <Image
                source="sf:trophy"
                tintColor={PlatformColor("secondaryLabel") as unknown as string}
                style={{ width: 48, height: 48, marginBottom: 12 }}
              />
            ) : (
              <Text style={[styles.emptyTitle, { color: tc.text }]}>🎾</Text>
            )}
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No tournaments yet</Text>
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
              <Card glass>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.name, { color: tc.text }]}>{item.name}</Text>
                  <Pressable onPress={() => confirmDelete(item.id, item.name)} hitSlop={10}>
                    {useSymbol ? (
                      <Image
                        source="sf:trash"
                        tintColor={colors.danger}
                        style={{ width: 18, height: 18 }}
                      />
                    ) : (
                      <Text style={{ color: colors.danger, fontWeight: "600" }}>Delete</Text>
                    )}
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <Pill
                    text={item.format === "americano" ? "Americano" : "Mexicano"}
                    color={item.format === "americano" ? colors.primary : colors.accent}
                  />
                  <Pill text={`${item.players.length} players`} color="#6366F1" />
                  <Pill text={`${played}/${totalMatches} matches`} color="#10B981" />
                </View>
                {leader && leader.played > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                    {useSymbol ? (
                      <Image
                        source="sf:trophy.fill"
                        tintColor={colors.accent}
                        style={{ width: 14, height: 14 }}
                      />
                    ) : (
                      <Text>🏆</Text>
                    )}
                    <Text style={{ color: tc.text, opacity: 0.85 }}>
                      Leading: {leader.player} ({leader.points} pts)
                    </Text>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        }}
      />
      <View style={styles.fab}>
        <GlassFab
          icon="plus"
          label="New Tournament"
          onPress={() => router.push("/new")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  fab: { position: "absolute", bottom: 28, alignSelf: "center" },
});
