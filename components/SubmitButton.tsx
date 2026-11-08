'use client'

import { useFormStatus } from 'react-dom'

/** Submit button for server-action forms: disabled and marked busy while the action runs. */
export function SubmitButton({
  children,
  className = 'btn small',
  disabled,
  title,
  name,
  value,
  formNoValidate,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  title?: string
  /** Lets one form have several submit buttons (e.g. publish / return / reject). */
  name?: string
  value?: string
  /** Submit without the form's `required` checks (e.g. "Publish" needs no note). */
  formNoValidate?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} title={title} name={name} value={value} formNoValidate={formNoValidate}>
      {children}
    </button>
  )
}
