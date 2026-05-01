import { Stack } from "expo-router";
import { PlatformColor } from "react-native";
import { WizardProvider } from "./_chrome";

export default function NewWizardLayout() {
  return (
    <WizardProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: PlatformColor(
              "systemGroupedBackground"
            ) as unknown as string,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="format" />
        <Stack.Screen name="players" />
        <Stack.Screen name="review" />
      </Stack>
    </WizardProvider>
  );
}
