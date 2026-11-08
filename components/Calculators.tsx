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

/* ---------------------------- strings ---------------------------- */

const L = {
  uk: {
    V: 'В', A: 'А', Ohm: 'Ом', W: 'Вт', Wh: 'Вт·год', h: 'год', Ah: 'А·год',
    ohm: { title: 'Закон Ома', hint: 'Заповніть будь-які два поля — третє й потужність розрахуються.', v: 'Напруга, В', i: 'Струм, А', r: 'Опір, Ом', p: 'Потужність', need: 'Заповніть рівно два поля.' },
    led: { title: 'Резистор для світлодіода', vs: 'Напруга живлення, В', vf: 'Пряма напруга світлодіода, В', i: 'Струм, мА', r: 'Розрахунковий опір', e24: 'Найближчий з ряду E24', ia: 'Фактичний струм', p: 'Потужність на резисторі', pr: 'Резистор потужністю від', bad: 'Напруга живлення має бути більшою за пряму напругу світлодіода.' },
    div: { title: 'Дільник напруги', vin: 'Вхідна напруга, В', r1: 'R1 (верхній), Ом', r2: 'R2 (нижній), Ом', vout: 'Вихідна напруга', i: 'Струм через дільник', note: 'Без навантаження. Опір навантаження має бути набагато більшим за R2.' },
    shunt: { title: 'Шунт і калібрування INA226 / INA238', chip: 'Мікросхема', imax: 'Максимальний струм, А', r: 'Опір шунта, мОм', vsh: 'Падіння на шунті при Imax', range: 'Діапазон АЦП', fits: 'вміщається', over: 'перевищує діапазон — зменште опір шунта', psh: 'Потужність на шунті', lsb: 'CURRENT_LSB', cal: 'Значення регістра калібрування', plsb: 'Ціна молодшого розряду потужності', calOver: 'Значення більше за 32767 — збільште CURRENT_LSB або зменште шунт.', range238: 'ADCRANGE', r0: '0: ±163,84 мВ', r1: '1: ±40,96 мВ' },
    bat: { title: 'Батарея LiFePO4', s: 'Комірок послідовно (S)', ah: 'Ємність, А·год', load: 'Навантаження, Вт', vn: 'Номінальна напруга', vfull: 'Напруга повного заряду', vcut: 'Мінімальна напруга', e: 'Енергія', t: 'Час роботи', note: 'Оцінка: 3,2 В номінал, 3,65 В заряд, 2,5 В розряд на комірку; без урахування ККД перетворювача.' },
  },
  en: {
    V: 'V', A: 'A', Ohm: 'Ω', W: 'W', Wh: 'Wh', h: 'h', Ah: 'Ah',
    ohm: { title: "Ohm's law", hint: 'Fill in any two fields — the third one and the power are calculated.', v: 'Voltage, V', i: 'Current, A', r: 'Resistance, Ω', p: 'Power', need: 'Fill in exactly two fields.' },
    led: { title: 'LED series resistor', vs: 'Supply voltage, V', vf: 'LED forward voltage, V', i: 'Current, mA', r: 'Calculated resistance', e24: 'Nearest E24 value', ia: 'Actual current', p: 'Resistor dissipation', pr: 'Use a resistor rated at least', bad: 'The supply voltage must be higher than the LED forward voltage.' },
    div: { title: 'Voltage divider', vin: 'Input voltage, V', r1: 'R1 (top), Ω', r2: 'R2 (bottom), Ω', vout: 'Output voltage', i: 'Divider current', note: 'Unloaded. The load resistance must be much higher than R2.' },
    shunt: { title: 'Shunt and INA226 / INA238 calibration', chip: 'Chip', imax: 'Maximum current, A', r: 'Shunt resistance, mΩ', vsh: 'Shunt drop at Imax', range: 'ADC range', fits: 'fits', over: 'exceeds the range — use a smaller shunt', psh: 'Shunt dissipation', lsb: 'CURRENT_LSB', cal: 'Calibration register value', plsb: 'Power LSB', calOver: 'The value exceeds 32767 — increase CURRENT_LSB or use a smaller shunt.', range238: 'ADCRANGE', r0: '0: ±163.84 mV', r1: '1: ±40.96 mV' },
    bat: { title: 'LiFePO4 battery', s: 'Cells in series (S)', ah: 'Capacity, Ah', load: 'Load, W', vn: 'Nominal voltage', vfull: 'Fully charged voltage', vcut: 'Cut-off voltage', e: 'Energy', t: 'Runtime', note: 'Estimate: 3.2 V nominal, 3.65 V charged, 2.5 V cut-off per cell; converter efficiency not included.' },
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

/* -------------------------- calculators -------------------------- */

function OhmCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [v, setV] = useState('12')
  const [i, setI] = useState('')
  const [r, setR] = useState('100')
  const V = num(v), I = num(i), R = num(r)
  const filled = [V, I, R].filter(Number.isFinite).length
  let rv = NaN, ri = NaN, rr = NaN
  if (filled === 2) {
    if (!Number.isFinite(V)) { rv = I * R; ri = I; rr = R }
    else if (!Number.isFinite(I)) { rv = V; ri = R ? V / R : NaN; rr = R }
    else { rv = V; ri = I; rr = I ? V / I : NaN }
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
      {filled === 2 ? (
        <Result rows={[[s.ohm.v, si(rv, s.V, lang)], [s.ohm.i, si(ri, s.A, lang)], [s.ohm.r, si(rr, s.Ohm, lang)], [s.ohm.p, si(rv * ri, s.W, lang)]]} />
      ) : (
        <p className="form-note err">{s.ohm.need}</p>
      )}
    </section>
  )
}

function LedCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [vs, setVs] = useState('5')
  const [vf, setVf] = useState('2')
  const [ma, setMa] = useState('10')
  const Vs = num(vs), Vf = num(vf), I = num(ma) / 1000
  const valid = ok(Vs, Vf, I) && I > 0
  const bad = valid && Vs <= Vf
  const R = (Vs - Vf) / I
  const Re = e24Up(R)
  const Ia = (Vs - Vf) / Re
  const P = Ia * Ia * Re
  const rating = STD_POWER.find((x) => x >= 2 * P) ?? NaN
  return (
    <section className="calc" aria-labelledby="c-led">
      <h2 id="c-led">{s.led.title}</h2>
      <div className="calc-grid">
        <Field label={s.led.vs} value={vs} onChange={setVs} />
        <Field label={s.led.vf} value={vf} onChange={setVf} />
        <Field label={s.led.i} value={ma} onChange={setMa} />
      </div>
      {bad ? (
        <p className="form-note err">{s.led.bad}</p>
      ) : valid ? (
        <Result
          rows={[
            [s.led.r, si(R, s.Ohm, lang)],
            [s.led.e24, si(Re, s.Ohm, lang)],
            [s.led.ia, si(Ia, s.A, lang)],
            [s.led.p, si(P, s.W, lang)],
            [s.led.pr, si(rating, s.W, lang)],
          ]}
        />
      ) : null}
    </section>
  )
}

function DividerCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [vin, setVin] = useState('12')
  const [r1, setR1] = useState('10000')
  const [r2, setR2] = useState('3300')
  const Vin = num(vin), R1 = num(r1), R2 = num(r2)
  const valid = ok(Vin, R1, R2) && R1 + R2 > 0
  return (
    <section className="calc" aria-labelledby="c-div">
      <h2 id="c-div">{s.div.title}</h2>
      <div className="calc-grid">
        <Field label={s.div.vin} value={vin} onChange={setVin} />
        <Field label={s.div.r1} value={r1} onChange={setR1} />
        <Field label={s.div.r2} value={r2} onChange={setR2} />
      </div>
      {valid && <Result rows={[[s.div.vout, si((Vin * R2) / (R1 + R2), s.V, lang)], [s.div.i, si(Vin / (R1 + R2), s.A, lang)]]} />}
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
  const valid = ok(I, R) && I > 0 && R > 0
  const vsh = I * R
  const rangeV = chip === 'ina226' ? 0.08192 : adcRange === 0 ? 0.16384 : 0.04096
  const lsb = I / 32768
  const cal = chip === 'ina226' ? 0.00512 / (lsb * R) : 819.2e6 * lsb * R * (adcRange === 1 ? 4 : 1)
  const calInt = Math.round(cal)
  const plsb = chip === 'ina226' ? 25 * lsb : 0.2 * lsb
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
      {valid && (
        <Result
          rows={[
            [s.shunt.vsh, si(vsh, s.V, lang)],
            [s.shunt.range, `±${si(rangeV, s.V, lang, 5)} — ${vsh <= rangeV ? s.shunt.fits : s.shunt.over}`, vsh > rangeV],
            [s.shunt.psh, si(I * I * R, s.W, lang)],
            [s.shunt.lsb, si(lsb, s.A, lang)],
            [s.shunt.cal, calInt > 32767 ? `${calInt} — ${s.shunt.calOver}` : `${calInt} (0x${calInt.toString(16).toUpperCase().padStart(4, '0')})`, calInt > 32767],
            [s.shunt.plsb, si(plsb, s.W, lang)],
          ]}
        />
      )}
    </section>
  )
}

function BatteryCalc({ s, lang }: { s: Strings; lang: Lang }) {
  const [cells, setCells] = useState('8')
  const [ah, setAh] = useState('100')
  const [load, setLoad] = useState('200')
  const S = Math.round(num(cells)), C = num(ah), P = num(load)
  const valid = ok(S, C) && S > 0 && S <= 64 && C > 0
  const e = 3.2 * S * C
  return (
    <section className="calc" aria-labelledby="c-bat">
      <h2 id="c-bat">{s.bat.title}</h2>
      <div className="calc-grid">
        <Field label={s.bat.s} value={cells} onChange={setCells} />
        <Field label={s.bat.ah} value={ah} onChange={setAh} />
        <Field label={s.bat.load} value={load} onChange={setLoad} />
      </div>
      {valid && (
        <Result
          rows={[
            [s.bat.vn, `${fmt(3.2 * S, lang)} ${s.V}`],
            [s.bat.vfull, `${fmt(3.65 * S, lang)} ${s.V}`],
            [s.bat.vcut, `${fmt(2.5 * S, lang)} ${s.V}`],
            [s.bat.e, `${fmt(e, lang, 4)} ${s.Wh}`],
            [s.bat.t, P > 0 ? `${fmt(e / P, lang)} ${s.h}` : '—'],
          ]}
        />
      )}
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
