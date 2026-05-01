import { AdaptiveGlass, Button, formatColors } from "@/components/ui";
import { MatchCard } from "@/components/match-card";
import { MenuSheet, type MenuItem } from "@/components/menu-sheet";
import { RoundPillSelector } from "@/components/round-pill-selector";
import { ScorePickerSheet } from "@/components/score-picker-sheet";
import { generateFinalRound, generateNextRound } from "@/lib/scheduler";
import { Match, updateTournament, useTournaments } from "@/store/tournaments";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Default-select the latest round whenever the round count changes.
  useEffect(() => {
    if (t && t.rounds.length > 0) setSelectedIdx(t.rounds.length - 1);
  }, [t?.rounds.length]);

  if (!t) {
    return (
      <View style={styles.center}>
        <Text style={{ color: PlatformColor("label") as unknown as string }}>
          Tournament not found.
        </Text>
      </View>
    );
  }

  const finished = t.finishedAt != null;
  const fc = formatColors[t.format];

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
    if (finished) return;
    const num =
      value === ""
        ? null
        : Math.max(0, Math.min(t.pointsPerMatch, Number(value) || 0));
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

  const finishOrLeaderboard = () => {
    if (!finished) {
      Alert.alert(
        "Finish tournament?",
        "You can no longer edit scores after finishing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish",
            style: "destructive",
            onPress: () => {
              updateTournament(t.id, (cur) => ({ ...cur, finishedAt: Date.now() }));
              router.push(`/${t.id}/standings`);
            },
          },
        ]
      );
    } else {
      router.push(`/${t.id}/standings`);
    }
  };

  const round = t.rounds[selectedIdx];

  const [menuOpen, setMenuOpen] = useState(false);
  const [picker, setPicker] = useState<{
    roundIdx: number;
    matchIdx: number;
    side: "A" | "B";
  } | null>(null);

  const startFinalRound = () => {
    Alert.alert(
      "Start final round?",
      "Adds a championship match between the top 4 players.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            const newRound = generateFinalRound(t);
            updateTournament(t.id, (cur) => ({
              ...cur,
              rounds: [...cur.rounds, newRound],
            }));
          },
        },
      ]
    );
  };

  const finishTournament = () => {
    Alert.alert("Finish tournament?", "Scores will be locked.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finish",
        style: "destructive",
        onPress: () =>
          updateTournament(t.id, (cur) => ({ ...cur, finishedAt: Date.now() })),
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    { label: "Tournament Info", icon: "info.circle", onPress: () => router.push(`/${t.id}/info`) },
    { label: "Edit Tournament", icon: "pencil", onPress: () => router.push(`/${t.id}/edit`) },
    { label: "Start Final Round", icon: "trophy", onPress: startFinalRound },
    {
      label: finished ? "Reopen Tournament" : "Finish Tournament",
      icon: finished ? "lock.open" : "checkmark.circle",
      onPress: finished
        ? () =>
            updateTournament(t.id, (cur) => ({ ...cur, finishedAt: undefined }))
        : finishTournament,
    },
  ];

  return (
    <>
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
            <Image
              source="sf:ellipsis.circle"
              tintColor={PlatformColor("systemTeal") as unknown as string}
              style={{ width: 26, height: 26 }}
            />
          </Pressable>
        ),
      }}
    />
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.name}</Text>
          <View style={[styles.formatPill, { backgroundColor: fc.soft }]}>
            <Text style={[styles.formatPillText, { color: fc.deep }]}>
              {t.format === "americano" ? "Americano" : "Mexicano"}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            {new Date(t.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: fc.deep }]}>
              {t.pointsPerMatch}
            </Text>
            <Image
              source="sf:scope"
              tintColor={fc.tint}
              style={{ width: 18, height: 18 }}
            />
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: fc.deep }]}>
              {t.players.length}
            </Text>
            <Image
              source="sf:person.2.fill"
              tintColor={fc.tint}
              style={{ width: 18, height: 18 }}
            />
          </View>
        </View>
      </View>

      <RoundPillSelector
        rounds={t.rounds}
        selectedIndex={selectedIdx}
        onSelect={setSelectedIdx}
        onAdd={addRound}
        finished={finished}
      />

      {!round ? (
        <Text style={styles.empty}>Tap More to add the first round.</Text>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {round.matches.map((m, mi) => (
            <MatchCard
              key={mi}
              match={m}
              pointsPerMatch={t.pointsPerMatch}
              onPickA={() =>
                setPicker({ roundIdx: selectedIdx, matchIdx: mi, side: "A" })
              }
              onPickB={() =>
                setPicker({ roundIdx: selectedIdx, matchIdx: mi, side: "B" })
              }
              disabled={finished}
            />
          ))}
          {round.resting.length > 0 && (
            <AdaptiveGlass
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 14,
                borderCurve: "continuous",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Image
                  source="sf:chair.lounge"
                  tintColor={PlatformColor("secondaryLabel") as unknown as string}
                  style={{ width: 16, height: 16 }}
                />
                <Text style={styles.restingHeader}>Resting Players</Text>
              </View>
              <Text style={styles.restingNames}>
                {round.resting.join(", ")}
              </Text>
            </AdaptiveGlass>
          )}
        </View>
      )}

      <View style={styles.bottomBar}>
        <Button
          title="+ More"
          variant="ghost"
          onPress={addRound}
          style={{ flex: 1 }}
        />
        <Button
          title={finished ? "Leaderboard" : "Finish"}
          onPress={finishOrLeaderboard}
          style={{ flex: 1.4 }}
        />
      </View>
    </ScrollView>
    <MenuSheet
      visible={menuOpen}
      onClose={() => setMenuOpen(false)}
      items={menuItems}
    />
    {picker && (() => {
      const r = t.rounds[picker.roundIdx];
      const m = r?.matches[picker.matchIdx];
      if (!m) return null;
      const team = picker.side === "A" ? m.teamA : m.teamB;
      const cur = picker.side === "A" ? m.scoreA : m.scoreB;
      return (
        <ScorePickerSheet
          visible
          onClose={() => setPicker(null)}
          title={`Score for ${team.join(" & ")}`}
          pointsPerMatch={t.pointsPerMatch}
          currentScore={cur}
          onPick={(n) => {
            setScore(picker.roundIdx, picker.matchIdx, picker.side, String(n));
            setPicker(null);
          }}
          onReset={() => {
            updateTournament(t.id, (cur2) => {
              const rounds = cur2.rounds.map((rr, ri) => {
                if (ri !== picker.roundIdx) return rr;
                const matches = rr.matches.map((mm, mi) => {
                  if (mi !== picker.matchIdx) return mm;
                  return { ...mm, scoreA: null, scoreB: null };
                });
                return { ...rr, matches };
              });
              return { ...cur2, rounds };
            });
            setPicker(null);
          }}
        />
      );
    })()}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  formatPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  formatPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  restingHeader: {
    fontWeight: "700",
    fontSize: 15,
    color: PlatformColor("label") as unknown as string,
  },
  restingNames: {
    fontSize: 15,
    color: PlatformColor("label") as unknown as string,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 24,
  },
});
