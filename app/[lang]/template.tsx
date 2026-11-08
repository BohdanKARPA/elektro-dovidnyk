/**
 * A template re-mounts on every navigation (unlike a layout), so each page
 * enters with a short fade-and-rise. Disabled under prefers-reduced-motion in CSS.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
