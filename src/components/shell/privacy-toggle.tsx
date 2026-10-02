"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "komyx:privacy";

/**
 * Hides money values (elements with class "money") across the app.
 * State lives in localStorage and is applied as html[data-privacy="on"] before paint (see layout script).
 */
export function PrivacyToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem(KEY) === "on"; } catch {}
    document.documentElement.dataset.privacy = saved ? "on" : "off";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted preference after mount
    setOn(saved);
  }, []);
  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.privacy = next ? "on" : "off";
    try { localStorage.setItem(KEY, next ? "on" : "off"); } catch {}
  }
  return (
    <button type="button" onClick={toggle} className="h-10 w-10 grid place-items-center rounded-lg text-muted hover:text-foreground hover:bg-stone-100" aria-pressed={on} aria-label={on ? "Mostrar valores" : "Ocultar valores"} title={on ? "Mostrar valores" : "Ocultar valores"}>
      {on ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}
