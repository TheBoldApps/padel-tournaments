Expo Router project with API Routes and server-rendering.

```
src/
├── app/ # routes
│   ├── _layout.tsx
│   └── index.tsx
└── components/
```

## Principles

- Target iOS, Android, web.
- Install dependencies with `bunx expo add <package>`
- Use `expo-image` for images and icons.
- Routes go in `src/app/`, components go in `src/components/`
- Use kebab-case for file names (e.g., `user-card.tsx`)

## Design Preferences

- **Always prefer native iOS liquid glass components.** Use `expo-glass-effect` (`GlassView`, `isLiquidGlassAvailable`) for surfaces and floating controls; never reach for custom translucent `View`s, gradients, or hand-rolled blur.
- For pre-iOS-26 / Android / web fallbacks, use `expo-blur`'s `BlurView` with `systemMaterial` tint — wired through the `AdaptiveGlass` helper in `src/components/ui.tsx`.
- Use SF Symbols via `expo-image` (`source="sf:name"`) on iOS instead of emoji or vector-icons.
- Use `PlatformColor("label")` / `PlatformColor("secondaryLabel")` etc. for text color so dark mode works automatically.
- Headers should be transparent with large titles and `contentInsetAdjustmentBehavior="automatic"` lists/scrollviews underneath, so content slides under the blurred nav bar.
- Modal screens that should pick up the iOS 26 glass material must use `presentation: "formSheet"` with `contentStyle: { backgroundColor: "transparent" }`.
- Rounded corners use `borderCurve: "continuous"` (Apple-style squircle) unless creating a capsule.

## Components

- `AdaptiveGlass` ([src/components/ui.tsx](src/components/ui.tsx)) — wraps `GlassView` with a `BlurView` fallback. Use this instead of `View` for any translucent surface.
- `GlassFab` ([src/components/ui.tsx](src/components/ui.tsx)) — liquid-glass floating action button with SF Symbol + label.
- `Card` ([src/components/ui.tsx](src/components/ui.tsx)) — pass `glass` prop to render on glass.
