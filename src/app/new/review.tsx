import { AdaptiveGlass, colors } from "@/components/ui";
import { generateNextRound } from "@/lib/scheduler";
import {
  createTournament,
  updateTournament,
  type SortBy,
} from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ReactNode, useMemo } from "react";
import {
  ActionSheetIOS,
  Alert,
  PlatformColor,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

type SheetOption = {
  label: string;
  value: number | "custom" | string;
};

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

export default function StepReview() {
  const router = useRouter();
  const {
    name,
    format,
    points,
    players,
    sortBy,
    setSortBy,
    roundsCount,
    setRoundsCount,
    courtsCount,
    setCourtsCount,
    sitOutPoints,
    setSitOutPoints,
    roundTimerOn,
    setRoundTimerOn,
    roundTimerMinutes,
    setRoundTimerMinutes,
    winBonus,
    setWinBonus,
    drawBonus,
    setDrawBonus,
    setPoints,
    isStepValid,
  } = useWizard();

  const ptsNum = Math.max(1, Math.floor(Number(points) || 0));
  const autoCourts = Math.max(1, Math.floor(players.length / 4));
  const effectiveCourts = courtsCount ?? autoCourts;

  const sortLabel = useMemo<string>(() => {
    if (sortBy === "wins") return "Wins";
    if (sortBy === "winRatio") return "Win Ratio";
    return "Points";
  }, [sortBy]);

  const create = () => {
    if (!isStepValid(4)) return;
    const t = createTournament({
      name: name.trim(),
      format,
      pointsPerMatch: ptsNum,
      players,
    });
    const settings = {
      sortBy,
      courtsCount: courtsCount ?? undefined,
      sitOutPoints,
      roundTimerSeconds: roundTimerOn ? roundTimerMinutes * 60 : 0,
      winBonus,
      drawBonus,
    };
    // Americano is purely combinatorial — pre-generate the full schedule so
    // every round is visible immediately. Mexicano draws the next round from
    // running scores, so we can only seed round 1.
    const targetRounds =
      format === "americano"
        ? roundsCount ?? Math.max(1, players.length - 1)
        : 1;
    const initialRounds: ReturnType<typeof generateNextRound>[] = [];
    while (initialRounds.length < targetRounds) {
      initialRounds.push(
        generateNextRound({ ...t, ...settings, rounds: initialRounds })
      );
    }
    updateTournament(t.id, (cur) => ({
      ...cur,
      ...settings,
      rounds: initialRounds,
    }));
    router.dismissTo(`/${t.id}`);
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
          promptNumber("Custom points per round", (n) =>
            setPoints(String(Math.max(1, n)))
          );
        } else if (typeof opt.value === "number") {
          setPoints(String(opt.value));
        }
      }
    );
  };

  const pickSort = () => {
    showOptions(
      "Sort leaderboard by",
      [
        { label: "Points", value: "points" },
        { label: "Wins", value: "wins" },
        { label: "Win Ratio", value: "winRatio" },
      ],
      (opt) => setSortBy(opt.value as SortBy)
    );
  };

  const pickRounds = () => {
    showOptions(
      "Number of Rounds",
      [
        { label: "Auto", value: "auto" },
        { label: "3", value: 3 },
        { label: "5", value: 5 },
        { label: "7", value: 7 },
        { label: "Set Custom", value: "custom" },
      ],
      (opt) => {
        if (opt.value === "auto") setRoundsCount(null);
        else if (opt.value === "custom") {
          promptNumber("Custom number of rounds", (n) =>
            setRoundsCount(Math.max(1, n))
          );
        } else if (typeof opt.value === "number") {
          setRoundsCount(opt.value);
        }
      }
    );
  };

  const pickCourts = () => {
    const max = autoCourts;
    const opts: SheetOption[] = [];
    for (let i = 1; i <= max; i++) {
      opts.push({ label: String(i), value: i });
    }
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
    const third = Math.floor(ptsNum / 3);
    const half = Math.floor(ptsNum / 2);
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

  const pickDuration = () => {
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
  };

  const pickBonus = (
    title: string,
    setter: (n: number) => void
  ) => {
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
  };

  return (
    <StepScreen step={4} onNext={create} nextLabel="Create Tournament">
      <View style={styles.heroWrap}>
        <Text style={styles.heroEmoji}>🏟️</Text>
      </View>
      <Text style={styles.title}>Points & Courts</Text>
      <Text style={styles.subtitle}>
        Fine-tune scoring and play settings.
      </Text>

      {/* GROUP 1 — Points & Sort */}
      <SettingsCard>
        <SettingRow
          icon="scope"
          iconBg={colors.danger}
          label="Points per Round"
          value={String(ptsNum)}
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

      {/* GROUP 2 — Rounds */}
      <SettingsCard>
        <SettingRow
          icon="repeat"
          iconBg={colors.success}
          label="Number of Rounds"
          value={roundsCount == null ? "Auto" : String(roundsCount)}
          onPress={pickRounds}
          last
        />
      </SettingsCard>
      <Footer>
        Rounds are calculated automatically for balanced play. You can add more
        rounds or finish early at any time.
      </Footer>

      {/* GROUP 3 — Courts */}
      <SettingsCard>
        <SettingRow
          icon="rectangle.stack"
          iconBg={colors.purple}
          label="Number of Courts"
          value={String(effectiveCourts)}
          onPress={pickCourts}
        />
        <RowDivider />
        <SettingRow
          icon="pencil"
          iconBg="#9CA3AF"
          label="Court 1"
          value="Edit"
          onPress={() =>
            Alert.alert("Custom court names coming soon.")
          }
          last
        />
      </SettingsCard>

      {/* GROUP 4 — Sit Out */}
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
      <Footer>
        Compensate players sitting out with points to keep the scoring
        competitive when not all players are on court.
      </Footer>

      {/* GROUP 5 — Round Timer */}
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
      <Footer>An alarm will sound when the round time is up.</Footer>

      {/* GROUP 6 — Win/Draw bonuses */}
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
      <Footer>Award extra points for winning or drawing a match.</Footer>
    </StepScreen>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return <AdaptiveGlass style={styles.card}>{children}</AdaptiveGlass>;
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function Footer({ children }: { children: ReactNode }) {
  return <Text style={styles.footerText}>{children}</Text>;
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
      <View
        style={[
          styles.iconSquare,
          { backgroundColor: iconBg },
        ]}
      >
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
              tintColor={
                PlatformColor("tertiaryLabel") as unknown as string
              }
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
  heroWrap: { alignItems: "center", marginBottom: 12 },
  heroEmoji: { fontSize: 64, lineHeight: 72 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: PlatformColor("label") as unknown as string,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 6,
    marginBottom: 18,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor("separator") as unknown as string,
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
  rowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 17,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
    marginLeft: 58,
  },
  footerText: {
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 6,
    marginBottom: 16,
    marginHorizontal: 4,
    lineHeight: 18,
  },
});
