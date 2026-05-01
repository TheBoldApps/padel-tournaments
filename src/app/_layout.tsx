import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider, useSession } from "@/lib/auth-context";
import { refetch, startSync, stopSync } from "@/lib/sync";
import { useTournaments } from "@/store/tournaments";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, PlatformColor } from "react-native";

export default function Layout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <SyncDriver />
        <RootStack />
      </SessionProvider>
    </ThemeProvider>
  );
}

function SyncDriver() {
  const { session } = useSession();
  const { tournaments } = useTournaments();
  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

  useEffect(() => {
    if (!session) {
      void stopSync();
      return;
    }
    void startSync(tournamentsRef.current);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refetch(tournamentsRef.current);
    });
    return () => {
      sub.remove();
    };
  }, [session?.user.id]);

  return null;
}

function RootStack() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;

  return (
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
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: "Tournaments" }} />
        <Stack.Screen
          name="new"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{ title: "Tournament", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="[id]/standings"
          options={{
            title: "Leaderboard",
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
            headerLargeTitle: false,
          }}
        />
        <Stack.Screen
          name="[id]/round-breakdown"
          options={{ title: "Round Breakdown", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="[id]/standings/csv"
          options={{ title: "Export CSV", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            headerLargeTitle: false,
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: "Profile", headerLargeTitle: false }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in"
          options={{
            title: "Sign in",
            headerLargeTitle: false,
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
