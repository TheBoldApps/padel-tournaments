import { AdaptiveGlass } from "@/components/ui";
import { Image } from "expo-image";
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export function SettingsSection({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ marginTop: 24 }, style]}>
      {title && (
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      )}
      <AdaptiveGlass
        style={{
          marginHorizontal: 16,
          borderRadius: 14,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        {children}
      </AdaptiveGlass>
      {footer && <Text style={styles.sectionFooter}>{footer}</Text>}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  last,
}: {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const inner = (
    <>
      <View style={styles.row}>
        {icon ? (
          process.env.EXPO_OS === "ios" ? (
            <Image
              source={`sf:${icon}`}
              tintColor={
                (destructive
                  ? PlatformColor("systemRed")
                  : PlatformColor("label")) as unknown as string
              }
              style={{ width: 22, height: 22 }}
            />
          ) : (
            <View style={{ width: 22, height: 22 }} />
          )
        ) : null}
        <Text
          style={[
            styles.label,
            {
              color: destructive
                ? (PlatformColor("systemRed") as unknown as string)
                : (PlatformColor("label") as unknown as string),
            },
          ]}
        >
          {label}
        </Text>
        {value && <Text style={styles.value}>{value}</Text>}
        {onPress && process.env.EXPO_OS === "ios" && (
          <Image
            source="sf:chevron.right"
            tintColor={PlatformColor("tertiaryLabel") as unknown as string}
            style={{ width: 8, height: 14 }}
          />
        )}
      </View>
      {!last && (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            marginLeft: 50,
            backgroundColor: PlatformColor("separator") as unknown as string,
          }}
        />
      )}
    </>
  );

  if (!onPress) {
    return <View>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginHorizontal: 32,
    marginBottom: 6,
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
    letterSpacing: 0.4,
  },
  sectionFooter: {
    marginHorizontal: 32,
    marginTop: 6,
    fontSize: 13,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  label: { flex: 1, fontSize: 17 },
  value: {
    fontSize: 17,
    color: PlatformColor("secondaryLabel") as unknown as string,
  },
});
