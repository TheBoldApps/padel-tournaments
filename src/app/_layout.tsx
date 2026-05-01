import { ThemeProvider } from "@/components/theme-provider";
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: "transparent" },
          headerTitleStyle: { color: PlatformColor("label") as unknown as string },
          headerLargeTitleStyle: { color: PlatformColor("label") as unknown as string },
          headerTintColor: PlatformColor("systemTeal") as unknown as string,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Tournaments" }} />
        <Stack.Screen
          name="new"
          options={{
            title: "New Tournament",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: "transparent" },
            headerLargeTitle: false,
          }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{ title: "Tournament", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="[id]/standings"
          options={{ title: "Standings", headerLargeTitle: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
