import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  PlatformColor,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// Platform is imported solely for the KeyboardAvoidingView `behavior` prop,
// which is RN-typed against Platform.OS. All other OS checks use EXPO_OS.
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  // True when the verify step should bind the new email to the current
  // (anonymous) user instead of starting a fresh session.
  const [isUpgrade, setIsUpgrade] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const upgrading = Boolean(user?.is_anonymous);
    const { error } = upgrading
      ? await supabase.auth.updateUser({ email })
      : await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't send code", error.message);
      return;
    }
    setIsUpgrade(upgrading);
    setStage("code");
  };

  const verifyCode = async () => {
    setLoading(true);
    // Re-check at verify time: if the user signed out between sending the
    // code and entering it, isUpgrade is stale.
    const {
      data: { user: cur },
    } = await supabase.auth.getUser();
    const reallyUpgrade = isUpgrade && Boolean(cur?.is_anonymous);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: reallyUpgrade ? "email_change" : "email",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Invalid code", error.message);
      return;
    }
    router.dismissAll();
  };

  const appleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      // Save name on first sign-in (Apple only returns it once)
      if (credential.fullName?.givenName) {
        const display = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ]
          .filter(Boolean)
          .join(" ");
        await supabase.auth.updateUser({ data: { display_name: display } });
      }
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Apple Sign-In failed", String(e?.message ?? e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, gap: 16 }}
      >
        {process.env.EXPO_OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ height: 48 }}
            onPress={appleSignIn}
          />
        )}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.line} />
        </View>

        {stage === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={
                PlatformColor("placeholderText") as unknown as string
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
            <Button
              title={loading ? "Sending…" : "Email me a code"}
              onPress={sendCode}
              disabled={loading || !email.includes("@")}
            />
          </>
        ) : (
          <>
            <Text style={styles.helper}>
              We sent a 6-digit code to {email}. Enter it below.
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={
                PlatformColor("placeholderText") as unknown as string
              }
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
            <Button
              title={loading ? "Verifying…" : "Verify"}
              onPress={verifyCode}
              disabled={loading || code.length < 6}
            />
            <Button
              title="Use a different email"
              variant="ghost"
              onPress={() => {
                setStage("email");
                setCode("");
              }}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: 8 },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
  },
  dividerText: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontSize: 13,
  },
  helper: {
    color: PlatformColor("secondaryLabel") as unknown as string,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: PlatformColor("separator") as unknown as string,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: PlatformColor("label") as unknown as string,
    borderCurve: "continuous",
  },
});
