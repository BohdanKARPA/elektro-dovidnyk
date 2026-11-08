import { PartRender } from './PartRender'

/**
 * Hero illustration: a populated PCB. Traces run from the MCU (U1) to four real
 * parts, are drawn on page load, then signal pulses travel along them
 * (MCU → outputs, inputs → MCU). The status LED blinks and the MCU marking
 * cycles through popular chips. Motion is off under prefers-reduced-motion.
 */
const TRACES = [
  { d: 'M150 150 H110 V70 H56', reverse: true },
  { d: 'M150 190 H96 V270 H56', reverse: false },
  { d: 'M290 150 H330 V80 H384', reverse: false },
  { d: 'M290 190 H346 V260 H384', reverse: true },
]
const LABELS = ['ESP32-C3', 'STM32G030', 'ATmega328P']
const PARTS = [
  { cx: 46, cy: 70, ref: 'U2', name: 'BME280', pkg: 'LGA-8', maker: 'Bosch' },
  { cx: 46, cy: 270, ref: 'Q1', name: 'IRLZ44N', pkg: 'TO-220AB', maker: 'Infineon' },
  { cx: 394, cy: 80, ref: 'U3', name: 'MAX485', pkg: 'SOIC-8', maker: 'Analog Devices' },
  { cx: 394, cy: 260, ref: 'U4', name: 'INA226', pkg: 'VSSOP-10', maker: 'Texas Instruments' },
]
const PART_W = 84
const PART_H = 74

export function HeroBoard({ label }: { label: string }) {
  return (
    <svg className="hero-board" viewBox="0 0 440 340" role="img" aria-label={label}>
      <defs>
        <linearGradient id="hb-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d4148" />
          <stop offset=".45" stopColor="#1d2024" />
          <stop offset="1" stopColor="#0f1113" />
        </linearGradient>
      </defs>

      {/* mounting holes */}
      {[
        [18, 18],
        [422, 18],
        [18, 322],
        [422, 322],
      ].map(([x, y]) => (
        <circle key={`h${x}-${y}`} className="hole" cx={x} cy={y} r="7" />
      ))}

      {TRACES.map((t) => (
        <path key={t.d} className="trace" d={t.d} />
      ))}
      {/* vias where the traces change layer */}
      {[
        [110, 110],
        [96, 230],
        [330, 115],
        [346, 225],
      ].map(([x, y]) => (
        <circle key={`v${x}`} className="via" cx={x} cy={y} r="4" />
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

      {PARTS.map((p, i) => (
        <g key={p.ref} className="board-part" style={{ animationDelay: `${1.5 + i * 0.12}s` }}>
          <PartRender name={p.name} pkg={p.pkg} manufacturer={p.maker} x={p.cx - PART_W / 2} y={p.cy - PART_H / 2} width={PART_W} height={PART_H} fit view="top" />
          <text className="silk-ref" x={p.cx} y={p.cy + PART_H / 2 + 6} textAnchor="middle">
            {p.ref}
          </text>
        </g>
      ))}

      {/* U1: the MCU */}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect className="pad pin" x={162 + i * 21} y="108" width="10" height="12" rx="1" style={{ animationDelay: `${1.6 + i * 0.05}s` }} />
          <rect className="pad pin" x={162 + i * 21} y="220" width="10" height="12" rx="1" style={{ animationDelay: `${1.9 - i * 0.05}s` }} />
        </g>
      ))}
      <rect x="150" y="120" width="140" height="100" rx="6" fill="url(#hb-chip)" />
      <rect x="152" y="122" width="136" height="96" rx="5" fill="none" stroke="rgb(255 255 255 / .07)" />
      <circle className="chip-dot" cx="164" cy="134" r="3.5" />
      <circle className="status-led" cx="276" cy="134" r="4" />
      {LABELS.map((l, i) => (
        <text key={l} className="chip-label cycle" x="220" y="176" textAnchor="middle" style={{ animationDelay: `${i * 3}s` }}>
          {l}
        </text>
      ))}
      <text className="silk-ref" x="220" y="252" textAnchor="middle">
        U1
      </text>
      <text className="silk-ref small" x="220" y="326" textAnchor="middle">
        rev B 2026
      </text>
    </svg>
  )
}
