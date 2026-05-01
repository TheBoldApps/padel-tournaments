import { AdaptiveGlass, Button, colors } from "@/components/ui";
import { regenerateUnscoredRounds } from "@/lib/scheduler";
import {
  updateTournament,
  useTournaments,
  type SortBy,
} from "@/store/tournaments";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ReactNode, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type SheetOption = { label: string; value: number | "custom" | string };

function showOptions(
  title: string,
  options: SheetOption[],
  onPick: (opt: SheetOption) => void
) {
  if (process.env.EXPO_OS === "ios") {
    const labels = options.map((o) => o.label);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...labels, "Cancel"],
        cancelButtonIndex: labels.length,
      },
      (idx) => {
        if (idx == null || idx === labels.length) return;
        onPick(options[idx]);
      }
    );
  } else {
    Alert.alert(
      title,
      undefined,
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => onPick(o),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
      { cancelable: true }
    );
  }
}

function promptNumber(title: string, onPick: (n: number) => void) {
  if (process.env.EXPO_OS === "ios") {
    Alert.prompt(
      title,
      undefined,
      (text) => {
        const n = Math.floor(Number(text));
        if (Number.isFinite(n) && n >= 0) onPick(n);
      },
      "plain-text",
      undefined,
      "number-pad"
    );
  } else {
    Alert.alert(title, "Custom values are not yet supported on this platform.");
  }
}

export default function EditTournament() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);

  const [name, setName] = useState(t?.name ?? "");
  const [pts, setPts] = useState(t?.pointsPerMatch ?? 24);
  const [sortBy, setSortBy] = useState<SortBy>(t?.sortBy ?? "points");
  const autoCourts = Math.max(1, Math.floor((t?.players.length ?? 4) / 4));
  const [courtsCount, setCourtsCount] = useState<number | null>(
    t?.courtsCount ?? null
  );
  const [sitOutPoints, setSitOutPoints] = useState<number>(
    t?.sitOutPoints ?? 0
  );
  const [roundTimerOn, setRoundTimerOn] = useState<boolean>(
    (t?.roundTimerSeconds ?? 0) > 0
  );
  const [roundTimerMinutes, setRoundTimerMinutes] = useState<number>(
    Math.max(1, Math.floor((t?.roundTimerSeconds ?? 600) / 60))
  );
  const [winBonus, setWinBonus] = useState<number>(t?.winBonus ?? 0);
  const [drawBonus, setDrawBonus] = useState<number>(t?.drawBonus ?? 0);

  const effectiveCourts = courtsCount ?? autoCourts;

  const sortLabel = useMemo<string>(() => {
    if (sortBy === "wins") return "Wins";
    if (sortBy === "winRatio") return "Win Ratio";
    return "Points";
  }, [sortBy]);

  if (!t) return null;

  const confirmRemovePlayer = (player: string) => {
    if (t.players.length <= 4) return;
    Alert.alert(
      `Remove ${player}?`,
      "Past results stay. Upcoming rounds will be regenerated for the remaining players.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            updateTournament(t.id, (cur) => {
              if (cur.players.length <= 4) return cur;
              if (!cur.players.includes(player)) return cur;
              const remaining = cur.players.filter((p) => p !== player);
              const updatedCourts =
                cur.courtsCount != null
                  ? Math.min(cur.courtsCount, Math.floor(remaining.length / 4))
                  : cur.courtsCount;
              const next = {
                ...cur,
                players: remaining,
                courtsCount: updatedCourts,
              };
              return { ...next, rounds: regenerateUnscoredRounds(next) };
            });
          },
        },
      ]
    );
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert("Name is required");
      return;
    }
    const ptsNum = Math.max(1, Math.min(99, Math.floor(pts) || t.pointsPerMatch));
    updateTournament(t.id, (cur) => ({
      ...cur,
      name: name.trim(),
      pointsPerMatch: ptsNum,
      sortBy,
      courtsCount: courtsCount ?? undefined,
      sitOutPoints,
      roundTimerSeconds: roundTimerOn ? roundTimerMinutes * 60 : 0,
      winBonus,
      drawBonus,
    }));
    if (router.canGoBack()) router.back();
  };

  const pickPoints = () => {
    showOptions(
      "Points per Round",
      [
        { label: "16", value: 16 },
        { label: "21", value: 21 },
        { label: "24", value: 24 },
        { label: "32", value: 32 },
        { label: "Set Custom Points", value: "custom" },
      ],
      (opt) => {
        if (opt.value === "custom") {
          promptNumber("Custom points per round", (n) => setPts(Math.max(1, n)));
        } else if (typeof opt.value === "number") {
          setPts(opt.value);
        }
      }
    );
  };

  const pickSort = () =>
    showOptions(
      "Sort leaderboard by",
      [
        { label: "Points", value: "points" },
        { label: "Wins", value: "wins" },
        { label: "Win Ratio", value: "winRatio" },
      ],
      (opt) => setSortBy(opt.value as SortBy)
    );

  const pickCourts = () => {
    const max = autoCourts;
    const opts: SheetOption[] = [];
    for (let i = 1; i <= max; i++) opts.push({ label: String(i), value: i });
    opts.push({ label: "Set Custom", value: "custom" });
    showOptions("Number of Courts", opts, (opt) => {
      if (opt.value === "custom") {
        promptNumber("Custom number of courts", (n) =>
          setCourtsCount(Math.max(1, Math.min(n, max)))
        );
      } else if (typeof opt.value === "number") {
        setCourtsCount(opt.value);
      }
    });
  };

  const pickSitOut = () => {
    const third = Math.floor(pts / 3);
    const half = Math.floor(pts / 2);
    showOptions(
      "Sit Out Points",
      [
        { label: `${third} (1/3)`, value: third },
        { label: `${half} (1/2)`, value: half },
        { label: "0", value: 0 },
        { label: "Set Custom Points", value: "custom" },
      ],
      (opt) => {
        if (opt.value === "custom") {
          promptNumber("Custom sit out points", (n) => setSitOutPoints(n));
        } else if (typeof opt.value === "number") {
          setSitOutPoints(opt.value);
        }
      }
    );
  };

  const pickDuration = () =>
    showOptions(
      "Round Duration",
      [
        { label: "5 min", value: 5 },
        { label: "10 min", value: 10 },
        { label: "15 min", value: 15 },
        { label: "20 min", value: 20 },
        { label: "30 min", value: 30 },
        { label: "Set Custom", value: "custom" },
      ],
      (opt) => {
        if (opt.value === "custom") {
          promptNumber("Custom duration (minutes)", (n) =>
            setRoundTimerMinutes(Math.max(1, n))
          );
        } else if (typeof opt.value === "number") {
          setRoundTimerMinutes(opt.value);
        }
      }
    );

  const pickBonus = (title: string, setter: (n: number) => void) =>
    showOptions(
      title,
      [
        { label: "None", value: 0 },
        { label: "1", value: 1 },
        { label: "3", value: 3 },
        { label: "5", value: 5 },
        { label: "Set Custom Points", value: "custom" },
      ],
      (opt) => {
        if (opt.value === "custom") {
          promptNumber(`Custom ${title.toLowerCase()}`, (n) => setter(n));
        } else if (typeof opt.value === "number") {
          setter(opt.value);
        }
      }
    );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Name */}
      <SettingsCard>
        <View style={{ paddingVertical: 6, paddingHorizontal: 14 }}>
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
        </View>
      </SettingsCard>

      {/* Points & Sort */}
      <SettingsCard>
        <SettingRow
          icon="scope"
          iconBg={colors.danger}
          label="Points per Round"
          value={String(pts)}
          onPress={pickPoints}
        />
        <RowDivider />
        <SettingRow
          icon="arrow.up.arrow.down"
          iconBg={colors.purple}
          label="Sort leaderboard by"
          value={sortLabel}
          onPress={pickSort}
          last
        />
      </SettingsCard>

      {/* Courts */}
      <SettingsCard>
        <SettingRow
          icon="rectangle.stack"
          iconBg={colors.purple}
          label="Number of Courts"
          value={String(effectiveCourts)}
          onPress={pickCourts}
          last
        />
      </SettingsCard>

      {/* Sit out */}
      <SettingsCard>
        <SettingRow
          icon="chair.lounge"
          iconBg={colors.accent}
          label="Sit Out Points"
          value={String(sitOutPoints)}
          onPress={pickSitOut}
          last
        />
      </SettingsCard>

      {/* Round timer */}
      <SettingsCard>
        <SettingRow
          icon="timer"
          iconBg={colors.accent}
          label="Round Timer"
          last={!roundTimerOn}
        >
          <Switch
            value={roundTimerOn}
            onValueChange={setRoundTimerOn}
            trackColor={{ true: colors.primary, false: undefined }}
          />
        </SettingRow>
        {roundTimerOn ? (
          <>
            <RowDivider />
            <SettingRow
              icon="clock"
              iconBg={colors.blue}
              label="Duration"
              value={`${roundTimerMinutes} min`}
              onPress={pickDuration}
              last
            />
          </>
        ) : null}
      </SettingsCard>

      {/* Players */}
      <Text style={styles.sectionHeader}>Players ({t.players.length})</Text>
      <SettingsCard>
        {t.players.map((p, i) => (
          <View key={`${i}:${p}`}>
            {i > 0 ? <RowDivider /> : null}
            <View style={styles.rowInner}>
              <View style={[styles.iconSquare, { backgroundColor: colors.indigo }]}>
                <Image
                  source="sf:person.fill"
                  tintColor="#FFFFFF"
                  style={{ width: 16, height: 16 }}
                />
              </View>
              <Text style={styles.rowLabel}>{p}</Text>
              <Pressable
                onPress={() => confirmRemovePlayer(p)}
                disabled={t.players.length <= 4}
                hitSlop={10}
                style={({ pressed }) => ({
                  opacity: t.players.length <= 4 ? 0.3 : pressed ? 0.5 : 1,
                })}
              >
                <Image
                  source="sf:minus.circle.fill"
                  tintColor={colors.danger}
                  style={{ width: 22, height: 22 }}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </SettingsCard>
      <Text style={styles.footer}>
        Removing a player keeps past results and regenerates upcoming rounds.
        Minimum 4 players.
      </Text>

      {/* Bonuses */}
      <SettingsCard>
        <SettingRow
          icon="trophy.fill"
          iconBg={colors.success}
          label="Win Bonus"
          value={winBonus === 0 ? "None" : String(winBonus)}
          onPress={() => pickBonus("Win Bonus", setWinBonus)}
        />
        <RowDivider />
        <SettingRow
          icon="equal"
          iconBg={colors.blue}
          label="Draw Bonus"
          value={drawBonus === 0 ? "None" : String(drawBonus)}
          onPress={() => pickBonus("Draw Bonus", setDrawBonus)}
          last
        />
      </SettingsCard>

      <View style={{ marginTop: 24 }}>
        <Button title="Save" onPress={save} />
      </View>
    </ScrollView>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return <AdaptiveGlass style={styles.card}>{children}</AdaptiveGlass>;
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function SettingRow({
  icon,
  iconBg,
  label,
  value,
  onPress,
  last,
  children,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  children?: ReactNode;
}) {
  const useSymbol = process.env.EXPO_OS === "ios";
  const inner = (
    <View style={styles.rowInner}>
      <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
        {useSymbol ? (
          <Image
            source={`sf:${icon}`}
            tintColor="#FFFFFF"
            style={{ width: 16, height: 16 }}
          />
        ) : (
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>•</Text>
        )}
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value != null ? (
        <View style={styles.rowValueWrap}>
          <Text style={styles.rowValue}>{value}</Text>
          {useSymbol ? (
            <Image
              source="sf:chevron.up.chevron.down"
              tintColor={PlatformColor("tertiaryLabel") as unknown as string}
              style={{ width: 12, height: 14 }}
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor("separator") as unknown as string,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
    paddingVertical: 6,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 14,
    minHeight: 54,
  },
  iconSquare: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: "continuous",
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "500",
    flex: 1,
    color: PlatformColor("label") as unknown as string,
  },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: {
    fontSize: 17,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
    marginLeft: 58,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 4,
  },
  footer: {
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 6,
    marginBottom: 16,
    marginHorizontal: 4,
    lineHeight: 18,
  },
});
