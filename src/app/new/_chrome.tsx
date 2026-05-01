import { AdaptiveGlass, colors } from "@/components/ui";
import type { Format, SortBy } from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type WizardStep = 1 | 2 | 3 | 4;

type WizardState = {
  name: string;
  format: Format;
  points: string;
  players: string[];
  sortBy: SortBy;
  roundsCount: number | null;
  courtsCount: number | null;
  sitOutPoints: number;
  roundTimerOn: boolean;
  roundTimerMinutes: number;
  winBonus: number;
  drawBonus: number;
  setName: (v: string) => void;
  setFormat: (v: Format) => void;
  setPoints: (v: string) => void;
  setPlayers: (v: string[]) => void;
  setSortBy: (v: SortBy) => void;
  setRoundsCount: (v: number | null) => void;
  setCourtsCount: (v: number | null) => void;
  setSitOutPoints: (v: number) => void;
  setRoundTimerOn: (v: boolean) => void;
  setRoundTimerMinutes: (v: number) => void;
  setWinBonus: (v: number) => void;
  setDrawBonus: (v: number) => void;
  isStepValid: (step: WizardStep) => boolean;
  isDirty: () => boolean;
};

const Ctx = createContext<WizardState | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("americano");
  const [points, setPoints] = useState("24");
  const [players, setPlayers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("points");
  const [roundsCount, setRoundsCount] = useState<number | null>(null);
  const [courtsCount, setCourtsCount] = useState<number | null>(null);
  const [sitOutPoints, setSitOutPoints] = useState<number>(0);
  const [roundTimerOn, setRoundTimerOn] = useState<boolean>(false);
  const [roundTimerMinutes, setRoundTimerMinutes] = useState<number>(10);
  const [winBonus, setWinBonus] = useState<number>(0);
  const [drawBonus, setDrawBonus] = useState<number>(0);

  const isStepValid = useCallback(
    (step: WizardStep) => {
      if (step === 1) return name.trim().length > 0;
      if (step === 2) return true;
      if (step === 3) return players.length >= 4;
      if (step === 4) {
        const n = Math.floor(Number(points));
        return Number.isFinite(n) && n > 0;
      }
      return false;
    },
    [name, players.length, points]
  );

  const isDirty = useCallback(
    () =>
      name.trim().length > 0 ||
      format !== "americano" ||
      points !== "24" ||
      players.length > 0,
    [name, format, points, players.length]
  );

  const value = useMemo<WizardState>(
    () => ({
      name,
      format,
      points,
      players,
      sortBy,
      roundsCount,
      courtsCount,
      sitOutPoints,
      roundTimerOn,
      roundTimerMinutes,
      winBonus,
      drawBonus,
      setName,
      setFormat,
      setPoints,
      setPlayers,
      setSortBy,
      setRoundsCount,
      setCourtsCount,
      setSitOutPoints,
      setRoundTimerOn,
      setRoundTimerMinutes,
      setWinBonus,
      setDrawBonus,
      isStepValid,
      isDirty,
    }),
    [
      name,
      format,
      points,
      players,
      sortBy,
      roundsCount,
      courtsCount,
      sitOutPoints,
      roundTimerOn,
      roundTimerMinutes,
      winBonus,
      drawBonus,
      isStepValid,
      isDirty,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWizard must be used inside WizardProvider");
  return v;
}

export function WizardFooter({
  step,
  onNext,
  nextLabel,
}: {
  step: WizardStep;
  onNext: () => void;
  nextLabel?: string;
}) {
  const { isStepValid } = useWizard();
  const insets = useSafeAreaInsets();
  const valid = isStepValid(step);
  return (
    <AdaptiveGlass
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <BigButton
        title={nextLabel ?? "Next"}
        onPress={onNext}
        disabled={!valid}
      />
    </AdaptiveGlass>
  );
}

function BigButton({
  title,
  onPress,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        chrome.bigBtn,
        {
          backgroundColor: isPrimary
            ? colors.primary
            : (PlatformColor(
                "secondarySystemBackground"
              ) as unknown as string),
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: isPrimary
            ? "#FFFFFF"
            : (PlatformColor("label") as unknown as string),
          fontSize: 17,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function PillButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label?: string;
  onPress: () => void;
}) {
  const useSymbol = process.env.EXPO_OS === "ios";
  const hasLabel = !!label;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          backgroundColor: PlatformColor(
            "systemBackground"
          ) as unknown as string,
          borderRadius: 999,
          paddingVertical: hasLabel ? 8 : 10,
          paddingHorizontal: hasLabel ? 14 : 12,
          minHeight: 40,
          minWidth: hasLabel ? 0 : 44,
          opacity: pressed ? 0.6 : 1,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        },
      ]}
    >
      {useSymbol ? (
        <Image
          source={`sf:${icon}`}
          tintColor={PlatformColor("label") as unknown as string}
          style={{ width: 14, height: 14 }}
        />
      ) : null}
      {hasLabel ? (
        <Text
          style={{
            color: PlatformColor("label") as unknown as string,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function SoftHeader({
  name,
  subtitle,
  canBack,
  onBack,
  onClose,
}: {
  name: string;
  subtitle?: string | null;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 24,
        backgroundColor: "#DBE5F4",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {canBack ? (
          <PillButton icon="chevron.left" label="Back" onPress={onBack} />
        ) : (
          <View style={{ width: 84 }} />
        )}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: PlatformColor("label") as unknown as string,
            }}
          >
            {name}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                color: PlatformColor("secondaryLabel") as unknown as string,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <PillButton icon="xmark" onPress={onClose} />
      </View>
    </View>
  );
}

export function StepScreen({
  step,
  children,
  onNext,
  nextLabel,
  contentStyle,
}: {
  step: WizardStep;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  contentStyle?: ViewStyle;
}) {
  const router = useRouter();
  const { name, format, isDirty } = useWizard();
  const formatLabel = format === "americano" ? "Classic Americano" : "Classic Mexicano";
  const subtitle = step >= 3 ? formatLabel : null;
  const headerTitle = name.trim() || "New Tournament";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: PlatformColor(
          "systemGroupedBackground"
        ) as unknown as string,
      }}
    >
      <SoftHeader
        name={headerTitle}
        subtitle={subtitle}
        canBack={step > 1}
        onBack={() => router.back()}
        onClose={() =>
          confirmDiscardThen(() => router.dismiss(), isDirty())
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <WizardFooter step={step} onNext={onNext} nextLabel={nextLabel} />
      </KeyboardAvoidingView>
    </View>
  );
}

export function confirmDiscardThen(action: () => void, isDirty: boolean) {
  if (!isDirty) {
    action();
    return;
  }
  Alert.alert(
    "Discard tournament?",
    "Your progress will be lost.",
    [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: action },
    ],
    { cancelable: true }
  );
}

export function CancelButton() {
  const router = useRouter();
  const { isDirty } = useWizard();
  return (
    <Pressable
      onPress={() => confirmDiscardThen(() => router.dismiss(), isDirty())}
      hitSlop={10}
    >
      <Text style={{ color: colors.primary, fontSize: 17 }}>Cancel</Text>
    </Pressable>
  );
}

const chrome = StyleSheet.create({
  bigBtn: {
    height: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
