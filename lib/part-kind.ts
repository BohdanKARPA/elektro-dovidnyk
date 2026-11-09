import type { Lang } from './types'

/**
 * Boards and modules (Arduino UNO Q, ESP32 DevKit, a ready DC-DC module…) are a
 * different kind of thing from bare chips (ATmega328P, STM32…): they have a
 * board format instead of a package and are compared among themselves.
 */
export const BOARD_CATEGORY = 'boards'
const BOARD_WORDS = /плат[аи]|модул|board|module|devkit|shield|breakout/i

export function isBoard(c: { category?: { slug?: string } | null; package?: string }): boolean {
  if (c.category?.slug) return c.category.slug === BOARD_CATEGORY
  return BOARD_WORDS.test(c.package ?? '')
}

export function kindLabel(board: boolean, lang: Lang): string {
  return board ? (lang === 'uk' ? 'Плата / модуль' : 'Board / module') : lang === 'uk' ? 'Мікросхема' : 'Chip'
}

/** "Package" for chips, "Format" for boards, both when a list mixes them. */
export function packageLabel(boards: boolean[], lang: Lang): string {
  const all = boards.length > 0 && boards.every(Boolean)
  const some = boards.some(Boolean)
  if (all) return lang === 'uk' ? 'Формат плати' : 'Board format'
  if (some) return lang === 'uk' ? 'Корпус / формат' : 'Package / format'
  return lang === 'uk' ? 'Корпус' : 'Package'
}
