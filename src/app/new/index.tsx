import { AdaptiveGlass, colors } from "@/components/ui";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  PlatformColor,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepName() {
  const router = useRouter();
  const { name, setName } = useWizard();
  const [touched, setTouched] = useState(false);
  const useSymbol = process.env.EXPO_OS === "ios";
  const showError = touched && name.trim().length === 0;

  const goNext = () => {
    setTouched(true);
    if (name.trim()) router.push("/new/format");
  };

  return (
    <StepScreen step={1} onNext={goNext}>
      <View style={styles.iconPill}>
        {useSymbol ? (
          <Image
            source="sf:trophy.fill"
            tintColor={colors.primary}
            style={{ width: 18, height: 18 }}
          />
        ) : (
          <Text style={{ color: colors.primary, fontWeight: "700" }}>•</Text>
        )}
      </View>

      <Text style={styles.title}>Name your tournament</Text>
      <Text style={styles.subtitle}>
        Give it something memorable so you can find it later.
      </Text>

      <AdaptiveGlass style={styles.inputCard}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          placeholder="Friday night padel"
          placeholderTextColor={
            PlatformColor("placeholderText") as unknown as string
          }
          returnKeyType="next"
          onSubmitEditing={goNext}
          style={styles.input}
        />
      </AdaptiveGlass>

      {showError ? (
        <Text style={styles.error}>Give your tournament a name to continue.</Text>
      ) : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: PlatformColor("label") as unknown as string,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 8,
    marginBottom: 24,
  },
  inputCard: {
    borderRadius: 18,
    borderCurve: "continuous",
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  input: {
    fontSize: 22,
    fontWeight: "600",
    paddingVertical: 18,
    color: PlatformColor("label") as unknown as string,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 10,
    marginLeft: 4,
  },
});
