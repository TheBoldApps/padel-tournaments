import { MenuSheet, type MenuItem } from "@/components/menu-sheet";
import { ShimmerFab } from "@/components/shimmer-fab";
import { AdaptiveGlass, colors, useFormatColors } from "@/components/ui";
import { refetch } from "@/lib/sync";
import {
  deleteTournament,
  updateTournament,
  useTournaments,
  type Tournament,
} from "@/store/tournaments";
import * as Haptics from "expo-haptics";
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

function TournamentRow({
  tournament,
  onOpen,
  onLongPress,
}: {
  tournament: Tournament;
  onOpen: () => void;
  onLongPress: (pageY: number) => void;
}) {
  const fc = useFormatColors(tournament.format);
  const totalMatches = tournament.rounds.reduce(
    (s, r) => s + r.matches.length,
    0
  );
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={(e) => onLongPress(e.nativeEvent.pageY)}
      delayLongPress={300}
    >
      <AdaptiveGlass style={styles.card}>
        <View style={[styles.accentStripe, { backgroundColor: fc.tint }]} />
        <View style={styles.topRow}>
          <View style={[styles.formatPill, { backgroundColor: fc.soft }]}>
            <Text style={[styles.formatPillText, { color: fc.deep }]}>
              {tournament.format === "americano" ? "Americano" : "Mexicano"}
            </Text>
          </View>
          <Text style={styles.date}>
            {DATE_FORMAT.format(new Date(tournament.createdAt))}
          </Text>
        </View>
        <Text style={styles.name}>{tournament.name}</Text>
        <View style={styles.divider} />
        <Text style={styles.meta}>
          <Text style={{ color: fc.deep, fontWeight: "700" }}>
            {tournament.players.length}
          </Text>{" "}
          Players ·{" "}
          <Text style={{ color: fc.deep, fontWeight: "700" }}>
            {tournament.rounds.length}
          </Text>{" "}
          Rounds
          {totalMatches ? (
            <>
              {" · "}
              <Text style={{ color: fc.deep, fontWeight: "700" }}>
                {totalMatches}
              </Text>{" "}
              Matches
            </>
          ) : null}
        </Text>
      </AdaptiveGlass>
    </Pressable>
  );
}

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
  const [menuTournament, setMenuTournament] = useState<Tournament | null>(null);
  const [menuAnchorY, setMenuAnchorY] = useState<number | undefined>();
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

  const promptRename = (id: string, current: string) => {
    if (process.env.EXPO_OS !== "ios") {
      // Non-iOS: send to the edit screen since Alert.prompt is iOS-only.
      router.push(`/${id}/edit`);
      return;
    }
    Alert.prompt(
      "Rename tournament",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (text?: string) => {
            const next = (text ?? "").trim();
            if (!next) return;
            updateTournament(id, (cur) => ({ ...cur, name: next }));
          },
        },
      ],
      "plain-text",
      current
    );
  };

  const openTournamentMenu = (t: Tournament, pageY?: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuAnchorY(pageY);
    setMenuTournament(t);
  };

  const menuItems: MenuItem[] = menuTournament
    ? [
        {
          label: "Rename",
          icon: "pencil",
          onPress: () =>
            promptRename(menuTournament.id, menuTournament.name),
        },
        {
          label: "Edit Settings",
          icon: "slider.horizontal.3",
          onPress: () => router.push(`/${menuTournament.id}/edit`),
        },
        {
          label: "Delete",
          icon: "trash",
          destructive: true,
          onPress: () => confirmDelete(menuTournament.id, menuTournament.name),
        },
      ]
    : [];

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
        renderItem={({ item }) => (
          <TournamentRow
            tournament={item}
            onOpen={() => router.push(`/${item.id}`)}
            onLongPress={(pageY) => openTournamentMenu(item, pageY)}
          />
        )}
      />
      <View style={styles.fab}>
        <ShimmerFab
          icon="plus"
          label="Create Tournament"
          onPress={() => router.push("/new")}
        />
      </View>
      <MenuSheet
        visible={menuTournament != null}
        onClose={() => setMenuTournament(null)}
        items={menuItems}
        title={menuTournament?.name}
        placement="anchored"
        anchorY={menuAnchorY}
      />
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
    paddingLeft: 20,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  accentStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  formatPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
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
