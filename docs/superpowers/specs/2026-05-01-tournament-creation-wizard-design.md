# Tournament Creation Wizard — Design

## Goal

Replace the current single-screen tournament creation form ([src/app/new.tsx](../../../src/app/new.tsx)) with a clear, step-by-step wizard. Users should always know which step they are on, what is required to advance, and what they have entered so far.

## Scope

- Convert tournament creation into a 4-step full-screen wizard.
- Preserve the existing data model and `createTournament` call — no changes to [src/store/tournaments](../../../src/store/tournaments).
- Replace, not augment: the old single-screen form is removed.

Out of scope:
- Persisting wizard progress across app restarts.
- Editing existing tournaments through this wizard.
- Automated tests.

## User Flow

1. User taps "New Tournament" on the home screen.
2. Full-screen modal opens to **Step 1 — Name**.
3. User progresses through **Format → Players → Review** via a bottom Next button.
4. On Step 4, user taps **Create Tournament**; app navigates to `/${tournament.id}`.
5. At any point, user can tap **Cancel** in the nav bar to abandon the flow (with confirmation if any data was entered).

## Architecture

### Routing

Replace the single file `src/app/new.tsx` with a nested route group at `src/app/new/`:

```
src/app/new/
├── _layout.tsx     # WizardProvider, progress bar, bottom action bar, Stack
├── index.tsx       # Step 1: Name
├── format.tsx      # Step 2: Format
├── players.tsx     # Step 3: Players
└── review.tsx      # Step 4: Match settings + Review
```

Update the root [src/app/_layout.tsx](../../../src/app/_layout.tsx): the `Stack.Screen name="new"` entry becomes `name="new"` with `presentation: "fullScreenModal"` (replacing `presentation: "formSheet"` and the sheet detents). Remove `sheetGrabberVisible` and `sheetAllowedDetents`.

### State Management

A `WizardContext` defined in `new/_layout.tsx`:

```ts
type WizardState = {
  name: string;
  format: Format;       // "americano" | "mexicano"
  points: string;       // raw input string; parsed at submit
  players: string[];
  setName: (v: string) => void;
  setFormat: (v: Format) => void;
  setPoints: (v: string) => void;
  setPlayers: (v: string[]) => void;
  isStepValid: (step: 1 | 2 | 3 | 4) => boolean;
};
```

Initial values match current defaults: `name=""`, `format="americano"`, `points="24"`, `players=[]`.

Validation rules per step:
- Step 1: `name.trim().length > 0`
- Step 2: always `true` (default selected)
- Step 3: `players.length >= 4`
- Step 4: `Number.isFinite(parseInt(points)) && parseInt(points) > 0`

### Wizard Chrome

`new/_layout.tsx` renders, top-to-bottom:

1. **Stack** (Expo Router) for the four step screens, with `headerTransparent`, large title disabled, header center title `"Step N of 4"`, and a left header button "Cancel".
2. **Progress bar** — placed inside each step screen's content area at the top (alternative: rendered by `_layout` via a custom header). Four pill segments, `height: 6`, `borderRadius: 3`, `borderCurve: "continuous"`, `gap: 4`. Filled segments use accent color; unfilled use `tc.border`. The current step's segment is filled.
3. **Step content** (the routed screen).
4. **Footer action bar** — fixed at bottom, wrapped in `AdaptiveGlass`, with safe-area inset padding. Contains "Back" (hidden on Step 1) and "Next" (becomes "Create Tournament" on Step 4). Disabled when `isStepValid(currentStep)` is false.

Because Expo Router does not give `_layout` direct access to the routed screen below it via standard slots in a Stack navigator, the cleanest implementation is:

- The progress bar and footer are rendered **inside each step screen** as shared components imported from `src/app/new/_chrome.tsx` (a non-routed file under the route group; Expo Router ignores files prefixed with `_`).
- Each step screen calls `<WizardChrome step={N} onNext={...} />` which reads `WizardContext` and dispatches navigation.

`_chrome.tsx` exports:
- `WizardProvider` and `useWizard`
- `<ProgressBar step={N} />`
- `<WizardFooter step={N} onNext={() => void} onBack={() => void} />`

### Navigation

- **Next**: `router.push("/new/format")`, `/new/players`, `/new/review` from steps 1–3 respectively.
- **Back**: `router.back()`.
- **Step 4 primary action**: call existing `createTournament(...)`, then `router.dismissTo(\`/${t.id}\`)` (or `replace` after `dismiss`) to close the modal and land on the tournament detail.
- **Cancel** (header): if any field has been edited from initial state, show `Alert.alert("Discard tournament?", ...)` with "Discard" / "Keep editing"; on confirm, `router.dismiss()`. If nothing entered, dismiss immediately.

### Per-Step Content

**Step 1 — `new/index.tsx`**
- Large in-page title: "Name your tournament"
- Helper text below title
- Single `TextInput` styled like the current form
- Autofocus on mount

**Step 2 — `new/format.tsx`**
- Large in-page title: "Choose a format"
- Two stacked cards (full width, not side-by-side):
  - Americano — SF Symbol `arrow.triangle.2.circlepath`, bold name, "Rotate partners every round"
  - Mexicano — SF Symbol `trophy`, bold name, "Pair by current standings"
- Selected card uses `colors.primary` border + `colors.primary + "15"` fill
- Tap to select; only one selected at a time

**Step 3 — `new/players.tsx`**
- Large in-page title: "Add players"
- Subtitle: live count — `"4 minimum • {n} added"`
- `TextInput` + Add button row (same as current)
- Players list inside a glass `Card`, identical row markup to current implementation
- Warnings preserved: "Need at least 4 players" and "With N players, X will rest each round"

**Step 4 — `new/review.tsx`**
- Large in-page title: "Match settings"
- Numeric `TextInput` for points + helper text (same as current)
- Below, glass `Card` summary with three rows:
  - "Name" — value, with "Edit" link → `router.push("/new")` (back through stack)
  - "Format" — capitalized value, with "Edit" → `/new/format`
  - "Players" — count, with "Edit" → `/new/players`
- Footer primary button label: "Create Tournament"
- On submit: builds the same payload as today, calls `createTournament`, then dismisses and navigates to `/${t.id}`

## Components Touched

- **New:** `src/app/new/_layout.tsx`, `src/app/new/_chrome.tsx`, `src/app/new/index.tsx`, `src/app/new/format.tsx`, `src/app/new/players.tsx`, `src/app/new/review.tsx`
- **Modified:** [src/app/_layout.tsx](../../../src/app/_layout.tsx) — change `new` screen presentation to `fullScreenModal`
- **Deleted:** [src/app/new.tsx](../../../src/app/new.tsx)

The `FormatChip` component currently embedded in `new.tsx` is replaced by the new full-width format cards inside `format.tsx`; it is not extracted because it has no other consumer.

## Visual & Interaction Standards

Follows the project's iOS liquid glass guidelines:
- Footer uses `AdaptiveGlass` (per [CLAUDE.md](../../../CLAUDE.md)).
- Format cards use `borderCurve: "continuous"`.
- SF Symbols via `expo-image` `source="sf:..."`.
- `PlatformColor("label")` / `PlatformColor("secondaryLabel")` for text.
- Header transparent; large titles disabled inside the wizard for tighter step layout.

## Testing

Manual UAT on iOS simulator:
- Each step's Next button is gated by validity.
- Progress bar fills correctly per step.
- Back navigation preserves all entered data.
- Cancel with no edits dismisses immediately; with edits prompts to discard.
- Final create produces a tournament with the correct name, format, points, and players, and routes to its detail screen.
- Behavior on Android/web: footer action bar still works; large title behavior may differ but flow remains usable.

## Risks & Open Questions

- **Header rendering of progress bar:** Expo Router stacks do not directly support injecting custom UI between the nav bar and screen content from `_layout`. The chosen approach renders the progress bar inside each step screen via `<ProgressBar />`. Acceptable trade-off; alternative would be a custom `header` callback in `Stack.Screen` options.
- **Edit-link navigation on review:** Using `router.push` for edit links re-enters the stack; users return to step 4 by tapping Next forward through steps 2/3 again. This keeps state management simple. If users find it confusing, a future change can swap to a "step jump" mechanism.
