import { ThemeProvider } from "@/components/theme-provider";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0EA5A4" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Padel Tournaments" }} />
        <Stack.Screen name="new" options={{ title: "New Tournament", presentation: "modal" }} />
        <Stack.Screen name="[id]/index" options={{ title: "Tournament" }} />
        <Stack.Screen name="[id]/standings" options={{ title: "Standings" }} />
      </Stack>
    </ThemeProvider>
  );
}
