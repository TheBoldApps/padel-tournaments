import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { setThemeMode, useThemeMode, type ThemeMode } from "@/lib/theme-mode";
import * as Application from "expo-application";
import { router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { ActionSheetIOS, Alert, Linking, ScrollView } from "react-native";

const TERMS_URL = "https://example.com/padel-tournaments/terms";
const PRIVACY_URL = "https://example.com/padel-tournaments/privacy";
const FEEDBACK_EMAIL = "hello@jiridiblik.com";

const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  auto: "Automatic",
};

export default function Settings() {
  const { user, isAnonymous } = useSession();
  const themeMode = useThemeMode();

  const pickTheme = () => {
    const options: { label: string; value: ThemeMode }[] = [
      { label: "Automatic", value: "auto" },
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
    ];
    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Appearance",
          options: [...options.map((o) => o.label), "Cancel"],
          cancelButtonIndex: options.length,
        },
        (idx) => {
          if (idx == null || idx === options.length) return;
          setThemeMode(options[idx].value);
        }
      );
    } else {
      Alert.alert("Appearance", undefined, [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => setThemeMode(o.value),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  };

  const onSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign back in to sync changes.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const onRate = async () => {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    } else {
      Alert.alert("Rating not available right now.");
    }
  };

  const versionFooter = `Version ${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 }}
      style={{ flex: 1 }}
    >
      <SettingsSection
        title="Appearance"
        footer="Automatic follows your iOS Light/Dark setting."
      >
        <SettingsRow
          icon="circle.lefthalf.filled"
          label="Theme"
          value={THEME_LABELS[themeMode]}
          onPress={pickTheme}
          last
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person.crop.circle"
          label="Profile"
          value={isAnonymous ? "Guest" : user?.email ?? "Signed in"}
          onPress={() => router.push("/profile")}
        />
        {isAnonymous ? (
          <SettingsRow
            icon="person.badge.plus"
            label="Create account"
            onPress={() => router.push("/sign-in")}
            last
          />
        ) : (
          <SettingsRow
            icon="rectangle.portrait.and.arrow.right"
            label="Sign out"
            destructive
            onPress={onSignOut}
            last
          />
        )}
      </SettingsSection>

      {isAnonymous ? (
        <SettingsSection title="Reset" footer="Clears your guest session.">
          <SettingsRow
            icon="arrow.counterclockwise"
            label="Reset guest account"
            destructive
            last
            onPress={() => {
              Alert.alert(
                "Reset guest account?",
                "This signs you out. Tournaments saved on this device will sync only after you sign back in.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                      await supabase.auth.signOut();
                    },
                  },
                ]
              );
            }}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="About" footer={versionFooter}>
        <SettingsRow
          icon="doc.text"
          label="Terms & Conditions"
          onPress={() => Linking.openURL(TERMS_URL)}
        />
        <SettingsRow
          icon="hand.raised"
          label="Privacy Policy"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <SettingsRow
          icon="star"
          label="Rate app"
          onPress={onRate}
        />
        <SettingsRow
          icon="envelope"
          label="Send feedback"
          onPress={() =>
            Linking.openURL(
              `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
                "Padel Tournaments feedback"
              )}`
            )
          }
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}
