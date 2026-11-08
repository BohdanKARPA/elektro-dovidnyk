const paths: Record<string, string> = {
  chip: 'M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4',
  sensor: 'M12 3a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5z M12 18v3 M9 21h6',
  mosfet: 'M4 12h6 M10 7v10 M13 6v3 M13 10.5v3 M13 15v3 M13 7.5h6V4 M13 16.5h6V20 M13 12h6v4.5',
  power: 'M13 2 5 14h6l-1 8 8-12h-6z',
  passive: 'M2 12h5 M17 12h5 M7 8h10v8H7z',
}

export function CategoryIcon({ name }: { name?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name ?? 'chip'] ?? paths.chip} />
    </svg>
  )
}
