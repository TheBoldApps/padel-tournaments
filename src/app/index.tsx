import { AdaptiveGlass, GlassFab, colors } from "@/components/ui";
import { refetch } from "@/lib/sync";
import {
  deleteTournament,
  useTournaments,
  type Tournament,
} from "@/store/tournaments";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  PlatformColor,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function groupByMonth(items: Tournament[]) {
  const map = new Map<string, Tournament[]>();
  for (const t of items) {
    const key = MONTH_FORMAT.format(new Date(t.createdAt));
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function Home() {
  const { tournaments } = useTournaments();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const sections = useMemo(() => groupByMonth(tournaments), [tournaments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch(tournaments);
    setRefreshing(false);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert("Delete tournament", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTournament(id),
      },
    ]);
  };

  const useSymbol = process.env.EXPO_OS === "ios";

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Tournaments",
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
              {useSymbol ? (
                <Image
                  source="sf:gearshape"
                  tintColor={PlatformColor("systemTeal") as unknown as string}
                  style={{ width: 24, height: 24 }}
                />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  Settings
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image
              source="sf:trophy"
              tintColor={
                PlatformColor("secondaryLabel") as unknown as string
              }
              style={{ width: 48, height: 48, marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>No tournaments yet</Text>
            <Text style={styles.emptySub}>
              Tap "Create Tournament" to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const totalMatches = item.rounds.reduce(
            (s, r) => s + r.matches.length,
            0
          );
          return (
            <Pressable
              onPress={() => router.push(`/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
            >
              <AdaptiveGlass style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.format}>
                    {item.format === "americano"
                      ? "Classic Americano"
                      : "Classic Mexicano"}
                  </Text>
                  <Text style={styles.date}>
                    {DATE_FORMAT.format(new Date(item.createdAt))}
                  </Text>
                </View>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.divider} />
                <Text style={styles.meta}>
                  {item.players.length} Players · {item.rounds.length} Rounds
                  {totalMatches ? ` · ${totalMatches} Matches` : ""}
                </Text>
              </AdaptiveGlass>
            </Pressable>
          );
        }}
      />
      <View style={styles.fab}>
        <GlassFab
          icon="plus"
          label="Create Tournament"
          onPress={() => router.push("/new")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  format: {
    fontSize: 14,
    fontWeight: "500",
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  date: {
    fontSize: 14,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
    marginVertical: 10,
  },
  meta: {
    fontSize: 14,
    fontWeight: "600",
    color: PlatformColor("label") as unknown as string,
  },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  emptySub: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
    marginTop: 6,
  },
  fab: { position: "absolute", bottom: 28, alignSelf: "center" },
});
