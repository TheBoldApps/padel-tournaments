import { tournamentCsv } from "@/lib/export-csv";
import { useTournaments } from "@/store/tournaments";
import { router, useLocalSearchParams } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

export default function CsvExport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournaments } = useTournaments();
  const t = tournaments.find((x) => x.id === id);
  const ran = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!t || ran.current) return;
    ran.current = true;
    (async () => {
      const csv = tournamentCsv(t);
      const safeName = t.name.replace(/[^a-z0-9_-]+/gi, "_") || "tournament";
      const file = new File(Paths.cache, `${safeName}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
      } else {
        Alert.alert("Sharing not available on this device.");
      }
      if (!mounted.current) return;
      if (router.canGoBack()) router.back();
    })();
  }, [t?.id]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
