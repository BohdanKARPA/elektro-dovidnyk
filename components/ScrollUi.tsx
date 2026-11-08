'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Reading-progress bar at the top of the window and a "back to top" button.
 * One passive scroll listener drives both; the bar is a transform (no layout work).
 */
export function ScrollUi({ topLabel }: { topLabel: string }) {
  const bar = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      // Short pages get no progress bar.
      const p = max > window.innerHeight * 0.4 ? Math.min(1, window.scrollY / max) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      setShowTop(window.scrollY > 700)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className="read-progress" aria-hidden="true">
        <div ref={bar} />
      </div>
      <button type="button" className={`to-top${showTop ? ' show' : ''}`} onClick={toTop} aria-label={topLabel} aria-hidden={!showTop} tabIndex={showTop ? 0 : -1}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5 M5 12l7-7 7 7" />
        </svg>
      </button>
    </>
  )
}
