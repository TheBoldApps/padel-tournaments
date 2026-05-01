import { AdaptiveGlass, colors } from "@/components/ui";
import type { Format } from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

type Option = {
  id: Format;
  title: string;
  description: string;
};

const SECTIONS: { header: string; options: Option[] }[] = [
  {
    header: "AMERICANO",
    options: [
      {
        id: "americano",
        title: "Classic Americano",
        description:
          "Rotate partners every round so everyone plays with everyone. Great for casual social play.",
      },
    ],
  },
  {
    header: "MEXICANO",
    options: [
      {
        id: "mexicano",
        title: "Classic Mexicano",
        description:
          "Pair players each round based on the current standings. Top scorers play together.",
      },
    ],
  },
];

export default function StepFormat() {
  const router = useRouter();
  const { format, setFormat } = useWizard();
  const useSymbol = process.env.EXPO_OS === "ios";

  return (
    <StepScreen step={2} onNext={() => router.push("/new/players")}>
      <View style={styles.heroWrap}>
        <Text style={styles.heroEmoji}>🎯</Text>
      </View>
      <Text style={styles.title}>Tournament Type</Text>
      <Text style={styles.subtitle}>
        Pick the format that fits your group.
      </Text>

      {SECTIONS.map((section) => (
        <View key={section.header} style={{ marginTop: 18 }}>
          <Text style={styles.sectionHeader}>{section.header}</Text>
          {section.options.map((opt) => {
            const active = format === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setFormat(opt.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <AdaptiveGlass
                  style={StyleSheet.flatten([
                    styles.row,
                    {
                      borderColor: active
                        ? colors.primary
                        : (PlatformColor("separator") as unknown as string),
                      borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                    },
                  ])}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{opt.title}</Text>
                    <Text style={styles.rowDesc}>{opt.description}</Text>
                  </View>
                  {active && useSymbol ? (
                    <Image
                      source="sf:checkmark.circle.fill"
                      tintColor={colors.primary}
                      style={{ width: 24, height: 24 }}
                    />
                  ) : active ? (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                        ✓
                      </Text>
                    </View>
                  ) : null}
                </AdaptiveGlass>
              </Pressable>
            );
          })}
        </View>
      ))}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  heroEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: PlatformColor("label") as unknown as string,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 6,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderCurve: "continuous",
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label") as unknown as string,
  },
  rowDesc: {
    fontSize: 14,
    color: PlatformColor("secondaryLabel") as unknown as string,
    marginTop: 4,
    lineHeight: 19,
  },
});
