/** Hero illustration: traces are routed from an MCU to its peripherals, drawn once on page load. */
export function HeroBoard({ label }: { label: string }) {
  return (
    <svg className="hero-board" viewBox="0 0 440 340" role="img" aria-label={label}>
      <rect className="silk" x="8" y="8" width="424" height="324" rx="14" />
      <path className="trace" d="M150 150 H110 V70 H40" />
      <path className="trace" d="M150 190 H90 V270 H40" />
      <path className="trace" d="M290 150 H330 V80 H400" />
      <path className="trace" d="M290 190 H350 V260 H400" />
      {[
        [40, 70],
        [40, 270],
        [400, 80],
        [400, 260],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="pad" cx={x} cy={y} r="9" />
      ))}
      <rect className="chip-body" x="150" y="120" width="140" height="100" rx="6" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect className="pad" x={162 + i * 21} y="108" width="10" height="12" rx="1" />
          <rect className="pad" x={162 + i * 21} y="220" width="10" height="12" rx="1" />
        </g>
      ))}
      <text className="chip-label" x="220" y="176" textAnchor="middle">
        ESP32-C3
      </text>
    </svg>
  )
}
