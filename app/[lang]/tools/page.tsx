import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Calculators } from '@/components/Calculators'
import { isLang } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'

const intro = {
  uk: 'Калькулятори для щоденних задач: закон Ома, резистор для світлодіода, дільник напруги, шунт з калібруванням INA226 / INA238 та оцінка батареї LiFePO4. Усе рахується у вашому браузері.',
  en: "Calculators for everyday tasks: Ohm's law, LED resistor, voltage divider, shunt with INA226 / INA238 calibration and a LiFePO4 battery estimate. Everything runs in your browser.",
}

export async function generateMetadata({ params }: PageProps<'/[lang]/tools'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return {
    title: getExtraDict(lang).tools,
    description: intro[lang],
    alternates: { canonical: `/${lang}/tools`, languages: { uk: '/uk/tools', en: '/en/tools' } },
  }
}

export default async function ToolsPage({ params }: PageProps<'/[lang]/tools'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return (
    <>
      <h1>{getExtraDict(lang).tools}</h1>
      <p className="lede">{intro[lang]}</p>
      <Calculators lang={lang} />
    </>
  )
}
