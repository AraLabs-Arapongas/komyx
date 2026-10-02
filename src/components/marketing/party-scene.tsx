/** Hero backdrop for the landing: slow confetti rain plus floating balloons. Pure CSS animation, no runtime cost. */
const COLORS = ["#e8356d", "#ffc43d", "#4cb5f5", "#2ec4a6", "#ff8a3d"];
// Deterministic scatter (no Math.random: server and client must agree).
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 6 + ((i * 7) % 7),
  delay: -((i * 1.7) % 14),
  duration: 14 + ((i * 3) % 9),
  color: COLORS[i % COLORS.length],
  shape: i % 3, // 0 rect, 1 circle, 2 ribbon
  rotate: (i * 53) % 360,
}));
const BALLOONS = [
  { left: "1.5%", bottom: "-10%", color: "#e8356d", scale: 1, delay: "0s", duration: "11s" },
  { left: "5%", bottom: "-24%", color: "#ffc43d", scale: 0.65, delay: "-5s", duration: "14s" },
  { right: "2%", bottom: "-14%", color: "#4cb5f5", scale: 0.9, delay: "-2s", duration: "12s" },
  { right: "6%", bottom: "-28%", color: "#2ec4a6", scale: 0.6, delay: "-8s", duration: "15s" },
];

function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 140" width="60" height="140" aria-hidden="true">
      <path d="M30 86 C 29 100, 34 108, 28 124 C 24 132, 32 136, 30 140" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <ellipse cx="30" cy="40" rx="26" ry="34" fill={color} />
      <ellipse cx="20" cy="26" rx="7" ry="11" fill="rgba(255,255,255,0.35)" transform="rotate(-20 20 26)" />
      <path d="M26 74 L30 82 L34 74 Z" fill={color} />
    </svg>
  );
}

export function PartyScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden hidden sm:block" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span key={i} className="confetti-piece absolute top-0" style={{ left: `${p.left}%`, width: p.shape === 2 ? p.size * 0.5 : p.size, height: p.shape === 2 ? p.size * 2.2 : p.size, background: p.color, borderRadius: p.shape === 1 ? "999px" : "2px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)`, opacity: 0.85 } as React.CSSProperties} />
      ))}
      {BALLOONS.map((b, i) => (
        <div key={i} className="balloon absolute" style={{ left: b.left, right: b.right, bottom: b.bottom, transform: `scale(${b.scale})`, animationDelay: b.delay, animationDuration: b.duration, opacity: 0.9 }}>
          <Balloon color={b.color} />
        </div>
      ))}
    </div>
  );
}
