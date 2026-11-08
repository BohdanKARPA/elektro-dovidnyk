'use client'

import { useId, useState } from 'react'
import type { Lang } from '@/lib/types'

/* ---------------------------- helpers ---------------------------- */

/** Accepts "4,7" and "4.7"; returns NaN for empty or invalid input. */
const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.').replace(/\s/g, '')))
const ok = (...v: number[]) => v.every((x) => Number.isFinite(x))

const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1]
/** Nearest standard E24 value that is not lower than r (so the current never exceeds the target). */
export function e24Up(r: number): number {
  if (!(r > 0)) return NaN
  const decade = Math.pow(10, Math.floor(Math.log10(r)))
  const m = r / decade
  const hit = E24.find((v) => v >= m - 1e-9)
  return hit ? hit * decade : 10 * decade
}

const STD_POWER = [0.125, 0.25, 0.5, 1, 2, 3, 5]
/** DC voltages above this are hazardous to touch (the SELV limit). */
const SAFE_DC = 60

function fmt(value: number, lang: Lang, digits = 3): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { maximumSignificantDigits: digits }).format(value)
}
/** 4700 → "4,7 кОм" */
function si(value: number, unit: string, lang: Lang, digits = 3): string {
  if (!Number.isFinite(value)) return '—'
  const a = Math.abs(value)
  const pre: [number, string, string][] = [
    [1e6, 'М', 'M'],
    [1e3, 'к', 'k'],
    [1, '', ''],
    [1e-3, 'м', 'm'],
    [1e-6, 'мк', 'µ'],
  ]
  const [k, uk, en] = pre.find(([k]) => a >= k) ?? pre[pre.length - 1]
  return `${fmt(value / k, lang, digits)} ${lang === 'uk' ? uk : en}${unit}`
}
/** 12.8 → "12 год 48 хв"; long runtimes in days. */
function duration(hours: number, lang: Lang): string {
  if (!Number.isFinite(hours)) return '—'
  const uk = lang === 'uk'
  if (hours >= 48) return `${fmt(hours / 24, lang)} ${uk ? 'доби' : 'days'}`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m} ${uk ? 'хв' : 'min'}`
  return m ? `${h} ${uk ? 'год' : 'h'} ${m} ${uk ? 'хв' : 'min'}` : `${h} ${uk ? 'год' : 'h'}`
}

type Level = 'error' | 'warn' | 'info'
type Msg = { level: Level; text: string }

/* ---------------------------- strings ---------------------------- */

const L = {
  uk: {
    V: 'В', A: 'А', Ohm: 'Ом', W: 'Вт',
    positive: 'Значення мають бути додатними числами.',
    ohm: {
      title: 'Закон Ома', hint: 'Заповніть будь-які два поля — третє й потужність розрахуються.',
      v: 'Напруга, В', i: 'Струм, А', r: 'Опір, Ом', p: 'Потужність',
      need: 'Заповніть рівно два поля, а третє залиште порожнім.',
      short: 'Опір 0 Ом при ненульовій напрузі — це коротке замикання: струм необмежений.',
      hv: (v: string) => `Напруга ${v} перевищує ${SAFE_DC} В постійного струму — небезпечно торкатися відкритих провідників.`,
      pRes: (p: string) => `Потужність ${p}: звичайний вивідний резистор розрахований на 0,25 Вт. Беріть резистор із запасом удвічі.`,
      pBig: (p: string) => `Потужність ${p} — це вже силовий резистор з радіатором або перевірте, чи не помилка у значеннях.`,
    },
    led: {
      title: 'Резистор для світлодіода', vs: 'Напруга живлення, В', vf: 'Пряма напруга світлодіода, В', i: 'Струм, мА',
      r: 'Розрахунковий опір', e24: 'Найближчий з ряду E24', ia: 'Фактичний струм', p: 'Потужність на резисторі', pr: 'Резистор потужністю від', eff: 'ККД (частка енергії на світлодіоді)',
      bad: 'Напруга живлення має бути більшою за пряму напругу світлодіода, інакше він не засвітиться.',
      lowHead: (d: string) => `Запас напруги лише ${d}: струм сильно залежатиме від розкиду Vf і температури. Краще підняти живлення або взяти драйвер струму.`,
      vfOdd: 'Нетипова пряма напруга: червоні й жовті світлодіоди мають 1,8–2,2 В, зелені, сині й білі — 2,8–3,4 В. Перевірте datasheet.',
      hiI: 'Індикаторні світлодіоди зазвичай розраховані до 20 мА. Більший струм — лише для потужних світлодіодів за datasheet.',
      pin: 'Вивід мікроконтролера зазвичай видає до 8–20 мА. Для більшого струму вмикайте світлодіод через транзистор.',
      pHot: (p: string) => `На резисторі розсіюється ${p} — помітне нагрівання. Зменшіть напругу живлення або з'єднайте кілька світлодіодів послідовно.`,
    },
    div: {
      title: 'Дільник напруги', vin: 'Вхідна напруга, В', r1: 'R1 (верхній), Ом', r2: 'R2 (нижній), Ом',
      vout: 'Вихідна напруга', k: 'Коефіцієнт ділення', i: 'Струм через дільник', z: 'Вихідний опір (R1 ∥ R2)',
      note: 'Розрахунок без навантаження: опір навантаження має бути набагато більшим за R2.',
      over33: (v: string) => `На виході ${v} — більше за 3,3 В. Для входу АЦП 3,3-вольтового мікроконтролера (STM32, ESP32) це небезпечно.`,
      over5: (v: string) => `На виході ${v} — більше за 5 В. Навіть 5-вольтовий AVR цього не витримає.`,
      iHigh: (i: string) => `Дільник постійно споживає ${i}. Для батарейних пристроїв збільште опори (сумарно 100 кОм – 1 МОм).`,
      zHigh: (z: string) => `Вихідний опір ${z} завеликий для АЦП мікроконтролера (бажано до ~10 кОм). Поставте конденсатор 100 нФ на вхід АЦП або зменште опори.`,
    },
    shunt: {
      title: 'Шунт і калібрування INA226 / INA238', chip: 'Мікросхема', imax: 'Максимальний струм, А', r: 'Опір шунта, мОм',
      vsh: 'Падіння на шунті при Imax', range: 'Діапазон АЦП', fits: 'вміщається', over: 'перевищує діапазон', use: 'Використання діапазону',
      psh: 'Потужність на шунті', lsb: 'CURRENT_LSB', cal: 'Значення регістра калібрування', plsb: 'Ціна молодшого розряду потужності',
      range238: 'ADCRANGE', r0: '0: ±163,84 мВ', r1: '1: ±40,96 мВ',
      overErr: 'Падіння на шунті більше за діапазон АЦП — показання обмежаться. Зменште опір шунта або для INA238 виберіть ADCRANGE 0.',
      lowUse: (p: string) => `Використовується лише ${p} діапазону — роздільність погіршиться. Збільште опір шунта або для INA238 виберіть ADCRANGE 1.`,
      hot: (p: string) => `Шунт розсіює ${p}: візьміть резистор потужністю щонайменше вдвічі більшою і врахуйте дрейф опору від нагрівання.`,
      calErr: 'Значення калібрування більше за 32767 — регістр переповниться. Збільште CURRENT_LSB або зменште опір шунта.',
      bus226: 'INA226 вимірює напругу шини до 36 В. Для вищої напруги беріть INA238 (до 85 В).',
    },
    bat: {
      title: 'Батарея LiFePO4', s: 'Комірок послідовно (S)', ah: 'Ємність, А·год', load: 'Навантаження, Вт', dod: 'Глибина розряду, %',
      vn: 'Номінальна напруга', vfull: 'Напруга повного заряду', vcut: 'Мінімальна напруга', e: 'Повна енергія', eUse: 'Корисна енергія',
      i: 'Струм навантаження', c: 'Струм у частках ємності (C-rate)', t: 'Час роботи',
      sInt: 'Кількість комірок — ціле число від 1.',
      sMax: 'Понад 32 комірки послідовно в одній збірці не роблять: така напруга потребує окремих модулів з власними BMS і спеціальної ізоляції.',
      sHv: (v: string) => `Напруга повного заряду ${v} перевищує ${SAFE_DC} В — це небезпечна для дотику напруга. Потрібні ізоляція, захищені роз'єми й відповідна кваліфікація.`,
      ahMax: 'Ємність понад 2000 А·год нетипова для однієї збірки. Можливо, ви ввели мА·год? 100 000 мА·год = 100 А·год.',
      ahBig: 'Ємність понад 300 А·год зазвичай збирають з паралельних комірок (наприклад, 2P або 4P) — кожна паралельна група має бути однаковою.',
      dodRange: 'Глибина розряду — від 10 до 100 %.',
      dodFull: 'Розряд до 100 % скорочує ресурс. Для довгої роботи обмежтеся 80–90 %.',
      cHigh: (c: string) => `Струм ${c}C: більшість енергетичних комірок LiFePO4 розраховані на 0,5–1C тривало. Перевірте datasheet або збільште ємність.`,
      cVeryHigh: (c: string) => `Струм ${c}C — це режим для спеціальних потужних комірок. Звичайні комірки перегріються, BMS має витримувати такий струм.`,
      iHigh: (i: string) => `Струм ${i}: потрібні товсті дроти, BMS і запобіжник на такий струм.`,
      bms: (s: number, v: string) => `Потрібна BMS на ${s}S з балансуванням. Зарядний пристрій — для LiFePO4 на ${v} (3,65 В на комірку; для довшого ресурсу — 3,55 В).`,
      short: 'Батарея розрядиться менш ніж за 6 хвилин — перевірте потужність навантаження.',
      note: 'Оцінка: 3,2 В номінал, 3,65 В заряд, 2,5 В розряд на комірку; без урахування ККД перетворювача й старіння комірок.',
    },
  },
  en: {
    V: 'V', A: 'A', Ohm: 'Ω', W: 'W',
    positive: 'Values must be positive numbers.',
    ohm: {
      title: "Ohm's law", hint: 'Fill in any two fields — the third one and the power are calculated.',
      v: 'Voltage, V', i: 'Current, A', r: 'Resistance, Ω', p: 'Power',
      need: 'Fill in exactly two fields and leave the third one empty.',
      short: 'Zero resistance with a non-zero voltage is a short circuit: the current is unlimited.',
      hv: (v: string) => `${v} is above ${SAFE_DC} V DC — exposed conductors are dangerous to touch.`,
      pRes: (p: string) => `${p}: a common through-hole resistor is rated 0.25 W. Pick one rated at least twice the power.`,
      pBig: (p: string) => `${p} needs a power resistor with a heatsink — or check the values for a mistake.`,
    },
    led: {
      title: 'LED series resistor', vs: 'Supply voltage, V', vf: 'LED forward voltage, V', i: 'Current, mA',
      r: 'Calculated resistance', e24: 'Nearest E24 value', ia: 'Actual current', p: 'Resistor dissipation', pr: 'Use a resistor rated at least', eff: 'Efficiency (share of power in the LED)',
      bad: 'The supply voltage must be higher than the LED forward voltage, otherwise it will not light.',
      lowHead: (d: string) => `Only ${d} of headroom: the current will depend heavily on Vf spread and temperature. Raise the supply or use a constant-current driver.`,
      vfOdd: 'Unusual forward voltage: red and yellow LEDs are 1.8–2.2 V, green, blue and white 2.8–3.4 V. Check the datasheet.',
      hiI: 'Indicator LEDs are usually rated up to 20 mA. Higher currents are only for power LEDs per their datasheet.',
      pin: 'An MCU pin usually sources 8–20 mA. For more current switch the LED with a transistor.',
      pHot: (p: string) => `The resistor dissipates ${p} — it will get warm. Lower the supply or put several LEDs in series.`,
    },
    div: {
      title: 'Voltage divider', vin: 'Input voltage, V', r1: 'R1 (top), Ω', r2: 'R2 (bottom), Ω',
      vout: 'Output voltage', k: 'Division ratio', i: 'Divider current', z: 'Output impedance (R1 ∥ R2)',
      note: 'Unloaded: the load resistance must be much higher than R2.',
      over33: (v: string) => `The output is ${v} — above 3.3 V. That is unsafe for the ADC input of a 3.3 V MCU (STM32, ESP32).`,
      over5: (v: string) => `The output is ${v} — above 5 V. Even a 5 V AVR will not tolerate it.`,
      iHigh: (i: string) => `The divider draws ${i} all the time. For battery devices use larger resistors (100 kΩ – 1 MΩ in total).`,
      zHigh: (z: string) => `An output impedance of ${z} is too high for an MCU ADC (keep it under ~10 kΩ). Add a 100 nF capacitor at the ADC input or use smaller resistors.`,
    },
    shunt: {
      title: 'Shunt and INA226 / INA238 calibration', chip: 'Chip', imax: 'Maximum current, A', r: 'Shunt resistance, mΩ',
      vsh: 'Shunt drop at Imax', range: 'ADC range', fits: 'fits', over: 'exceeds the range', use: 'Range used',
      psh: 'Shunt dissipation', lsb: 'CURRENT_LSB', cal: 'Calibration register value', plsb: 'Power LSB',
      range238: 'ADCRANGE', r0: '0: ±163.84 mV', r1: '1: ±40.96 mV',
      overErr: 'The shunt drop exceeds the ADC range — readings will clip. Use a smaller shunt or, on the INA238, ADCRANGE 0.',
      lowUse: (p: string) => `Only ${p} of the range is used — resolution suffers. Use a larger shunt or, on the INA238, ADCRANGE 1.`,
      hot: (p: string) => `The shunt dissipates ${p}: use a part rated at least twice that and allow for resistance drift as it heats.`,
      calErr: 'The calibration value exceeds 32767 — the register overflows. Increase CURRENT_LSB or use a smaller shunt.',
      bus226: 'The INA226 measures bus voltages up to 36 V. For higher voltages use the INA238 (up to 85 V).',
    },
    bat: {
      title: 'LiFePO4 battery', s: 'Cells in series (S)', ah: 'Capacity, Ah', load: 'Load, W', dod: 'Depth of discharge, %',
      vn: 'Nominal voltage', vfull: 'Fully charged voltage', vcut: 'Cut-off voltage', e: 'Total energy', eUse: 'Usable energy',
      i: 'Load current', c: 'Current relative to capacity (C-rate)', t: 'Runtime',
      sInt: 'The number of cells is a whole number from 1.',
      sMax: 'More than 32 cells in series are not built as one pack: such voltages need separate modules with their own BMS and special insulation.',
      sHv: (v: string) => `The charged voltage of ${v} is above ${SAFE_DC} V — dangerous to touch. You need insulation, shrouded connectors and the right qualification.`,
      ahMax: 'Over 2000 Ah is unusual for one pack. Did you enter mAh? 100,000 mAh = 100 Ah.',
      ahBig: 'Packs over 300 Ah are usually built from parallel cells (e.g. 2P or 4P) — every parallel group must be identical.',
      dodRange: 'Depth of discharge is 10 to 100 %.',
      dodFull: 'Discharging to 100 % shortens cycle life. For a long life stay at 80–90 %.',
      cHigh: (c: string) => `${c}C: most energy-type LiFePO4 cells are rated 0.5–1C continuous. Check the datasheet or add capacity.`,
      cVeryHigh: (c: string) => `${c}C is a job for special power cells. Ordinary cells will overheat, and the BMS must handle that current.`,
      iHigh: (i: string) => `${i}: you need thick wiring plus a BMS and a fuse rated for that current.`,
      bms: (s: number, v: string) => `You need a ${s}S BMS with balancing and a LiFePO4 charger set to ${v} (3.65 V per cell; 3.55 V for a longer life).`,
      short: 'The battery would be empty in under 6 minutes — check the load power.',
      note: 'Estimate: 3.2 V nominal, 3.65 V charged, 2.5 V cut-off per cell; converter efficiency and cell ageing are not included.',
    },
  },
}
type Strings = (typeof L)['uk']

/* --------------------------- UI pieces --------------------------- */

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="calc-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" type="text" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </div>
  )
}

function Result({ rows }: { rows: [string, string, boolean?][] }) {
  return (
    <dl className="calc-result" aria-live="polite">
      {rows.map(([k, v, warn]) => (
        <div key={k} className={warn ? 'warn' : undefined}>
          <dt>{k}</dt>
          <dd key={v}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Errors stop the calculation; warnings and tips are shown under the result. */
function Notes({ msgs }: { msgs: Msg[] }) {
  if (!msgs.length) return null
  return (
    <ul className="calc-notes" aria-live="polite">
      {msgs.map((m) => (
        <li key={m.text} className={`calc-note ${m.level}`} role={m.level === 'error' ? 'alert' : undefined}>
          {m.text}
        </li>
      ))}
    </ul>
  )
}
const hasError = (msgs: Msg[]) => msgs.some((m) => m.level === 'error')

/* -------------------------- calculators -------------------------- */

function OhmCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [v, setV] = useState('12')
  const [i, setI] = useState('')
  const [r, setR] = useState('100')
  const V = num(v), I = num(i), R = num(r)
  const filled = [V, I, R].filter(Number.isFinite).length
  const msgs: Msg[] = []
  let rv = NaN, ri = NaN, rr = NaN
  if (filled !== 2) msgs.push({ level: 'error', text: s.ohm.need })
  else if ([V, I, R].some((x) => Number.isFinite(x) && x < 0)) msgs.push({ level: 'error', text: s.positive })
  else {
    if (!Number.isFinite(V)) { rv = I * R; ri = I; rr = R }
    else if (!Number.isFinite(I)) { rv = V; rr = R; ri = R > 0 ? V / R : NaN; if (R === 0 && V > 0) msgs.push({ level: 'error', text: s.ohm.short }) }
    else { rv = V; ri = I; rr = I > 0 ? V / I : NaN; if (I === 0) msgs.push({ level: 'error', text: s.positive }) }
  }
  const P = rv * ri
  if (!hasError(msgs)) {
    if (rv > SAFE_DC) msgs.push({ level: 'warn', text: s.ohm.hv(si(rv, s.V, lang)) })
    if (P > 5) msgs.push({ level: 'warn', text: s.ohm.pBig(si(P, s.W, lang)) })
    else if (P > 0.125) msgs.push({ level: 'info', text: s.ohm.pRes(si(P, s.W, lang)) })
  }
  return (
    <section className="calc" aria-labelledby="c-ohm">
      <h2 id="c-ohm">{s.ohm.title}</h2>
      <p className="dim">{s.ohm.hint}</p>
      <div className="calc-grid">
        <Field label={s.ohm.v} value={v} onChange={setV} />
        <Field label={s.ohm.i} value={i} onChange={setI} />
        <Field label={s.ohm.r} value={r} onChange={setR} />
      </div>
      {!hasError(msgs) && <Result rows={[[s.ohm.v, si(rv, s.V, lang)], [s.ohm.i, si(ri, s.A, lang)], [s.ohm.r, si(rr, s.Ohm, lang)], [s.ohm.p, si(P, s.W, lang), P > 5]]} />}
      <Notes msgs={msgs} />
    </section>
  )
}

function LedCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [vs, setVs] = useState('5')
  const [vf, setVf] = useState('2')
  const [ma, setMa] = useState('10')
  const Vs = num(vs), Vf = num(vf), I = num(ma) / 1000
  const msgs: Msg[] = []
  if (!ok(Vs, Vf, I) || Vs <= 0 || Vf <= 0 || I <= 0) msgs.push({ level: 'error', text: s.positive })
  else if (Vs <= Vf) msgs.push({ level: 'error', text: s.led.bad })
  const R = (Vs - Vf) / I
  const Re = e24Up(R)
  const Ia = (Vs - Vf) / Re
  const P = Ia * Ia * Re
  const rating = STD_POWER.find((x) => x >= 2 * P) ?? NaN
  if (!hasError(msgs)) {
    if (Vf < 1.6 || Vf > 3.8) msgs.push({ level: 'warn', text: s.led.vfOdd })
    if (Vs - Vf < 0.5) msgs.push({ level: 'warn', text: s.led.lowHead(si(Vs - Vf, s.V, lang)) })
    if (I > 0.03) msgs.push({ level: 'warn', text: s.led.hiI })
    else if (I > 0.008) msgs.push({ level: 'info', text: s.led.pin })
    if (P > 0.5) msgs.push({ level: 'warn', text: s.led.pHot(si(P, s.W, lang)) })
  }
  return (
    <section className="calc" aria-labelledby="c-led">
      <h2 id="c-led">{s.led.title}</h2>
      <div className="calc-grid">
        <Field label={s.led.vs} value={vs} onChange={setVs} />
        <Field label={s.led.vf} value={vf} onChange={setVf} />
        <Field label={s.led.i} value={ma} onChange={setMa} />
      </div>
      {!hasError(msgs) && (
        <Result
          rows={[
            [s.led.r, si(R, s.Ohm, lang)],
            [s.led.e24, si(Re, s.Ohm, lang)],
            [s.led.ia, si(Ia, s.A, lang)],
            [s.led.p, si(P, s.W, lang), P > 0.5],
            [s.led.pr, Number.isFinite(rating) ? si(rating, s.W, lang) : '> 5 ' + s.W, !Number.isFinite(rating)],
            [s.led.eff, `${fmt((Vf / Vs) * 100, lang, 2)} %`],
          ]}
        />
      )}
      <Notes msgs={msgs} />
    </section>
  )
}

function DividerCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [vin, setVin] = useState('12')
  const [r1, setR1] = useState('10000')
  const [r2, setR2] = useState('3300')
  const Vin = num(vin), R1 = num(r1), R2 = num(r2)
  const msgs: Msg[] = []
  if (!ok(Vin, R1, R2) || Vin <= 0 || R1 <= 0 || R2 <= 0) msgs.push({ level: 'error', text: s.positive })
  const Vout = (Vin * R2) / (R1 + R2)
  const I = Vin / (R1 + R2)
  const Z = (R1 * R2) / (R1 + R2)
  if (!hasError(msgs)) {
    if (Vout > 5) msgs.push({ level: 'warn', text: s.div.over5(si(Vout, s.V, lang)) })
    else if (Vout > 3.3) msgs.push({ level: 'warn', text: s.div.over33(si(Vout, s.V, lang)) })
    if (I > 0.001) msgs.push({ level: 'info', text: s.div.iHigh(si(I, s.A, lang)) })
    if (Z > 10_000) msgs.push({ level: 'info', text: s.div.zHigh(si(Z, s.Ohm, lang)) })
  }
  return (
    <section className="calc" aria-labelledby="c-div">
      <h2 id="c-div">{s.div.title}</h2>
      <div className="calc-grid">
        <Field label={s.div.vin} value={vin} onChange={setVin} />
        <Field label={s.div.r1} value={r1} onChange={setR1} />
        <Field label={s.div.r2} value={r2} onChange={setR2} />
      </div>
      {!hasError(msgs) && (
        <Result
          rows={[
            [s.div.vout, si(Vout, s.V, lang), Vout > 3.3],
            [s.div.k, fmt(R2 / (R1 + R2), lang, 4)],
            [s.div.i, si(I, s.A, lang)],
            [s.div.z, si(Z, s.Ohm, lang)],
          ]}
        />
      )}
      <Notes msgs={msgs} />
      <p className="dim">{s.div.note}</p>
    </section>
  )
}

function ShuntCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [chip, setChip] = useState<'ina226' | 'ina238'>('ina226')
  const [adcRange, setAdcRange] = useState<0 | 1>(0)
  const [imax, setImax] = useState('10')
  const [rm, setRm] = useState('5')
  const I = num(imax), R = num(rm) / 1000
  const msgs: Msg[] = []
  if (!ok(I, R) || I <= 0 || R <= 0) msgs.push({ level: 'error', text: s.positive })
  const vsh = I * R
  const rangeV = chip === 'ina226' ? 0.08192 : adcRange === 0 ? 0.16384 : 0.04096
  const lsb = I / 32768
  const cal = chip === 'ina226' ? 0.00512 / (lsb * R) : 819.2e6 * lsb * R * (adcRange === 1 ? 4 : 1)
  const calInt = Math.round(cal)
  const plsb = chip === 'ina226' ? 25 * lsb : 0.2 * lsb
  const P = I * I * R
  const use = vsh / rangeV
  if (!hasError(msgs)) {
    if (vsh > rangeV) msgs.push({ level: 'warn', text: s.shunt.overErr })
    else if (use < 0.1) msgs.push({ level: 'warn', text: s.shunt.lowUse(`${fmt(use * 100, lang, 2)} %`) })
    if (calInt > 32767) msgs.push({ level: 'warn', text: s.shunt.calErr })
    if (P > 1) msgs.push({ level: 'warn', text: s.shunt.hot(si(P, s.W, lang)) })
    if (chip === 'ina226') msgs.push({ level: 'info', text: s.shunt.bus226 })
  }
  const chipId = useId()
  const rangeId = useId()
  return (
    <section className="calc" aria-labelledby="c-shunt">
      <h2 id="c-shunt">{s.shunt.title}</h2>
      <div className="calc-grid">
        <div className="calc-field">
          <label htmlFor={chipId}>{s.shunt.chip}</label>
          <select id={chipId} value={chip} onChange={(e) => setChip(e.target.value as 'ina226' | 'ina238')}>
            <option value="ina226">INA226</option>
            <option value="ina238">INA238</option>
          </select>
        </div>
        {chip === 'ina238' && (
          <div className="calc-field">
            <label htmlFor={rangeId}>{s.shunt.range238}</label>
            <select id={rangeId} value={adcRange} onChange={(e) => setAdcRange(Number(e.target.value) as 0 | 1)}>
              <option value={0}>{s.shunt.r0}</option>
              <option value={1}>{s.shunt.r1}</option>
            </select>
          </div>
        )}
        <Field label={s.shunt.imax} value={imax} onChange={setImax} />
        <Field label={s.shunt.r} value={rm} onChange={setRm} />
      </div>
      {!hasError(msgs) && (
        <Result
          rows={[
            [s.shunt.vsh, si(vsh, s.V, lang)],
            [s.shunt.range, `±${si(rangeV, s.V, lang, 5)} — ${vsh <= rangeV ? s.shunt.fits : s.shunt.over}`, vsh > rangeV],
            [s.shunt.use, `${fmt(Math.min(use, 9.99) * 100, lang, 3)} %`, use > 1 || use < 0.1],
            [s.shunt.psh, si(P, s.W, lang), P > 1],
            [s.shunt.lsb, si(lsb, s.A, lang)],
            [s.shunt.cal, `${calInt} (0x${calInt.toString(16).toUpperCase().padStart(4, '0')})`, calInt > 32767],
            [s.shunt.plsb, si(plsb, s.W, lang)],
          ]}
        />
      )}
      <Notes msgs={msgs} />
    </section>
  )
}

function BatteryCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [cells, setCells] = useState('8')
  const [ah, setAh] = useState('100')
  const [load, setLoad] = useState('200')
  const [dod, setDod] = useState('90')
  const S = num(cells), C = num(ah), P = num(load), D = num(dod)
  const msgs: Msg[] = []
  if (!ok(S) || S < 1 || !Number.isInteger(S)) msgs.push({ level: 'error', text: s.bat.sInt })
  else if (S > 32) msgs.push({ level: 'error', text: s.bat.sMax })
  if (!ok(C) || C <= 0 || !ok(P) || P < 0) msgs.push({ level: 'error', text: s.positive })
  else if (C > 2000) msgs.push({ level: 'error', text: s.bat.ahMax })
  if (!ok(D) || D < 10 || D > 100) msgs.push({ level: 'error', text: s.bat.dodRange })

  const vn = 3.2 * S
  const vfull = 3.65 * S
  const e = vn * C
  const eUse = (e * D) / 100
  const I = P / vn
  const cRate = I / C
  const hours = P > 0 ? eUse / P : NaN

  if (!hasError(msgs)) {
    if (vfull > SAFE_DC) msgs.push({ level: 'warn', text: s.bat.sHv(si(vfull, s.V, lang)) })
    if (cRate > 3) msgs.push({ level: 'warn', text: s.bat.cVeryHigh(fmt(cRate, lang, 2)) })
    else if (cRate > 1) msgs.push({ level: 'warn', text: s.bat.cHigh(fmt(cRate, lang, 2)) })
    if (I > 100) msgs.push({ level: 'warn', text: s.bat.iHigh(si(I, s.A, lang)) })
    if (hours < 0.1) msgs.push({ level: 'warn', text: s.bat.short })
    if (C > 300) msgs.push({ level: 'info', text: s.bat.ahBig })
    if (D > 90) msgs.push({ level: 'info', text: s.bat.dodFull })
    msgs.push({ level: 'info', text: s.bat.bms(S, si(vfull, s.V, lang)) })
  }
  const energy = (wh: number) => (wh >= 1000 ? `${fmt(wh / 1000, lang)} ${lang === 'uk' ? 'кВт·год' : 'kWh'}` : `${fmt(wh, lang)} ${lang === 'uk' ? 'Вт·год' : 'Wh'}`)

  return (
    <section className="calc" aria-labelledby="c-bat">
      <h2 id="c-bat">{s.bat.title}</h2>
      <div className="calc-grid two">
        <Field label={s.bat.s} value={cells} onChange={setCells} />
        <Field label={s.bat.ah} value={ah} onChange={setAh} />
        <Field label={s.bat.load} value={load} onChange={setLoad} />
        <Field label={s.bat.dod} value={dod} onChange={setDod} />
      </div>
      {!hasError(msgs) && (
        <Result
          rows={[
            [s.bat.vn, si(vn, s.V, lang)],
            [s.bat.vfull, si(vfull, s.V, lang), vfull > SAFE_DC],
            [s.bat.vcut, si(2.5 * S, s.V, lang)],
            [s.bat.e, energy(e)],
            [s.bat.eUse, energy(eUse)],
            [s.bat.i, P > 0 ? si(I, s.A, lang) : '—', I > 100],
            [s.bat.c, P > 0 ? `${fmt(cRate, lang, 2)}C` : '—', cRate > 1],
            [s.bat.t, P > 0 ? duration(hours, lang) : '—'],
          ]}
        />
      )}
      <Notes msgs={msgs} />
      <p className="dim">{s.bat.note}</p>
    </section>
  )
}

export function Calculators({ lang }: { lang: Lang }) {
  const s = L[lang]
  return (
    <div className="calcs">
      <OhmCalc s={s} lang={lang} />
      <LedCalc s={s} lang={lang} />
      <DividerCalc s={s} lang={lang} />
      <ShuntCalc s={s} lang={lang} />
      <BatteryCalc s={s} lang={lang} />
    </div>
  )
}
