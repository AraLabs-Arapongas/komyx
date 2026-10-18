import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { dismissAnnouncement, loadAnnouncements, type Announcement } from "@/lib/announcements";
import { WEB_URL } from "@/lib/supabase";
import { openWeb } from "@/lib/web";
import { colors, radius, space } from "./theme";

const TONES: Record<Announcement["tone"], { bg: string; border: string; fg: string; accent: string }> = {
  info: { bg: colors.brandSoft, border: "#f9c2d3", fg: colors.foreground, accent: colors.brandDeep },
  success: { bg: colors.mintSoft, border: "#a7e6d6", fg: "#065f46", accent: "#047857" },
  warning: { bg: colors.amberSoft, border: "#fde68a", fg: "#78350f", accent: colors.amber },
};

/** Komyx announcements at the top of the owner home. Closing one hides it right away. */
export function AnnouncementBanner() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const profileId = profile?.role === "owner" ? profile.id : null;
  const key = ["announcements", profileId];
  const q = useQuery({ queryKey: key, queryFn: () => loadAnnouncements(profileId!), enabled: Boolean(profileId) });
  const { refetch } = q;
  useFocusEffect(useCallback(() => { if (profileId) refetch(); }, [profileId, refetch]));

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissAnnouncement(id, profileId!),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Announcement[]>(key);
      qc.setQueryData<Announcement[]>(key, (list) => list?.filter((a) => a.id !== id));
      return { prev };
    },
    // Put it back if the dismissal didn't save.
    onError: (_err, _id, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  if (!profileId || !q.data?.length) return null;

  function open(url: string, title: string) {
    // Komyx paths open inside the app; anything else in the in-app browser.
    if (url.startsWith("/")) openWeb(`${WEB_URL}${url}`, title);
    else WebBrowser.openBrowserAsync(url);
  }

  return (
    <View style={{ gap: space.sm }}>
      {q.data.map((a) => {
        const t = TONES[a.tone] ?? TONES.info;
        return (
          <View key={a.id} accessibilityRole="summary" style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg }}>
            <Ionicons name="megaphone-outline" size={20} color={t.accent} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: t.fg }}>{a.title}</Text>
              {a.body ? <Text style={{ fontSize: 13, color: t.fg, lineHeight: 18 }}>{a.body}</Text> : null}
              {a.link_url ? (
                <Pressable onPress={() => open(a.link_url!, a.link_label || a.title)} hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: t.accent, textDecorationLine: "underline" }}>{a.link_label || "Saiba mais"}</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => dismiss.mutate(a.id)} hitSlop={10} accessibilityLabel="Fechar aviso" style={({ pressed }) => ({ opacity: pressed ? 1 : 0.6, marginTop: -2, marginRight: -4, padding: 2 })}>
              <Ionicons name="close" size={20} color={t.fg} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
