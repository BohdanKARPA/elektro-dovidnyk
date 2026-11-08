/**
 * Hero illustration: traces are routed from an MCU to its peripherals and drawn
 * on page load; then signal pulses run along them (MCU → outputs, inputs → MCU),
 * the status LED blinks and the chip label cycles through popular MCUs.
 * All motion is decorative and switched off under prefers-reduced-motion.
 */
const TRACES = [
  { d: 'M150 150 H110 V70 H40', reverse: true },
  { d: 'M150 190 H90 V270 H40', reverse: false },
  { d: 'M290 150 H330 V80 H400', reverse: false },
  { d: 'M290 190 H350 V260 H400', reverse: true },
]
const LABELS = ['ESP32-C3', 'STM32G030', 'ATmega328P']
const PERIPHERALS = [
  { x: 40, y: 70, label: 'I²C' },
  { x: 40, y: 270, label: 'PWM' },
  { x: 400, y: 80, label: 'UART' },
  { x: 400, y: 260, label: 'ADC' },
]

export function HeroBoard({ label }: { label: string }) {
  return (
    <svg className="hero-board" viewBox="0 0 440 340" role="img" aria-label={label}>
      <rect className="silk" x="8" y="8" width="424" height="324" rx="14" />
      {/* mounting holes */}
      {[
        [30, 30],
        [410, 30],
        [30, 310],
        [410, 310],
      ].map(([x, y]) => (
        <circle key={`h${x}-${y}`} className="hole" cx={x} cy={y} r="6" />
      ))}

      {TRACES.map((t) => (
        <path key={t.d} className="trace" d={t.d} />
      ))}

      {/* signal pulses: start after the traces are drawn */}
      {TRACES.map((t, i) => (
        <circle key={`p${t.d}`} className="pulse" r="4.5" aria-hidden="true" style={{ animationDelay: `${1.9 + i * 0.45}s` }}>
          <animateMotion
            path={t.d}
            dur="2.6s"
            begin={`${1.9 + i * 0.45}s`}
            repeatCount="indefinite"
            keyPoints={t.reverse ? '1;0' : '0;1'}
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      ))}

      {PERIPHERALS.map((p) => (
        <g key={p.label} className="periph">
          <circle className="pad" cx={p.x} cy={p.y} r="9" />
          <circle className="pad-ring" cx={p.x} cy={p.y} r="9" />
          <text className="periph-label" x={p.x} y={p.y + 26} textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}

      <rect className="chip-body" x="150" y="120" width="140" height="100" rx="6" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect className="pad pin" x={162 + i * 21} y="108" width="10" height="12" rx="1" style={{ animationDelay: `${1.6 + i * 0.05}s` }} />
          <rect className="pad pin" x={162 + i * 21} y="220" width="10" height="12" rx="1" style={{ animationDelay: `${1.9 - i * 0.05}s` }} />
        </g>
      ))}
      <circle className="chip-dot" cx="164" cy="134" r="3.5" />
      <circle className="status-led" cx="276" cy="134" r="4" />
      {LABELS.map((l, i) => (
        <text key={l} className="chip-label cycle" x="220" y="176" textAnchor="middle" style={{ animationDelay: `${i * 3}s` }}>
          {l}
        </text>
      ))}
    </svg>
  )
}
