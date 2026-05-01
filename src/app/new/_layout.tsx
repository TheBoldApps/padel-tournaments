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
