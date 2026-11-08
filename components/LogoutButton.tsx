'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton({ label, home }: { label: string; home: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  return (
    <button
      type="button"
      className="btn ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
        window.dispatchEvent(new Event('auth-changed'))
        router.push(home)
        router.refresh()
      }}
    >
      {label}
    </button>
  )
}
