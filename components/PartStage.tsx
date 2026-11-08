'use client'

import { useRef, type ReactNode } from 'react'

/**
 * The "product shot" on a component page: the part sits on a lit stage and
 * tilts slightly toward the mouse pointer, with a highlight that follows it.
 * Touch and reduced-motion visitors get the still image.
 */
export function PartStage({ children, caption }: { children: ReactNode; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`)
      el.style.setProperty('--ry', `${(px - 0.5) * 14}deg`)
      el.style.setProperty('--hx', `${px * 100}%`)
      el.style.setProperty('--hy', `${py * 100}%`)
    })
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <figure className="part-stage" ref={ref} onPointerMove={move} onPointerLeave={leave}>
      <div className="part-stage-inner">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
