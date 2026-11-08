import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/onest'
import '../globals.css'
import { Header } from '@/components/Header'
import { getDict, isLang, LANGS } from '@/lib/i18n'
import { isSanityConfigured } from '@/sanity/env'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const dict = getDict(lang)
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.siteName, template: `%s — ${dict.siteName}` },
    description: dict.tagline,
    alternates: { canonical: `/${lang}`, languages: { uk: '/uk', en: '/en' } },
    openGraph: { siteName: dict.siteName, locale: lang === 'uk' ? 'uk_UA' : 'en_GB', type: 'website' },
  }
}

export default async function LangLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)

  return (
    <html lang={lang}>
      <body>
        <a className="skip" href="#main">
          {lang === 'uk' ? 'Перейти до вмісту' : 'Skip to content'}
        </a>
        <Header lang={lang} dict={dict} />
        {!isSanityConfigured && (
          <div className="demo-banner">
            <div className="wrap">{dict.demo}</div>
          </div>
        )}
        <main id="main">
          <div className="wrap">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <span>
              © 2026 {dict.siteName}. Next.js + Sanity (headless CMS).
            </span>
            <a href="/studio">Sanity Studio</a>
          </div>
        </footer>
      </body>
    </html>
  )
}
