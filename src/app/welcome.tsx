import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PlatformColor,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome() {
  const [loading, setLoading] = useState(false);

  const continueAnonymously = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (error) Alert.alert("Couldn't continue", error.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source="sf:figure.tennis"
          tintColor={PlatformColor("label") as unknown as string}
          style={{ width: 64, height: 64, marginBottom: 16 }}
        />
        <Text style={styles.title}>Padel Tournaments</Text>
        <Text style={styles.subtitle}>
          Run Americano and Mexicano nights with friends.
        </Text>
      </View>

      <View style={styles.actions}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Button
              title="Sign in / Create account"
              onPress={() => router.push("/sign-in")}
            />
            <Button
              title="Continue without account"
              variant="ghost"
              onPress={continueAnonymously}
            />
            <Text style={styles.fineprint}>
              You can create an account anytime — your tournaments stay with you.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
  },
  actions: { gap: 12, paddingBottom: 12 },
  fineprint: {
    marginTop: 8,
    fontSize: 12,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
  },
});
