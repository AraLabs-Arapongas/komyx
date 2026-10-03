import { router } from "expo-router";

/** Opens a Komyx web page inside the app (WebView screen) instead of leaving for the browser. */
export function openWeb(url: string, title: string) {
  router.push({ pathname: "/web", params: { url, title } });
}
