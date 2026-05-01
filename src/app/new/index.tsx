import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TextInput } from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepName() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { name, setName } = useWizard();

  return (
    <StepScreen step={1} onNext={() => router.push("/new/format")}>
      <Text style={[styles.title, { color: tc.text }]}>Name your tournament</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        Give it something memorable so you can find it later.
      </Text>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Friday night padel"
        placeholderTextColor={tc.text + "66"}
        returnKeyType="next"
        onSubmitEditing={() => name.trim() && router.push("/new/format")}
        style={[
          styles.input,
          {
            color: tc.text,
            borderColor: tc.border,
            backgroundColor: tc.card,
          },
        ]}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
});
