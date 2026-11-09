/**
 * Product-shot renders of electronic components, built from the package name
 * stored in the CMS ("QFN32 (5×5 мм)", "TO-220AB", "SOIC-8 / DIP-8"…).
 *
 * Each package is modelled as a few 3D boxes (body, leads, tab, lid…) plus
 * decorations printed on top faces (marking, pin-1 dot, mounting hole). The
 * model is then projected either in a 3/4 "catalogue photo" view (default) or
 * straight from above (`view="top"`, used on drawn PCBs where traces are 2D).
 * When an editor uploads a real photo in Sanity, pages show it instead.
 */
import type { ReactNode } from 'react'

export type PackageKind = 'qfn' | 'qfp' | 'so' | 'dip' | 'to220' | 'to263' | 'sot' | 'lga' | 'board'

export function parsePackage(pkg = ''): { kind: PackageKind; pins: number } {
  const first = pkg.split('/')[0].trim().toUpperCase()
  const pins = Number(first.match(/(\d+)/)?.[1] ?? 0)
  if (/ПЛАТА|BOARD|MODULE|МОДУЛЬ/.test(first)) return { kind: 'board', pins: 0 }
  if (/TO-?263|D2PAK/.test(first)) return { kind: 'to263', pins: Number(first.match(/TO-?263-?(\d)/)?.[1] ?? 5) }
  if (/TO-?220/.test(first)) return { kind: 'to220', pins: 3 }
  if (/SOT/.test(first)) return { kind: 'sot', pins: Number(first.match(/SOT-?23-?(\d)/)?.[1] ?? 3) }
  if (/LGA/.test(first)) return { kind: 'lga', pins: pins || 8 }
  if (/QFN|DFN|QFPN/.test(first)) return { kind: 'qfn', pins: pins || 32 }
  if (/QFP/.test(first)) return { kind: 'qfp', pins: pins || 32 }
  if (/DIP/.test(first)) return { kind: 'dip', pins: pins || 8 }
  if (/SO|SSOP|MSOP/.test(first)) return { kind: 'so', pins: pins || 8 }
  return { kind: 'so', pins: 8 }
}

/* ------------------------------- model ------------------------------- */

type Mat = 'body' | 'lead' | 'tab' | 'lid' | 'base' | 'pcb' | 'plastic' | 'gold'
interface Box {
  x: number
  y: number
  w: number
  d: number
  z0: number
  z1: number
  m: Mat
  /** 1 = sits on top of another box (drawn after the base layer). */
  layer?: 0 | 1
}
interface Decor {
  z: number
  node: ReactNode
}
interface Model {
  boxes: Box[]
  decor: Decor[]
}

const MAKER: [RegExp, string][] = [
  [/^texas/i, 'TI'],
  [/^stmicro/i, 'ST'],
  [/^analog/i, 'ADI'],
  [/^microchip/i, 'Microchip'],
  [/^espressif/i, 'Espressif'],
]
function makerMark(m?: string): string | undefined {
  if (!m) return undefined
  const hit = MAKER.find(([re]) => re.test(m))
  if (hit) return hit[1]
  const first = m.split(/[\s(]/)[0]
  return first.length <= 10 ? first : undefined
}

/** Laser-etched marking centred on a top face (plane coordinates). */
function marking(cx: number, cy: number, w: number, name: string, sub?: string, dark = false): ReactNode {
  const size = Math.max(4.5, Math.min(12, (w * 0.84) / Math.max(4, name.length * 0.62)))
  return (
    <g className="part-marking" fill={dark ? '#4a4f55' : '#a9afb6'} textAnchor="middle">
      <text x={cx} y={cy + (sub ? -1 : size * 0.36)} fontSize={size} fontWeight="600" letterSpacing=".02em">
        {name}
      </text>
      {sub && (
        <text x={cx} y={cy + size * 0.95} fontSize={size * 0.62} opacity=".85">
          {sub}
        </text>
      )}
    </g>
  )
}
const dot = (x: number, y: number, r = 2) => <circle cx={x} cy={y} r={r} fill="rgb(255 255 255 / .18)" />

/** Gull-wing lead leaving a body side: a raised shoulder at the body, then a foot on the board. */
function gullWing(boxes: Box[], side: 'n' | 's' | 'e' | 'w', along: number, edge: number, lw: number, len: number, shoulderZ: number) {
  const sh = Math.min(3, len * 0.35)
  const t = 1.2
  if (side === 's') {
    boxes.push({ x: along - lw / 2, y: edge, w: lw, d: sh, z0: 0, z1: shoulderZ, m: 'lead' })
    boxes.push({ x: along - lw / 2, y: edge + sh, w: lw, d: len - sh, z0: 0, z1: t, m: 'lead' })
  } else if (side === 'n') {
    boxes.push({ x: along - lw / 2, y: edge - sh, w: lw, d: sh, z0: 0, z1: shoulderZ, m: 'lead' })
    boxes.push({ x: along - lw / 2, y: edge - len, w: lw, d: len - sh, z0: 0, z1: t, m: 'lead' })
  } else if (side === 'e') {
    boxes.push({ x: edge, y: along - lw / 2, w: sh, d: lw, z0: 0, z1: shoulderZ, m: 'lead' })
    boxes.push({ x: edge + sh, y: along - lw / 2, w: len - sh, d: lw, z0: 0, z1: t, m: 'lead' })
  } else {
    boxes.push({ x: edge - sh, y: along - lw / 2, w: sh, d: lw, z0: 0, z1: shoulderZ, m: 'lead' })
    boxes.push({ x: edge - len, y: along - lw / 2, w: len - sh, d: lw, z0: 0, z1: t, m: 'lead' })
  }
}

function modelSO(pins: number, name: string, sub?: string): Model {
  const side = Math.max(2, Math.round(pins / 2))
  const pitch = side <= 2 ? 14 : side <= 4 ? 12 : side <= 8 ? 10 : 8
  const bw = Math.max(side <= 2 ? 32 : 44, side * pitch + 6)
  const bd = side <= 2 ? 28 : side <= 4 ? 36 : 40
  const lead = 9
  const H = 11
  const by = lead
  const boxes: Box[] = []
  for (let i = 0; i < side; i++) {
    const ax = 3 + (bw - 6) * ((i + 0.5) / side)
    gullWing(boxes, 'n', ax, by, pitch * 0.42, lead, H * 0.5)
    gullWing(boxes, 's', ax, by + bd, pitch * 0.42, lead, H * 0.5)
  }
  boxes.push({ x: 0, y: by, w: bw, d: bd, z0: 1, z1: 1 + H, m: 'body' })
  return {
    boxes,
    decor: [
      {
        z: 1 + H,
        node: (
          <>
            {dot(6, by + bd - 6)}
            {marking(bw / 2, by + bd / 2, bw, name, sub)}
          </>
        ),
      },
    ],
  }
}

function modelQFP(pins: number, name: string, sub?: string): Model {
  const side = Math.max(4, Math.round(pins / 4))
  const s = Math.min(96, Math.max(54, side * 3.4))
  const lead = 9
  const H = 9
  const pitch = (s - 10) / side
  const lw = Math.max(1.1, pitch * 0.46)
  const boxes: Box[] = []
  for (let i = 0; i < side; i++) {
    const a = lead + 5 + pitch * (i + 0.5)
    gullWing(boxes, 'n', a, lead, lw, lead, H * 0.5)
    gullWing(boxes, 's', a, lead + s, lw, lead, H * 0.5)
    gullWing(boxes, 'w', a, lead, lw, lead, H * 0.5)
    gullWing(boxes, 'e', a, lead + s, lw, lead, H * 0.5)
  }
  boxes.push({ x: lead, y: lead, w: s, d: s, z0: 1, z1: 1 + H, m: 'body' })
  return {
    boxes,
    decor: [
      {
        z: 1 + H,
        node: (
          <>
            <circle cx={lead + 9} cy={lead + 9} r="3.2" fill="rgb(0 0 0 / .5)" stroke="rgb(255 255 255 / .08)" />
            {marking(lead + s / 2, lead + s / 2, s, name, sub)}
          </>
        ),
      },
    ],
  }
}

function modelQFN(pins: number, name: string, sub?: string): Model {
  const side = Math.max(3, Math.round(pins / 4))
  const s = Math.min(70, Math.max(44, side * 5))
  const H = 7
  const pitch = (s - 10) / side
  const pw = pitch * 0.5
  const boxes: Box[] = []
  for (let i = 0; i < side; i++) {
    const p = 5 + pitch * (i + 0.5) - pw / 2
    boxes.push({ x: p, y: -0.8, w: pw, d: 3, z0: 0, z1: 0.9, m: 'lead' })
    boxes.push({ x: p, y: s - 2.2, w: pw, d: 3, z0: 0, z1: 0.9, m: 'lead' })
    boxes.push({ x: -0.8, y: p, w: 3, d: pw, z0: 0, z1: 0.9, m: 'lead' })
    boxes.push({ x: s - 2.2, y: p, w: 3, d: pw, z0: 0, z1: 0.9, m: 'lead' })
  }
  boxes.push({ x: 0, y: 0, w: s, d: s, z0: 0.4, z1: H, m: 'body' })
  return {
    boxes,
    decor: [
      {
        z: H,
        node: (
          <>
            {dot(7, 7, 1.8)}
            {marking(s / 2, s / 2, s - 6, name, sub)}
          </>
        ),
      },
    ],
  }
}

function modelLGA(name: string, sub?: string): Model {
  const s = 46
  return {
    boxes: [
      { x: 0, y: 0, w: s, d: s, z0: 0, z1: 2.4, m: 'base' },
      { x: 2, y: 2, w: s - 4, d: s - 4, z0: 2.4, z1: 9, m: 'lid', layer: 1 },
    ],
    decor: [
      {
        z: 9,
        node: (
          <>
            <circle cx={s - 10} cy={10} r="2.4" fill="#2b3036" />
            {marking(s / 2, s / 2 + 3, s - 8, name, sub, true)}
          </>
        ),
      },
    ],
  }
}

function modelDIP(pins: number, name: string, sub?: string): Model {
  const side = Math.max(2, Math.round(pins / 2))
  const pitch = 12
  const bw = side * pitch + 10
  const bd = 46
  const z0 = 7
  const H = 13
  const boxes: Box[] = []
  for (let i = 0; i < side; i++) {
    const x = 5 + pitch * (i + 0.5) - 2.5
    // shoulder bent out of the body, then the leg straight down
    boxes.push({ x, y: -3, w: 5, d: 3, z0: z0 + 2, z1: z0 + 5, m: 'lead' })
    boxes.push({ x: x + 1, y: -3.5, w: 3, d: 1.6, z0: 0, z1: z0 + 3, m: 'lead' })
    boxes.push({ x, y: bd, w: 5, d: 3, z0: z0 + 2, z1: z0 + 5, m: 'lead' })
    boxes.push({ x: x + 1, y: bd + 1.9, w: 3, d: 1.6, z0: 0, z1: z0 + 3, m: 'lead' })
  }
  boxes.push({ x: 0, y: 0, w: bw, d: bd, z0, z1: z0 + H, m: 'body' })
  return {
    boxes,
    decor: [
      {
        z: z0 + H,
        node: (
          <>
            <path d={`M0 ${bd / 2 - 6} a6 6 0 0 1 0 12`} fill="rgb(0 0 0 / .55)" />
            {dot(10, bd - 8)}
            {marking(bw / 2 + 4, bd / 2, bw - 14, name, sub)}
          </>
        ),
      },
    ],
  }
}

function modelTO220(name: string, sub?: string): Model {
  const w = 44
  return {
    boxes: [
      { x: 0, y: 0, w, d: 28, z0: 0, z1: 2.6, m: 'tab' },
      ...[0, 1, 2].map((i): Box => ({ x: 8 + i * 12, y: 66, w: 5, d: 34, z0: 1, z1: 2.6, m: 'lead' })),
      { x: 0, y: 24, w, d: 44, z0: 0, z1: 9, m: 'body' },
    ],
    decor: [
      { z: 2.6, node: <circle cx={w / 2} cy={12} r="6.5" fill="rgb(0 0 0 / .55)" /> },
      { z: 9, node: marking(w / 2, 46, w - 4, name, sub) },
    ],
  }
}

function modelTO263(pins: number, name: string, sub?: string): Model {
  const w = 74
  const n = Math.max(3, Math.min(7, pins))
  return {
    boxes: [
      { x: 8, y: 0, w: w - 16, d: 14, z0: 0, z1: 2.2, m: 'tab' },
      ...Array.from({ length: n }, (_, i): Box => ({ x: 8 + ((w - 16) * (i + 0.5)) / n - 2.5, y: 60, w: 5, d: 20, z0: 0, z1: 1.6, m: 'lead' })),
      { x: 0, y: 10, w, d: 52, z0: 0, z1: 10, m: 'body' },
    ],
    decor: [{ z: 10, node: marking(w / 2, 36, w - 6, name, sub) }],
  }
}

function modelSOT(pins: number, name: string): Model {
  const top = pins >= 6 ? 3 : pins >= 5 ? 2 : 1
  const bottom = pins >= 6 ? 3 : 2
  const bw = 40
  const bd = 24
  const lead = 7
  const H = 8
  const boxes: Box[] = []
  for (let i = 0; i < top; i++) gullWing(boxes, 'n', bw * ((i + 0.5) / top), lead, 4.5, lead, H * 0.5)
  for (let i = 0; i < bottom; i++) gullWing(boxes, 's', bw * ((i + 0.5) / bottom), lead + bd, 4.5, lead, H * 0.5)
  boxes.push({ x: 0, y: lead, w: bw, d: bd, z0: 1, z1: 1 + H, m: 'body' })
  return { boxes, decor: [{ z: 1 + H, node: marking(bw / 2, lead + bd / 2, bw - 2, name) }] }
}

/**
 * ST Discovery board (STM32F407G-DISC1): portrait PCB, two long double-row
 * headers along the sides, the LQFP-100 MCU in the middle, the ST-LINK
 * programmer and its USB at the top, USB OTG at the bottom, user LEDs and button.
 */
function modelDiscovery(name: string): Model {
  const w = 104
  const d = 150
  const T = 3
  const rows = 22
  const pitch = 6
  const sideHeader = (x: number): [Box, Decor] => [
    { x, y: 12, w: 13, d: rows * pitch + 2, z0: T, z1: T + 7, m: 'plastic', layer: 1 },
    {
      z: T + 7,
      node: (
        <g>
          {Array.from({ length: rows * 2 }, (_, i) => (
            <rect key={i} x={x + 2 + (i % 2) * 5.6} y={14 + Math.floor(i / 2) * pitch} width={3.4} height={3.4} rx=".6" fill="#d8b24a" />
          ))}
        </g>
      ),
    },
  ]
  const [left, leftPins] = sideHeader(3)
  const [right, rightPins] = sideHeader(w - 16)
  return {
    boxes: [
      { x: 0, y: 0, w, d, z0: 0, z1: T, m: 'pcb' },
      left,
      right,
      // ST-LINK: its USB connector over the top edge and the programmer chip
      { x: 44, y: -4, w: 16, d: 12, z0: T, z1: T + 7, m: 'tab', layer: 1 },
      { x: 42, y: 16, w: 20, d: 20, z0: T, z1: T + 2.5, m: 'body', layer: 1 },
      // the STM32F407 itself
      { x: 30, y: 58, w: 44, d: 44, z0: T, z1: T + 3, m: 'body', layer: 1 },
      // USB OTG micro-AB at the bottom edge
      { x: 46, y: d - 9, w: 12, d: 11, z0: T, z1: T + 5, m: 'tab', layer: 1 },
      // user button
      { x: 68, y: 112, w: 10, d: 10, z0: T, z1: T + 3, m: 'lid', layer: 1 },
      { x: 70.5, y: 114.5, w: 5, d: 5, z0: T + 3, z1: T + 5, m: 'plastic', layer: 1 },
      // user LEDs LD3..LD6 around the MCU
      ...[[48, 50], [80, 78], [48, 108], [22, 78]].map(([x, y]): Box => ({ x, y, w: 6, d: 4, z0: T, z1: T + 1.2, m: 'gold', layer: 1 })),
    ],
    decor: [
      {
        z: T,
        node: (
          <>
            {[
              [w / 2 - 30, 6],
              [w / 2 + 30, 6],
              [w / 2 - 30, d - 6],
              [w / 2 + 30, d - 6],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#0a1f26" stroke="#d8b24a" strokeWidth="1.1" />
            ))}
            <line x1={18} y1={44} x2={w - 18} y2={44} stroke="rgb(255 255 255 / .35)" strokeWidth=".8" strokeDasharray="2 2" />
            {[50, 82, 50, 26].map((x, i) => (
              <circle key={i} cx={x + 1} cy={[52, 80, 110, 80][i]} r="1.6" fill={['#f59e0b', '#52f2a6', '#ef4444', '#60a5fa'][i]} className="board-led" />
            ))}
            <text x={w / 2} y={d - 18} fontSize="5.6" fill="rgb(255 255 255 / .85)" fontWeight="600" textAnchor="middle" className="part-marking">
              {name}
            </text>
          </>
        ),
      },
      leftPins,
      rightPins,
      { z: T + 2.5, node: marking(52, 26, 18, 'ST-LINK') },
      { z: T + 3, node: marking(52, 80, 40, 'STM32F407', 'ST') },
    ],
  }
}

/**
 * Espressif DevKitC: a narrow board with a single-row header along each long
 * side, the shielded WROOM module with its PCB antenna at one end, and two
 * USB-C ports, Boot/Reset buttons and the RGB LED at the other.
 */
function modelDevKit(name: string): Model {
  // ESP32-C3-DevKitM-1: 15 pins a side, one Micro-USB and the smaller MINI module.
  const mini = /C3/i.test(name)
  const w = mini ? 140 : 150
  const d = 56
  const T = 3
  const pins = mini ? 15 : 16
  const row = (y: number): [Box, Decor] => [
    { x: 14, y, w: pins * 7.4 + 2, d: 7, z0: T, z1: T + 7, m: 'plastic', layer: 1 },
    {
      z: T + 7,
      node: (
        <g>
          {Array.from({ length: pins }, (_, i) => (
            <rect key={i} x={16 + i * 7.4} y={y + 1.8} width={3.4} height={3.4} rx=".6" fill="#d8b24a" />
          ))}
        </g>
      ),
    },
  ]
  const [top, topPins] = row(2)
  const [bottom, bottomPins] = row(d - 9)
  return {
    boxes: [
      { x: 0, y: 0, w, d, z0: 0, z1: T, m: 'pcb' },
      top,
      bottom,
      // the module: PCB antenna part, then the metal shield
      ...(mini
        ? [
            { x: 92, y: 16, w: 14, d: 24, z0: T, z1: T + 0.8, m: 'pcb', layer: 1 } as Box,
            { x: 106, y: 16, w: 26, d: 24, z0: T, z1: T + 2.6, m: 'lid', layer: 1 } as Box,
          ]
        : [
            { x: 92, y: 13, w: 18, d: 30, z0: T, z1: T + 0.8, m: 'pcb', layer: 1 } as Box,
            { x: 110, y: 13, w: 36, d: 30, z0: T, z1: T + 3.2, m: 'lid', layer: 1 } as Box,
          ]),
      // USB over the left edge: one Micro-USB on the C3 board, two USB-C on the C6 board
      ...(mini
        ? [{ x: -4, y: 23, w: 9, d: 10, z0: T, z1: T + 3, m: 'tab', layer: 1 } as Box]
        : [
            { x: -4, y: 12, w: 10, d: 11, z0: T, z1: T + 3.5, m: 'tab', layer: 1 } as Box,
            { x: -4, y: 33, w: 10, d: 11, z0: T, z1: T + 3.5, m: 'tab', layer: 1 } as Box,
          ]),
      // USB-UART bridge, LDO, Boot and Reset buttons
      { x: 22, y: 20, w: 12, d: 12, z0: T, z1: T + 1.8, m: 'body', layer: 1 },
      { x: 42, y: 34, w: 10, d: 7, z0: T, z1: T + 2.2, m: 'body', layer: 1 },
      { x: 60, y: 14, w: 9, d: 9, z0: T, z1: T + 2.5, m: 'lid', layer: 1 },
      { x: 60, y: 33, w: 9, d: 9, z0: T, z1: T + 2.5, m: 'lid', layer: 1 },
      { x: 78, y: 25, w: 6, d: 6, z0: T, z1: T + 1.6, m: 'plastic', layer: 1 },
    ],
    decor: [
      {
        z: T,
        node: (
          <>
            <circle cx={81} cy={28} r="1.8" fill="#52f2a6" className="board-led" />
            {/* The board is narrow: its name sits on the module, the silkscreen only says which end is which. */}
            {!mini && (
              <>
                <text x={9} y={19.5} fontSize="4.2" fill="rgb(255 255 255 / .7)" className="part-marking">
                  UART
                </text>
                <text x={9} y={40.5} fontSize="4.2" fill="rgb(255 255 255 / .7)" className="part-marking">
                  USB
                </text>
              </>
            )}
          </>
        ),
      },
      {
        z: T + 0.8,
        node: mini ? (
          <path d="M94 20h10v4h-9v4h9v4h-9v4h10" fill="none" stroke="#d8b24a" strokeWidth="1" />
        ) : (
          <path d="M95 18h12v4H96v4h11v4H96v4h11v4H95" fill="none" stroke="#d8b24a" strokeWidth="1" />
        ),
      },
      topPins,
      bottomPins,
      { z: mini ? T + 2.6 : T + 3.2, node: mini ? marking(119, 28, 24, name.replace(/-DevKit.*$/i, ''), 'MINI-1', true) : marking(128, 28, 32, name.replace(/-DevKit.*$/i, ''), 'WROOM-1', true) },
    ],
  }
}

function modelBoard(name: string): Model {
  const w = 150
  const d = 104
  const T = 3
  const header = (x: number, y: number, n: number): [Box, Decor] => [
    { x, y, w: n * 6.2 + 2, d: 8, z0: T, z1: T + 7, m: 'plastic', layer: 1 },
    {
      z: T + 7,
      node: (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={x + 2 + i * 6.2} y={y + 2.2} width={3.6} height={3.6} rx=".6" fill="#d8b24a" />
          ))}
        </g>
      ),
    },
  ]
  const [h1, h1d] = header(18, 4, 18)
  const [h2, h2d] = header(26, d - 12, 16)
  return {
    boxes: [
      { x: 0, y: 0, w, d, z0: 0, z1: T, m: 'pcb' },
      h1,
      h2,
      { x: -5, y: 38, w: 17, d: 22, z0: T, z1: T + 8, m: 'tab', layer: 1 },
      { x: 40, y: 30, w: 38, d: 38, z0: T, z1: T + 3.5, m: 'body', layer: 1 },
      { x: 88, y: 36, w: 26, d: 26, z0: T, z1: T + 3, m: 'body', layer: 1 },
      { x: 120, y: 30, w: 16, d: 12, z0: T, z1: T + 3, m: 'lid', layer: 1 },
      ...[0, 1, 2, 3].map((i): Box => ({ x: 122, y: 50 + i * 7, w: 10, d: 4, z0: T, z1: T + 1.2, m: 'gold', layer: 1 })),
    ],
    decor: [
      {
        z: T,
        node: (
          <>
            {[
              [7, 7],
              [w - 7, 7],
              [7, d - 7],
              [w - 7, d - 7],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="#0a1f26" stroke="#d8b24a" strokeWidth="1.2" />
            ))}
            <circle cx={126} cy={86} r="2" fill="#52f2a6" className="board-led" />
            <text x={14} y={d - 18} fontSize="7" fill="rgb(255 255 255 / .85)" fontWeight="600" className="part-marking">
              {name}
            </text>
          </>
        ),
      },
      h1d,
      h2d,
      { z: T + 3.5, node: marking(59, 49, 30, 'SoC') },
      { z: T + 3, node: marking(101, 49, 20, 'MCU') },
    ],
  }
}

/* ----------------------------- projection ---------------------------- */

const C = 0.87 // horizontal spread of the two ground axes
const S = 0.42 // flattening of the ground plane (camera elevation)

type Pt = [number, number]
const projectIso = (x: number, y: number, z: number): Pt => [(x - y) * C, (x + y) * S - z]
const projectTop = (x: number, y: number): Pt => [x, y]

const FACE: Record<Mat, { front: string; right: string }> = {
  body: { front: '#17181b', right: '#0d0e10' },
  lead: { front: '#a4a9af', right: '#80868d' },
  tab: { front: '#a3a8ae', right: '#858a90' },
  lid: { front: '#aeb3b9', right: '#92979d' },
  base: { front: '#1c2420', right: '#141a17' },
  pcb: { front: '#0e3c49', right: '#0a2f3a' },
  plastic: { front: '#121315', right: '#0b0c0d' },
  gold: { front: '#a8862f', right: '#8e7027' },
}

const poly = (pts: Pt[]) => pts.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ')

export function PartRender({
  name,
  pkg,
  manufacturer,
  className,
  title,
  x,
  y,
  width,
  height,
  fit = false,
  view = 'iso',
}: {
  name: string
  pkg?: string
  manufacturer?: string
  className?: string
  /** Accessible name; omit for decorative use next to a visible name. */
  title?: string
  /** Position when nested inside another SVG. */
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  /** Fill the box (nested on a board or a cover) instead of keeping real-size proportions. */
  fit?: boolean
  /** 'iso' — a 3/4 catalogue shot; 'top' — straight from above, for drawn PCBs. */
  view?: 'iso' | 'top'
}) {
  const { kind, pins } = parsePackage(pkg)
  const id = `pr-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${kind}-${view}`
  const sub = makerMark(manufacturer)
  const mark = name.length > 12 ? name.replace(/^(STM32\w{6}).*$/, '$1') : name

  const model =
    kind === 'qfp'
      ? modelQFP(pins, mark, sub)
      : kind === 'qfn'
        ? modelQFN(pins, mark, sub)
        : kind === 'lga'
          ? modelLGA(mark, sub)
          : kind === 'dip'
            ? modelDIP(pins, mark, sub)
            : kind === 'to220'
              ? modelTO220(mark, sub)
              : kind === 'to263'
                ? modelTO263(pins, mark, sub)
                : kind === 'sot'
                  ? modelSOT(pins, mark)
                  : kind === 'board'
                    ? /DISC|DISCOVERY/i.test(`${name} ${pkg ?? ''}`)
                      ? modelDiscovery(mark)
                      : /DEVKIT/i.test(`${name} ${pkg ?? ''}`)
                        ? modelDevKit(mark)
                        : modelBoard(mark)
                    : modelSO(pins, mark, sub)

  const isIso = view === 'iso'
  const P = (px: number, py: number, pz: number): Pt => (isIso ? projectIso(px, py, pz) : projectTop(px, py))
  // Painter's order: base layer first, then back-to-front by each box's nearest corner.
  const boxes = [...model.boxes].sort(
    (a, b) => (a.layer ?? 0) - (b.layer ?? 0) || (isIso ? a.x + a.w + a.y + a.d - (b.x + b.w + b.y + b.d) : a.z1 - b.z1),
  )
  const topFill = (m: Mat) =>
    m === 'body'
      ? `url(#${id}-body)`
      : m === 'lead'
        ? `url(#${id}-tin)`
        : m === 'tab'
          ? `url(#${id}-tab)`
          : m === 'lid'
            ? `url(#${id}-lid)`
            : m === 'pcb'
              ? `url(#${id}-pcb)`
              : m === 'gold'
                ? '#d8b24a'
                : m === 'base'
                  ? '#26302b'
                  : '#1c1e21'

  // Bounds of every projected corner → the viewBox.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of model.boxes) {
    for (const [px, py] of [
      [b.x, b.y],
      [b.x + b.w, b.y],
      [b.x, b.y + b.d],
      [b.x + b.w, b.y + b.d],
    ]) {
      for (const z of [b.z0, b.z1]) {
        const [sx, sy] = P(px, py, z)
        minX = Math.min(minX, sx)
        maxX = Math.max(maxX, sx)
        minY = Math.min(minY, sy)
        maxY = Math.max(maxY, sy)
      }
    }
  }
  const w = maxX - minX
  const h = maxY - minY
  const pad = fit ? 5 : 16
  const vw = fit ? w + pad * 2 : Math.max(w + pad * 2, 130)
  const vh = fit ? h + pad * 2 + 6 : Math.max(h + pad * 2 + 8, 100)
  const ox = (vw - w) / 2 - minX
  const oy = (vh - h) / 2 - minY - 3

  // Ground shadow: the footprint at z = 0, softened and pushed away from the light.
  const fx0 = Math.min(...model.boxes.map((b) => b.x))
  const fy0 = Math.min(...model.boxes.map((b) => b.y))
  const fx1 = Math.max(...model.boxes.map((b) => b.x + b.w))
  const fy1 = Math.max(...model.boxes.map((b) => b.y + b.d))
  const shadow = isIso
    ? poly([P(fx0 + 2, fy0 + 4, 0), P(fx1 + 6, fy0 + 4, 0), P(fx1 + 6, fy1 + 8, 0), P(fx0 + 2, fy1 + 8, 0)])
    : poly([P(fx0 + 2, fy0 + 3, 0), P(fx1 + 3, fy0 + 3, 0), P(fx1 + 3, fy1 + 4, 0), P(fx0 + 2, fy1 + 4, 0)])

  // Maps plane coordinates onto a top face at height z (identity in the top view).
  const decorAt = (z: number) => (isIso ? `matrix(${C} ${S} ${-C} ${S} 0 ${-z})` : undefined)

  return (
    <svg
      className={`part-render${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${vw.toFixed(1)} ${vh.toFixed(1)}`}
      preserveAspectRatio="xMidYMid meet"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      x={x}
      y={y}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#40444b" />
          <stop offset=".5" stopColor="#24272b" />
          <stop offset="1" stopColor="#16181b" />
        </linearGradient>
        <linearGradient id={`${id}-tin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbfcfc" />
          <stop offset=".5" stopColor="#c9cdd2" />
          <stop offset="1" stopColor="#959ba2" />
        </linearGradient>
        <linearGradient id={`${id}-tab`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f4f5" />
          <stop offset=".55" stopColor="#bcc1c6" />
          <stop offset="1" stopColor="#8d9298" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fafafa" />
          <stop offset=".5" stopColor="#d3d7db" />
          <stop offset="1" stopColor="#a6abb1" />
        </linearGradient>
        <linearGradient id={`${id}-pcb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#21677c" />
          <stop offset="1" stopColor="#103f4b" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isIso ? 4.5 : 2.5} />
        </filter>
      </defs>
      <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)})`}>
        <polygon points={shadow} fill="#000" opacity={isIso ? 0.32 : 0.4} filter={`url(#${id}-blur)`} />
        {boxes.map((b, i) => {
          const T = [P(b.x, b.y, b.z1), P(b.x + b.w, b.y, b.z1), P(b.x + b.w, b.y + b.d, b.z1), P(b.x, b.y + b.d, b.z1)]
          if (!isIso) return <polygon key={i} points={poly(T)} fill={topFill(b.m)} />
          const R = [P(b.x + b.w, b.y, b.z1), P(b.x + b.w, b.y + b.d, b.z1), P(b.x + b.w, b.y + b.d, b.z0), P(b.x + b.w, b.y, b.z0)]
          const F = [P(b.x, b.y + b.d, b.z1), P(b.x + b.w, b.y + b.d, b.z1), P(b.x + b.w, b.y + b.d, b.z0), P(b.x, b.y + b.d, b.z0)]
          const big = b.m === 'body' || b.m === 'lid' || b.m === 'tab' || b.m === 'pcb'
          return (
            <g key={i}>
              <polygon points={poly(R)} fill={FACE[b.m].right} />
              <polygon points={poly(F)} fill={FACE[b.m].front} />
              <polygon points={poly(T)} fill={topFill(b.m)} />
              {big && <polyline points={poly([T[3], T[0], T[1]])} fill="none" stroke="rgb(255 255 255 / .16)" strokeWidth=".8" />}
            </g>
          )
        })}
        {model.decor.map((dc, i) => (
          <g key={`d${i}`} transform={decorAt(dc.z)}>
            {dc.node}
          </g>
        ))}
      </g>
    </svg>
  )
}
