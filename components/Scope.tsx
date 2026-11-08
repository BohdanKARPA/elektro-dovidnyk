/**
 * Decorative oscilloscope for the Tools page: a PWM channel and an analog
 * channel scroll across a graticule. Pure SVG + CSS; static under reduced motion.
 */
const W = 640
const H = 160

function pwmPath(periods: number, period: number, duty: number, hi: number, lo: number) {
  let d = `M0 ${lo}`
  for (let i = 0; i < periods; i++) {
    const x = i * period
    d += ` H${x} V${hi} H${x + period * duty} V${lo}`
  }
  return d + ` H${periods * period}`
}

function sinePath(periods: number, period: number, mid: number, amp: number) {
  const pts: string[] = []
  const total = periods * period
  for (let x = 0; x <= total; x += 4) pts.push(`${x} ${(mid - amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`)
  return `M${pts.join(' L')}`
}

export function Scope({ label }: { label: string }) {
  // Two screen widths of waveform: the group slides left by exactly one screen and loops seamlessly.
  const pwm = pwmPath(16, 80, 0.35, 28, 66)
  const sine = sinePath(8, 160, 116, 26)
  return (
    <svg className="scope" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <clipPath id="scope-clip">
          <rect x="0" y="0" width={W} height={H} rx="10" />
        </clipPath>
      </defs>
      <g clipPath="url(#scope-clip)">
        <rect className="scope-bg" x="0" y="0" width={W} height={H} />
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`v${i}`} className="scope-grid" x1={(i + 1) * 40} y1="0" x2={(i + 1) * 40} y2={H} />
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <line key={`h${i}`} className="scope-grid" x1="0" y1={(i + 1) * 40} x2={W} y2={(i + 1) * 40} />
        ))}
        <g className="scope-wave">
          <path className="scope-ch1" d={pwm} />
          <path className="scope-ch2" d={sine} />
        </g>
        <line className="scope-cursor" x1="0" y1="0" x2="0" y2={H} />
      </g>
      <text className="scope-text" x="12" y="20">
        CH1 PWM 35%
      </text>
      <text className="scope-text ch2" x="12" y={H - 10}>
        CH2 ~
      </text>
    </svg>
  )
}
