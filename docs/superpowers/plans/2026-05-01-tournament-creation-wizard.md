# Tournament Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-screen tournament creation form with a 4-step full-screen wizard (Name → Format → Players → Review) so users always know which step they're on, what is required, and what they've entered.

**Architecture:** A nested route group at `src/app/new/` with shared `WizardProvider` context. Each step is its own routed screen rendering a top progress bar and a bottom action bar from a shared `_chrome.tsx` module. Wizard state lives in React context; data submission still uses the existing `createTournament` from the store.

**Tech Stack:** Expo Router (file-based routing), React Native, `expo-glass-effect`, `expo-blur`, `expo-image` (SF Symbols), TypeScript. No test framework is configured in this project — verification is manual UAT on the iOS simulator. The project's design rules in [CLAUDE.md](../../../CLAUDE.md) require liquid glass surfaces, SF Symbols on iOS, `PlatformColor` for text, and `borderCurve: "continuous"`.

**Spec:** [docs/superpowers/specs/2026-05-01-tournament-creation-wizard-design.md](../specs/2026-05-01-tournament-creation-wizard-design.md)

---

## File Map

**Create:**
- `src/app/new/_chrome.tsx` — `WizardProvider`, `useWizard`, `<ProgressBar>`, `<WizardFooter>`, `<StepScreen>` wrapper
- `src/app/new/_layout.tsx` — Stack with header config + WizardProvider
- `src/app/new/index.tsx` — Step 1: Name
- `src/app/new/format.tsx` — Step 2: Format
- `src/app/new/players.tsx` — Step 3: Players
- `src/app/new/review.tsx` — Step 4: Match settings + Review + Create

**Modify:**
- [src/app/_layout.tsx](../../../src/app/_layout.tsx) — change `new` screen presentation from `formSheet` to `fullScreenModal`; remove sheet detents.

**Delete:**
- [src/app/new.tsx](../../../src/app/new.tsx)

---

## Task 1: Set up wizard route group with empty step screens

Goal: Boot the new route hierarchy so all four steps are reachable. No state yet; just navigation skeleton.

**Files:**
- Create: `src/app/new/_layout.tsx`
- Create: `src/app/new/index.tsx`
- Create: `src/app/new/format.tsx`
- Create: `src/app/new/players.tsx`
- Create: `src/app/new/review.tsx`
- Modify: `src/app/_layout.tsx`
- Delete: `src/app/new.tsx`

- [ ] **Step 1: Create `src/app/new/_layout.tsx`**

```tsx
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";

export default function NewWizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: false,
        headerTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerTintColor: PlatformColor("systemTeal") as unknown as string,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Step 1 of 4" }} />
      <Stack.Screen name="format" options={{ title: "Step 2 of 4" }} />
      <Stack.Screen name="players" options={{ title: "Step 3 of 4" }} />
      <Stack.Screen name="review" options={{ title: "Step 4 of 4" }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Create `src/app/new/index.tsx` (Step 1 placeholder)**

```tsx
import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function StepName() {
  const { colors: tc } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: tc.text, fontSize: 28, fontWeight: "700" }}>
        Name your tournament
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Create `src/app/new/format.tsx` (Step 2 placeholder)**

```tsx
import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function StepFormat() {
  const { colors: tc } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: tc.text, fontSize: 28, fontWeight: "700" }}>
        Choose a format
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Create `src/app/new/players.tsx` (Step 3 placeholder)**

```tsx
import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function StepPlayers() {
  const { colors: tc } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: tc.text, fontSize: 28, fontWeight: "700" }}>
        Add players
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: Create `src/app/new/review.tsx` (Step 4 placeholder)**

```tsx
import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function StepReview() {
  const { colors: tc } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: tc.text, fontSize: 28, fontWeight: "700" }}>
        Match settings
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Update root `src/app/_layout.tsx`**

Replace the `<Stack.Screen name="new" ... />` block (lines 22–32 of the current file) with:

```tsx
        <Stack.Screen
          name="new"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
```

The `headerShown: false` lets the nested `new/_layout.tsx` Stack draw its own headers per step.

- [ ] **Step 7: Delete `src/app/new.tsx`**

Run: `rm src/app/new.tsx`

- [ ] **Step 8: Manually verify navigation skeleton**

Run: `bun expo start --ios` and tap the "+" / "New" button on the Tournaments home screen.

Expected:
- Modal opens full-screen showing "Step 1 of 4" header and "Name your tournament" body.
- No crash. Header back chevron returns to the home list (modal dismiss).

- [ ] **Step 9: Commit**

```bash
git add src/app/new src/app/_layout.tsx
git rm src/app/new.tsx
git commit -m "$(cat <<'EOF'
Scaffold tournament creation wizard route group

Replaces the single-screen formSheet with a fullScreenModal containing
nested routes for the four wizard steps. No state or chrome yet — just
the navigation skeleton.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Build shared wizard chrome (context, progress bar, footer)

Goal: Add the shared state container and visual chrome so subsequent step tasks can plug in their content with one wrapper.

**Files:**
- Create: `src/app/new/_chrome.tsx`

- [ ] **Step 1: Create `src/app/new/_chrome.tsx` with `WizardProvider` and `useWizard`**

```tsx
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
```

- [ ] **Step 2: Wrap the wizard layout with `WizardProvider`**

Edit `src/app/new/_layout.tsx` to import and apply the provider:

```tsx
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";
import { WizardProvider } from "./_chrome";

export default function NewWizardLayout() {
  return (
    <WizardProvider>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitle: false,
          headerTitleStyle: { color: PlatformColor("label") as unknown as string },
          headerTintColor: PlatformColor("systemTeal") as unknown as string,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Step 1 of 4" }} />
        <Stack.Screen name="format" options={{ title: "Step 2 of 4" }} />
        <Stack.Screen name="players" options={{ title: "Step 3 of 4" }} />
        <Stack.Screen name="review" options={{ title: "Step 4 of 4" }} />
      </Stack>
    </WizardProvider>
  );
}
```

- [ ] **Step 3: Manually verify chrome compiles**

Run: `bun expo start --ios`, open the wizard. Each placeholder step should still render its title; no crash.

Expected: app boots without errors. (The chrome isn't wired into placeholder screens yet — that comes in the next tasks.)

- [ ] **Step 4: Commit**

```bash
git add src/app/new/_chrome.tsx src/app/new/_layout.tsx
git commit -m "$(cat <<'EOF'
Add wizard chrome: provider, progress bar, footer

Provides shared state and visual scaffolding (segmented progress bar,
glass footer with Back/Next) for the four step screens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Implement Step 1 — Name

Goal: Wire the first step to wizard state with autofocus, validation, and Next-button advancement.

**Files:**
- Modify: `src/app/new/index.tsx`

- [ ] **Step 1: Replace `src/app/new/index.tsx` with full implementation**

```tsx
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TextInput } from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepName() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { name, setName } = useWizard();

  return (
    <StepScreen step={1} onNext={() => router.push("/new/format")}>
      <Text style={[styles.title, { color: tc.text }]}>Name your tournament</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        Give it something memorable so you can find it later.
      </Text>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Friday night padel"
        placeholderTextColor={tc.text + "66"}
        returnKeyType="next"
        onSubmitEditing={() => name.trim() && router.push("/new/format")}
        style={[
          styles.input,
          {
            color: tc.text,
            borderColor: tc.border,
            backgroundColor: tc.card,
          },
        ]}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
});
```

- [ ] **Step 2: Manually verify Step 1 behavior**

Run: `bun expo start --ios`, open the wizard.

Expected:
- Progress bar: first segment filled (primary teal), three remaining grey.
- Input autofocuses; keyboard appears.
- Footer "Next" button is **disabled** while empty, **enabled** as soon as a non-whitespace character is typed.
- Tapping Next pushes to "Step 2 of 4".

- [ ] **Step 3: Commit**

```bash
git add src/app/new/index.tsx
git commit -m "$(cat <<'EOF'
Implement wizard Step 1: tournament name

Autofocused input with validation gating the Next button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Implement Step 2 — Format

Goal: Two stacked, full-width selectable cards with SF Symbols replacing the previous side-by-side chips.

**Files:**
- Modify: `src/app/new/format.tsx`

- [ ] **Step 1: Replace `src/app/new/format.tsx` with full implementation**

```tsx
import { colors } from "@/components/ui";
import type { Format } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PlatformColor, Pressable, StyleSheet, Text, View } from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepFormat() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { format, setFormat } = useWizard();

  return (
    <StepScreen step={2} onNext={() => router.push("/new/players")}>
      <Text style={[styles.title, { color: tc.text }]}>Choose a format</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        You can change scoring rules in the next step.
      </Text>

      <FormatCard
        active={format === "americano"}
        symbol="arrow.triangle.2.circlepath"
        title="Americano"
        description="Rotate partners every round. Everyone plays with everyone."
        onPress={() => setFormat("americano")}
      />
      <FormatCard
        active={format === "mexicano"}
        symbol="trophy"
        title="Mexicano"
        description="Pair players by current standings each round."
        onPress={() => setFormat("mexicano")}
      />
    </StepScreen>
  );
}

function FormatCard({
  active,
  symbol,
  title,
  description,
  onPress,
}: {
  active: boolean;
  symbol: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { colors: tc } = useTheme();
  const useSymbol = process.env.EXPO_OS === "ios";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: active ? colors.primary : tc.border,
          backgroundColor: active ? colors.primary + "15" : tc.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        {useSymbol ? (
          <Image
            source={`sf:${symbol}`}
            tintColor={
              active ? colors.primary : (PlatformColor("label") as unknown as string)
            }
            style={{ width: 28, height: 28 }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardTitle,
              { color: active ? colors.primary : tc.text },
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.cardDesc, { color: tc.text }]}>{description}</Text>
        </View>
        {active && useSymbol ? (
          <Image
            source="sf:checkmark.circle.fill"
            tintColor={colors.primary}
            style={{ width: 22, height: 22 }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  card: {
    borderWidth: 2,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardDesc: { fontSize: 13, opacity: 0.75, marginTop: 2 },
});
```

- [ ] **Step 2: Manually verify Step 2 behavior**

Run: `bun expo start --ios`, advance through Step 1 to Step 2.

Expected:
- Progress bar: two segments filled.
- Two stacked cards; Americano selected by default (teal border, light teal fill, checkmark circle on right).
- Tapping Mexicano moves selection to it.
- Next is always enabled and routes to Step 3.

- [ ] **Step 3: Commit**

```bash
git add src/app/new/format.tsx
git commit -m "$(cat <<'EOF'
Implement wizard Step 2: format selection

Full-width Americano/Mexicano cards with SF Symbols and accent
border on selection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Implement Step 3 — Players

Goal: Add-and-remove players list with live count subtitle and validation that requires ≥ 4 players.

**Files:**
- Modify: `src/app/new/players.tsx`

- [ ] **Step 1: Replace `src/app/new/players.tsx` with full implementation**

```tsx
import { Button, Card, colors } from "@/components/ui";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepPlayers() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { players, setPlayers } = useWizard();
  const [input, setInput] = useState("");

  const useSymbol = process.env.EXPO_OS === "ios";

  const add = () => {
    const n = input.trim();
    if (!n) return;
    if (players.includes(n)) return;
    setPlayers([...players, n]);
    setInput("");
  };

  const remove = (p: string) => setPlayers(players.filter((x) => x !== p));

  return (
    <StepScreen step={3} onNext={() => router.push("/new/review")}>
      <Text style={[styles.title, { color: tc.text }]}>Add players</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        4 minimum • {players.length} added
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          placeholder="Player name"
          placeholderTextColor={tc.text + "66"}
          returnKeyType="done"
          style={[
            styles.input,
            { color: tc.text, borderColor: tc.border, backgroundColor: tc.card, flex: 1 },
          ]}
        />
        <Button title="Add" onPress={add} variant="secondary" />
      </View>

      {players.length > 0 && (
        <Card glass style={{ marginTop: 12 }}>
          {players.map((p, i) => (
            <View
              key={p}
              style={[
                styles.row,
                {
                  borderBottomWidth:
                    i === players.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: tc.border,
                },
              ]}
            >
              <Text style={{ color: tc.text, fontSize: 16 }}>
                {i + 1}. {p}
              </Text>
              <Pressable onPress={() => remove(p)} hitSlop={10}>
                {useSymbol ? (
                  <Image
                    source="sf:minus.circle.fill"
                    tintColor={colors.danger}
                    style={{ width: 22, height: 22 }}
                  />
                ) : (
                  <Text style={{ color: colors.danger }}>Remove</Text>
                )}
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {players.length > 0 && players.length < 4 && (
        <Text style={{ color: colors.danger, marginTop: 8 }}>
          Need at least 4 players.
        </Text>
      )}
      {players.length >= 4 && players.length % 4 !== 0 && (
        <Text style={{ color: colors.accent, marginTop: 8 }}>
          With {players.length} players, {players.length % 4} will rest each round.
        </Text>
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
```

- [ ] **Step 2: Manually verify Step 3 behavior**

Run: `bun expo start --ios`, navigate to Step 3.

Expected:
- Progress bar: three segments filled.
- Subtitle updates live as players are added ("4 minimum • 2 added").
- Add via Add button or keyboard submit; duplicates ignored.
- Remove via minus.circle.fill row icon.
- Next is disabled with < 4 players and shows the "Need at least 4 players" warning.
- With ≥ 4 players, Next is enabled and a resting-players notice appears for non-multiples of 4.

- [ ] **Step 3: Commit**

```bash
git add src/app/new/players.tsx
git commit -m "$(cat <<'EOF'
Implement wizard Step 3: player list

Add/remove players, live count subtitle, gate Next until at least
four players, surface resting-players notice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Implement Step 4 — Match settings, review, and create

Goal: Final step with points input, summary card with edit links to previous steps, and the create action.

**Files:**
- Modify: `src/app/new/review.tsx`

- [ ] **Step 1: Replace `src/app/new/review.tsx` with full implementation**

```tsx
import { Card, colors } from "@/components/ui";
import { createTournament } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepReview() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { name, format, points, players, setPoints, isStepValid } = useWizard();

  const create = () => {
    if (!isStepValid(4)) return;
    const t = createTournament({
      name: name.trim(),
      format,
      pointsPerMatch: Math.floor(Number(points)),
      players,
    });
    router.dismissTo(`/${t.id}`);
  };

  return (
    <StepScreen step={4} onNext={create} nextLabel="Create Tournament">
      <Text style={[styles.title, { color: tc.text }]}>Match settings</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        Total points distributed each match (e.g. 24 → team A score + team B score = 24).
      </Text>

      <TextInput
        value={points}
        onChangeText={setPoints}
        keyboardType="number-pad"
        style={[
          styles.input,
          { color: tc.text, borderColor: tc.border, backgroundColor: tc.card },
        ]}
      />

      <Text style={[styles.sectionLabel, { color: tc.text }]}>Review</Text>
      <Card glass>
        <SummaryRow
          label="Name"
          value={name.trim() || "—"}
          onEdit={() => router.dismissTo("/new")}
        />
        <Divider />
        <SummaryRow
          label="Format"
          value={format === "americano" ? "Americano" : "Mexicano"}
          onEdit={() => router.dismissTo("/new/format")}
        />
        <Divider />
        <SummaryRow
          label="Players"
          value={`${players.length}`}
          onEdit={() => router.dismissTo("/new/players")}
        />
      </Card>
    </StepScreen>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tc.text, opacity: 0.6, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: tc.text, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
          {value}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={10}>
        <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>
          Edit
        </Text>
      </Pressable>
    </View>
  );
}

function Divider() {
  const { colors: tc } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: tc.border,
        marginVertical: 4,
      }}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
```

Note on Edit links: `router.dismissTo("/new/...")` pops back through the stack to the matching step. From there the user advances forward through the wizard again — keeps state intact via context, no special "edit mode" to track.

- [ ] **Step 2: Manually verify Step 4 behavior**

Run: `bun expo start --ios`. Walk the full flow: enter "Test", pick Mexicano, add 4 players, advance to Step 4.

Expected:
- Progress bar: all four segments filled.
- Points input shows "24" by default; entering 0 or empty disables the create button.
- Summary card lists Name/Format/Players. Each Edit link returns to the relevant step with values preserved.
- Tapping "Create Tournament" creates the tournament, dismisses the modal, and lands on the tournament detail (`/${id}`).
- The new tournament appears at the top of the home list.

- [ ] **Step 3: Commit**

```bash
git add src/app/new/review.tsx
git commit -m "$(cat <<'EOF'
Implement wizard Step 4: settings, review, and create

Points input plus summary card with Edit links back to each prior
step. Final action creates the tournament and routes to its detail.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add Cancel header button with dirty-state confirmation

Goal: Top-left Cancel control on every step that dismisses the wizard, with a confirm dialog if any field has been edited.

**Files:**
- Modify: `src/app/new/_layout.tsx`
- Modify: `src/app/new/_chrome.tsx` (already exports `confirmDiscardThen`)

- [ ] **Step 1: Add a `CancelButton` component to `_chrome.tsx`**

Append to `src/app/new/_chrome.tsx`:

```tsx
import { Pressable as _Pressable } from "react-native";
// (re-use existing Pressable import — no change needed if already present)
```

(If `Pressable` is already imported in `_chrome.tsx`, skip the import line.)

Then add this exported component in `_chrome.tsx`:

```tsx
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
```

(`Pressable`, `Text`, `colors`, `useRouter`, `useWizard`, `confirmDiscardThen` are all already imported/defined in this file.)

- [ ] **Step 2: Wire `headerLeft` in `_layout.tsx`**

Replace `src/app/new/_layout.tsx` with:

```tsx
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";
import { CancelButton, WizardProvider } from "./_chrome";

export default function NewWizardLayout() {
  return (
    <WizardProvider>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitle: false,
          headerTitleStyle: { color: PlatformColor("label") as unknown as string },
          headerTintColor: PlatformColor("systemTeal") as unknown as string,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: "transparent" },
          headerLeft: () => <CancelButton />,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Step 1 of 4" }} />
        <Stack.Screen name="format" options={{ title: "Step 2 of 4" }} />
        <Stack.Screen name="players" options={{ title: "Step 3 of 4" }} />
        <Stack.Screen name="review" options={{ title: "Step 4 of 4" }} />
      </Stack>
    </WizardProvider>
  );
}
```

Note: setting `headerLeft` globally replaces the stack's default back chevron on inner screens. Back navigation between steps is intentionally driven by the bottom Back button only, matching the spec's linear-flow choice.

- [ ] **Step 3: Manually verify Cancel behavior**

Run: `bun expo start --ios`.

Expected:
- Cancel link appears in the top-left of every step.
- On Step 1 with no input, Cancel dismisses immediately.
- After typing a name (or any other change), Cancel shows "Discard tournament?" alert with Discard/Keep editing.
- Confirming Discard dismisses the modal; Keep editing keeps you on the current step with state intact.
- Bottom Back still works on Steps 2–4.

- [ ] **Step 4: Commit**

```bash
git add src/app/new/_chrome.tsx src/app/new/_layout.tsx
git commit -m "$(cat <<'EOF'
Add Cancel header with dirty-state discard confirmation

Cancel sits in every step's nav bar; prompts to confirm if any field
has been edited away from its initial value.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: End-to-end UAT and polish pass

Goal: Walk the complete flow on simulator, confirm all spec UAT items, and capture any tweaks.

- [ ] **Step 1: Full happy-path UAT**

Run: `bun expo start --ios`. From the home screen, create a tournament: name "UAT Cup", format Mexicano, players Alice/Bob/Carol/Dave/Eve/Frank, points 32.

Expected:
- Wizard opens full-screen.
- Progress bar advances 1→4 as you tap Next.
- Each step's Back button restores previous values.
- Step 4 summary shows "UAT Cup", "Mexicano", "6".
- Create routes to the tournament detail; home screen shows it at top with the right metadata.

- [ ] **Step 2: Edit-link UAT**

Open the wizard again. Fill steps 1–3, advance to Step 4, tap "Edit" on Format.

Expected:
- Lands on Step 2 with Mexicano (or whatever you chose) still selected.
- Tapping Next forward through 3 → 4 preserves the players you previously entered.

- [ ] **Step 3: Cancel + dirty UAT**

Open the wizard, type a name, tap Cancel.

Expected: alert appears; Discard dismisses; reopening starts with empty state.

Open again with no changes, tap Cancel.

Expected: dismisses immediately, no alert.

- [ ] **Step 4: Validation UAT**

- Step 1 with whitespace-only name: Next disabled.
- Step 3 with 3 players: Next disabled, danger warning visible.
- Step 4 with points cleared: Create disabled.
- Step 4 with points "0" or "abc": Create disabled.

Each should match expectations.

- [ ] **Step 5: Address any UAT findings**

If issues surface, fix them in the appropriate file from the prior tasks. Otherwise no edits are needed.

- [ ] **Step 6: Commit any UAT fixes (skip if none)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Polish wizard based on UAT findings

<replace with concrete summary of any fixes>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:**
  - 4-step wizard (Name/Format/Players/Review): Tasks 3–6 ✓
  - Full-screen modal presentation: Task 1 Step 6 ✓
  - WizardContext shared state: Task 2 ✓
  - Segmented progress bar: Task 2 ✓ (rendered via `<StepScreen>`)
  - Bottom AdaptiveGlass action bar with Back/Next: Task 2 ✓
  - Validation gating per step: Task 2 (`isStepValid`) used by `WizardFooter` and individual screens ✓
  - Cancel with discard confirm: Task 7 ✓
  - SF Symbols, glass, `borderCurve: "continuous"`, `PlatformColor`: applied throughout ✓
  - Edit links on review step using `dismissTo`: Task 6 ✓
  - Removal of single-screen `new.tsx`: Task 1 ✓

- **Placeholder scan:** No TBDs. Each step provides full code. UAT findings step is genuinely conditional.

- **Type consistency:** `WizardStep`, `Format`, and the `useWizard` field names match across `_chrome.tsx` and step screens. `createTournament` payload matches the existing store signature in [src/store/tournaments.ts](../../../src/store/tournaments.ts).

- **Risk callouts already in spec:** Header progress bar lives inside step content via `<StepScreen>`; edit links use `dismissTo` rather than a step-jump mechanism. Both are accepted trade-offs.
