import { useThemeMode } from "@/lib/theme-mode";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as RNTheme,
} from "@react-navigation/native";
import { useColorScheme } from "react-native";

export function ThemeProvider(props: { children: React.ReactNode }) {
  // Subscribe to user override so the navigation theme re-renders on toggle.
  // (theme-mode.ts pushes the resolved value into Appearance, so
  // useColorScheme() reflects it correctly.)
  useThemeMode();
  const colorScheme = useColorScheme();
  return (
    <RNTheme value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {props.children}
    </RNTheme>
  );
}
