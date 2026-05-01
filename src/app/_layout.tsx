import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider, useSession } from "@/lib/auth-context";
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";

export default function Layout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </ThemeProvider>
  );
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
          options={{ title: "Standings", headerLargeTitle: false }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
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
            presentation: "formSheet",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
