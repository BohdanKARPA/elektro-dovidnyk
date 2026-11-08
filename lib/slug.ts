/**
 * Ukrainian → Latin transliteration (official system, Cabinet of Ministers
 * resolution No. 55, 2010) for readable URLs: «Плата не стартує» → plata-ne-startuie.
 */
const map: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i',
  ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '', ʼ: '',
}
// At the start of a word these letters are written differently.
const initial: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' }

export function transliterate(input: string): string {
  let out = ''
  let prevLetter = false
  for (const ch of input.toLowerCase()) {
    const isLetter = /\p{L}/u.test(ch)
    out += !prevLetter && initial[ch] ? initial[ch] : (map[ch] ?? ch)
    prevLetter = isLetter
  }
  return out
}

export function slugify(input: string, maxLength = 60): string {
  return (
    transliterate(input)
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength)
      .replace(/-+$/g, '') || 'topic'
  )
}
