'use client'

import { useEffect } from 'react'

/** Blocks that slide in when they scroll into view. */
const SELECTORS = [
  '.section',
  '.project-list > li',
  '.search-results > li',
  '.topic-list > li',
  '.steps > li',
  '.calc',
  '.cats > .cat',
  '.comment',
  '.detail aside > *',
  '.guide tbody tr',
  '.question',
  '.kpis > div',
].join(',')

/**
 * Scroll-reveal for the whole site, mounted once in the layout.
 * - Content is rendered visible by the server; only blocks that are below the
 *   fold when first seen get hidden and animated, so nothing flashes and the
 *   site works without JavaScript.
 * - A MutationObserver picks up content rendered later (client navigation,
 *   favourites list, compare page updates).
 * - Disabled entirely when the visitor prefers reduced motion.
 */
export function Motion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.documentElement.classList.add('motion')

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const scan = () => {
      const vh = window.innerHeight
      document.querySelectorAll<HTMLElement>(SELECTORS).forEach((el) => {
        if (el.dataset.rv) return
        el.dataset.rv = '1'
        if (el.getBoundingClientRect().top < vh * 0.92) return // already on screen: leave as is
        const siblings = el.parentElement ? Array.from(el.parentElement.children) : [el]
        el.style.setProperty('--i', String(siblings.indexOf(el) % 6))
        el.classList.add('rv')
        io.observe(el)
      })
    }

    let raf = 0
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(scan)
    })
    scan()
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
