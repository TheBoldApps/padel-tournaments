import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as Application from "expo-application";
import { router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { Alert, Linking, ScrollView } from "react-native";

const TERMS_URL = "https://example.com/padel-tournaments/terms";
const PRIVACY_URL = "https://example.com/padel-tournaments/privacy";
const FEEDBACK_EMAIL = "hello@jiridiblik.com";

export default function Settings() {
  const { user, isAnonymous } = useSession();

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
