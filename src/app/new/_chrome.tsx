import { AdaptiveGlass, Button, colors } from "@/components/ui";
import type { Format } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
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
  setName: (v: string) => void;
  setFormat: (v: Format) => void;
  setPoints: (v: string) => void;
  setPlayers: (v: string[]) => void;
  isStepValid: (step: WizardStep) => boolean;
  isDirty: () => boolean;
};

const Ctx = createContext<WizardState | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("americano");
  const [points, setPoints] = useState("24");
  const [players, setPlayers] = useState<string[]>([]);

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
      setName,
      setFormat,
      setPoints,
      setPlayers,
      isStepValid,
      isDirty,
    }),
    [name, format, points, players, isStepValid, isDirty]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWizard must be used inside WizardProvider");
  return v;
}

export function ProgressBar({ step }: { step: WizardStep }) {
  const { colors: tc } = useTheme();
  return (
    <View style={chrome.progressRow}>
      {[1, 2, 3, 4].map((n) => {
        const filled = n <= step;
        return (
          <View
            key={n}
            style={[
              chrome.progressSeg,
              {
                backgroundColor: filled ? colors.primary : tc.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
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
  const router = useRouter();
  const { isStepValid } = useWizard();
  const insets = useSafeAreaInsets();
  const showBack = step > 1;
  return (
    <AdaptiveGlass
      style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {showBack ? (
          <View style={{ flex: 1 }}>
            <Button title="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
        <View style={{ flex: showBack ? 2 : 1 }}>
          <Button
            title={nextLabel ?? "Next"}
            onPress={onNext}
            disabled={!isStepValid(step)}
          />
        </View>
      </View>
    </AdaptiveGlass>
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
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[{ padding: 16, paddingBottom: 24 }, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressBar step={step} />
        <View style={{ height: 18 }} />
        {children}
      </ScrollView>
      <WizardFooter step={step} onNext={onNext} nextLabel={nextLabel} />
    </KeyboardAvoidingView>
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
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    borderCurve: "continuous",
  },
});
