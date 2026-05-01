import { Card, colors } from "@/components/ui";
import { createTournament } from "@/store/tournaments";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

export default function StepReview() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const { name, format, points, players, setPoints, isStepValid } = useWizard();

  const create = () => {
    if (!isStepValid(4)) return;
    const t = createTournament({
      name: name.trim(),
      format,
      pointsPerMatch: Math.floor(Number(points)),
      players,
    });
    router.dismissTo(`/${t.id}`);
  };

  return (
    <StepScreen step={4} onNext={create} nextLabel="Create Tournament">
      <Text style={[styles.title, { color: tc.text }]}>Match settings</Text>
      <Text style={[styles.subtitle, { color: tc.text }]}>
        Total points distributed each match (e.g. 24 → team A score + team B score = 24).
      </Text>

      <TextInput
        value={points}
        onChangeText={setPoints}
        keyboardType="number-pad"
        style={[
          styles.input,
          { color: tc.text, borderColor: tc.border, backgroundColor: tc.card },
        ]}
      />

      <Text style={[styles.sectionLabel, { color: tc.text }]}>Review</Text>
      <Card glass>
        <SummaryRow
          label="Name"
          value={name.trim() || "—"}
          onEdit={() => router.dismissTo("/new")}
        />
        <Divider />
        <SummaryRow
          label="Format"
          value={format === "americano" ? "Americano" : "Mexicano"}
          onEdit={() => router.dismissTo("/new/format")}
        />
        <Divider />
        <SummaryRow
          label="Players"
          value={`${players.length}`}
          onEdit={() => router.dismissTo("/new/players")}
        />
      </Card>
    </StepScreen>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tc.text, opacity: 0.6, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: tc.text, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
          {value}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={10}>
        <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>
          Edit
        </Text>
      </Pressable>
    </View>
  );
}

function Divider() {
  const { colors: tc } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: tc.border,
        marginVertical: 4,
      }}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 6, marginBottom: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    fontSize: 17,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
