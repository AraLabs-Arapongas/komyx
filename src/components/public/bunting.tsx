/** Party flag garland. Pure SVG, no runtime cost. */
export function Bunting({ className = "" }: { className?: string }) {
  const colors = ["#e8356d", "#ffc43d", "#4cb5f5", "#2ec4a6"];
  const flags = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg viewBox="0 0 1400 120" preserveAspectRatio="none" className={`bunting w-full h-16 sm:h-24 ${className}`} aria-hidden="true">
      <path d="M0 10 Q 700 70 1400 10" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" />
      {flags.map((i) => {
        const x = 50 + i * 100;
        const t = x / 1400;
        const y = 10 + 2 * (1 - t) * t * 60;
        return <polygon key={i} points={`${x - 32},${y} ${x + 32},${y} ${x},${y + 58}`} fill={colors[i % colors.length]} />;
      })}
    </svg>
  );
}
