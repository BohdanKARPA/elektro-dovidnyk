import { PartRender } from './PartRender'
import type { ComponentDoc } from '@/lib/types'

/**
 * Generated cover for a DIY project: a piece of soldermask with the project's
 * own parts placed on it and joined by traces. Used when the editor has not
 * uploaded a cover photo in Sanity.
 */
const SLOTS: Record<number, [number, number][]> = {
  1: [[160, 100]],
  2: [
    [100, 100],
    [222, 100],
  ],
  3: [
    [76, 74],
    [166, 128],
    [252, 70],
  ],
}

export function ProjectCover({ parts, title, className }: { parts?: ComponentDoc[]; title?: string; className?: string }) {
  const list = (parts ?? []).slice(0, 3)
  const slots = SLOTS[Math.max(1, list.length)] ?? SLOTS[1]
  const pw = list.length >= 3 ? 84 : list.length === 2 ? 104 : 130
  const ph = list.length >= 3 ? 74 : list.length === 2 ? 96 : 120
  const trace = slots.length > 1 ? `M${slots.map(([x, y]) => `${x} ${y}`).join(' H')}` : ''
  const id = `pc-${(title ?? 'x').length}-${list.map((p) => p.slug).join('-')}`.replace(/[^a-z0-9-]/gi, '')

  return (
    <svg className={`project-cover${className ? ` ${className}` : ''}`} viewBox="0 0 320 200" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <pattern id={`${id}-vias`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.3" fill="rgb(212 169 58 / .28)" />
        </pattern>
        <radialGradient id={`${id}-glow`} cx=".3" cy=".2" r=".9">
          <stop offset="0" stopColor="#1c5a43" />
          <stop offset="1" stopColor="#0c3326" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-glow)`} />
      <rect width="320" height="200" fill={`url(#${id}-vias)`} />
      {trace && (
        <g fill="none" stroke="#3f9b6d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".9">
          {slots.slice(1).map(([x, y], i) => {
            const [px, py] = slots[i]
            const mx = (px + x) / 2
            return <path key={i} d={`M${px} ${py} H${mx} V${y} H${x}`} />
          })}
        </g>
      )}
      {list.length === 0 && <circle cx="160" cy="100" r="8" fill="#d4a93a" />}
      {list.map((p, i) => {
        const [cx, cy] = slots[i]
        return <PartRender key={p._id} name={p.name} pkg={p.package} manufacturer={p.manufacturer} x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} fit view="top" />
      })}
    </svg>
  )
}
