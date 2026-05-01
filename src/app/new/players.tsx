import { AdaptiveGlass, colors } from "@/components/ui";
import { useTournaments } from "@/store/tournaments";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StepScreen, useWizard } from "./_chrome";

const norm = (s: string) => s.trim().toLowerCase();

export default function StepPlayers() {
  const router = useRouter();
  const { players, setPlayers } = useWizard();
  const { tournaments } = useTournaments();
  const [input, setInput] = useState("");

  const useSymbol = process.env.EXPO_OS === "ios";

  const suggested = useMemo(() => {
    const seen = new Set(players.map(norm));
    const pool: string[] = [];
    for (const t of tournaments) {
      for (const p of t.players) {
        const k = norm(p);
        if (!seen.has(k) && !pool.some((x) => norm(x) === k)) pool.push(p);
      }
      if (pool.length >= 24) break;
    }
    return pool.slice(0, 12);
  }, [tournaments, players]);

  const add = () => {
    const n = input.trim();
    if (!n) return;
    if (players.some((p) => norm(p) === norm(n))) {
      setInput("");
      return;
    }
    setPlayers([...players, n]);
    setInput("");
  };

  const addOne = (n: string) => {
    if (!players.some((p) => norm(p) === norm(n))) setPlayers([...players, n]);
  };

  const remove = (p: string) => setPlayers(players.filter((x) => x !== p));

  return (
    <StepScreen step={3} onNext={() => router.push("/new/review")}>
      <View style={styles.heroWrap}>
        <Text style={styles.heroEmoji}>🎾</Text>
      </View>
      <Text style={styles.title}>Players</Text>
      <Text style={styles.subtitle}>
        Add at least 4 players. Multiples of 4 fill all courts.
      </Text>

      <Text style={styles.sectionHeader}>ADD PLAYER</Text>
      <AdaptiveGlass style={styles.inputCard}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          placeholder="Player name"
          placeholderTextColor={
            PlatformColor("placeholderText") as unknown as string
          }
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable
          onPress={add}
          disabled={!input.trim()}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              opacity: !input.trim() ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
          hitSlop={6}
        >
          {useSymbol ? (
            <Image
              source="sf:plus"
              tintColor="#FFFFFF"
              style={{ width: 18, height: 18 }}
            />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>+</Text>
          )}
        </Pressable>
      </AdaptiveGlass>

      <Pressable
        onPress={() => Alert.alert("Coming soon")}
        style={({ pressed }) => [styles.contactsLink, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={6}
      >
        {useSymbol ? (
          <Image
            source="sf:person.crop.circle.badge.plus"
            tintColor={colors.primary}
            style={{ width: 16, height: 16 }}
          />
        ) : null}
        <Text style={styles.contactsText}>Add from Contacts</Text>
      </Pressable>

      <View style={styles.selectedHeaderRow}>
        <Text style={styles.sectionHeader}>SELECTED PLAYERS</Text>
        {players.length > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{players.length}</Text>
            {useSymbol ? (
              <Image
                source="sf:person.2.fill"
                tintColor="#FFFFFF"
                style={{ width: 12, height: 12 }}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {players.length === 0 ? (
        <Text style={styles.emptyText}>No players yet — add at least 4 to continue.</Text>
      ) : (
        <AdaptiveGlass style={styles.listCard}>
          {players.map((p, i) => (
            <View key={`${i}:${p}`}>
              <View style={styles.selectedRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.selectedName}>{p}</Text>
                <Pressable
                  onPress={() => remove(p)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  {useSymbol ? (
                    <Image
                      source="sf:minus.circle.fill"
                      tintColor={colors.danger}
                      style={{ width: 22, height: 22 }}
                    />
                  ) : (
                    <Text style={{ color: colors.danger, fontWeight: "800" }}>−</Text>
                  )}
                </Pressable>
              </View>
              {i < players.length - 1 ? <View style={styles.hairline} /> : null}
            </View>
          ))}
        </AdaptiveGlass>
      )}

      {suggested.length > 0 ? (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 18 }]}>
            SUGGESTED PLAYERS
          </Text>
          <AdaptiveGlass style={styles.listCard}>
            {suggested.map((p, i) => (
              <View key={`${i}:${p}`}>
                <Pressable
                  onPress={() => addOne(p)}
                  style={({ pressed }) => [
                    styles.suggestedRow,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.selectedName}>{p}</Text>
                  {useSymbol ? (
                    <Image
                      source="sf:plus.circle.fill"
                      tintColor={colors.primary}
                      style={{ width: 22, height: 22 }}
                    />
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: "800" }}>+</Text>
                  )}
                </Pressable>
                {i < suggested.length - 1 ? <View style={styles.hairline} /> : null}
              </View>
            ))}
          </AdaptiveGlass>
        </>
      ) : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  heroWrap: { alignItems: "center", marginBottom: 12 },
  heroEmoji: { fontSize: 64, lineHeight: 72 },
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
    marginBottom: 18,
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
  inputCard: {
    borderRadius: 16,
    borderCurve: "continuous",
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor("separator") as unknown as string,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    paddingVertical: 14,
    color: PlatformColor("label") as unknown as string,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  contactsText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  selectedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
    marginRight: 4,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  listCard: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor("separator") as unknown as string,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  suggestedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },
  selectedName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    color: PlatformColor("label") as unknown as string,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor("separator") as unknown as string,
    marginLeft: 58,
  },
  emptyText: {
    fontSize: 14,
    color: PlatformColor("secondaryLabel") as unknown as string,
    textAlign: "center",
    paddingVertical: 18,
  },
});
