import { Button } from "@/components/ui";
import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import {
  Alert,
  Platform,
  PlatformColor,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function Profile() {
  const { user, isAnonymous } = useSession();
  const [name, setName] = useState<string>(
    (user?.user_metadata?.display_name as string) ?? ""
  );
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name },
    });
    setSaving(false);
    if (error) Alert.alert("Couldn't save", error.message);
  };

  const linkApple = async () => {
    if (Platform.OS !== "ios") return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      // While the anonymous session is active, signing in with Apple links the identity
      // and preserves the same auth.users.id.
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      Alert.alert("Linked", "Your account is now signed in with Apple.");
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Couldn't link Apple", String(e?.message ?? e));
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 }}
      style={{ flex: 1 }}
    >
      <SettingsSection title="Display name">
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={
              PlatformColor("placeholderText") as unknown as string
            }
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={saveName}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Identity">
        <SettingsRow
          icon="envelope"
          label="Email"
          value={user?.email ?? "—"}
          last={isAnonymous && Platform.OS !== "ios"}
        />
        {isAnonymous && Platform.OS === "ios" && (
          <SettingsRow
            icon="apple.logo"
            label="Link Apple ID"
            onPress={linkApple}
            last
          />
        )}
      </SettingsSection>

      <View style={{ padding: 16, marginTop: 16 }}>
        <Button
          title={saving ? "Saving…" : "Save"}
          onPress={saveName}
          disabled={saving}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputRow: { paddingHorizontal: 16, paddingVertical: 12 },
  input: {
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
  },
});
