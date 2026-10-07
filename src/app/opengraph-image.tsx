import { ImageResponse } from "next/og";

/** Default share image for every page (WhatsApp, Instagram, LinkedIn, X). Brand colors from globals.css. */
export const alt = "Komyx, sistema para buffet infantil e de eventos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1b1f3a";
const SUN = "#ffc43d";
const BERRY = "#e8356d";
const PAPER = "#fffdf7";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, color: PAPER, padding: "72px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Komyx mark (public/brand/komyx-mark.svg): balloon with the K knocked out. */}
          <svg width="96" height="101" viewBox="0 0 190 200">
            <path fill={SUN} d="M95 8 C 142 8 174 44 174 90 C 174 130 142 158 95 164 C 48 158 16 130 16 90 C 16 44 48 8 95 8 Z" />
            <g fill="none" stroke={INK} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
              <path d="M68 50 V128" />
              <path d="M80 94 L122 128" />
              <path d="M80 94 L118 54" />
            </g>
            <path fill={SUN} d="M86 164 L95 178 L104 164 Z" />
            <path fill="none" stroke={SUN} strokeWidth="4" strokeLinecap="round" d="M95 178 C 97 186 88 190 94 198" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: SUN, lineHeight: 1 }}>Komyx</div>
            <div style={{ fontSize: 26, color: "#cfd2e6", marginTop: 6 }}>Gestão para buffets</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>Sistema para buffet infantil</div>
          <div style={{ fontSize: 34, color: "#cfd2e6", marginTop: 20, maxWidth: 1000 }}>Orçamento online, reserva no Pix, contrato, convite e portaria em um lugar só.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", background: BERRY, color: "#fff", fontSize: 28, fontWeight: 800, padding: "14px 28px", borderRadius: 999 }}>1 mês grátis</div>
          <div style={{ fontSize: 28, color: "#9da1bd" }}>www.komyx.com.br</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
