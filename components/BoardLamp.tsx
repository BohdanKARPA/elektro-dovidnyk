'use client'

import { useRef, type ReactNode } from 'react'

/**
 * Wraps the hero board: an "inspection lamp" (a soft radial light drawn in CSS)
 * follows the mouse pointer. Only CSS variables change, so it costs no layout work.
 */
export function BoardLamp({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
      el.dataset.lamp = 'on'
    })
  }

  return (
    <div ref={ref} className={className} onPointerMove={onMove} onPointerLeave={() => ref.current && delete ref.current.dataset.lamp}>
      {children}
    </div>
  )
}
