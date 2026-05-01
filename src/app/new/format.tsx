import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function StepFormat() {
  const { colors: tc } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: tc.text, fontSize: 28, fontWeight: "700" }}>
        Choose a format
      </Text>
    </View>
  );
}
