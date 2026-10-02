import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { FestiveHeader } from "./festive-header";

/** The subset of react-navigation's header props we read (native-stack and bottom-tabs agree on it). */
type Props = {
  route: { name: string };
  navigation: { goBack: () => void };
  back?: { title?: string } | undefined;
  options: { title?: string; headerTitle?: unknown; presentation?: string; headerRight?: (p: { tintColor?: string; canGoBack: boolean }) => ReactNode };
};

/**
 * The same festive banner as Início, drawn by the navigator for every Stack and Tabs screen that
 * does not render its own FestiveHeader: bunting, balloons, confetti, big title, back arrow.
 */
export function FestiveNavHeader(props: Props) {
  const { org, profile } = useAuth();
  const back = Boolean(props.back);
  const modal = props.options.presentation === "modal";
  const title = typeof props.options.headerTitle === "string" ? props.options.headerTitle : props.options.title ?? props.route.name;
  const right = props.options.headerRight?.({ tintColor: "#fff", canGoBack: back });
  const eyebrow = profile ? org?.name : "Komyx";
  return (
    <FestiveHeader
      compact
      animated
      bleed={false}
      topInset={modal ? 0 : undefined}
      eyebrow={eyebrow}
      title={title}
      right={right}
      onBack={back ? props.navigation.goBack : undefined}
      backIcon={modal ? "close" : "arrow-back"}
    />
  );
}
