'use client'

import { useEffect, useRef, useState } from 'react'

/** A number that counts up from zero when it first scrolls into view. The server renders the final value. */
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || value <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - k, 3)
        setShown(Math.round(value * eased))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      setShown(0)
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect()
        run()
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className="count">
      {shown}
    </span>
  )
}
