'use client'

import { useFormStatus } from 'react-dom'

/** Submit button for server-action forms: disabled and marked busy while the action runs. */
export function SubmitButton({ children, className = 'btn small', disabled, title }: { children: React.ReactNode; className?: string; disabled?: boolean; title?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} title={title}>
      {children}
    </button>
  )
}
