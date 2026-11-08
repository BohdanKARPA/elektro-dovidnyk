import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { isLang } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'

export const metadata: Metadata = { robots: { index: false } }

export default async function LoginPage({ params, searchParams }: PageProps<'/[lang]/login'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const labels = getAuthDict(lang)
  const sp = await searchParams
  // Open-redirect protection: only our own language-prefixed paths are accepted.
  const next = typeof sp.next === 'string' && /^\/(uk|en)(\/[\w\-/]*)?$/.test(sp.next) ? sp.next : `/${lang}/account`

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>{labels.loginTitle}</h1>
      <p className="lede">{labels.loginIntro}</p>
      <AuthForm labels={labels} next={next} />
    </div>
  )
}
