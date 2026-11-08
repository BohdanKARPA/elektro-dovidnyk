import type { Dict } from '@/lib/i18n'

const levels = { easy: 1, medium: 2, hard: 3 } as const

export function Difficulty({ value = 'easy', dict }: { value?: 'easy' | 'medium' | 'hard'; dict: Dict }) {
  const n = levels[value]
  return (
    <span className="difficulty">
      <span aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? 'on' : undefined} style={{ marginRight: 3 }} />
        ))}
      </span>
      {dict.difficulty[value]}
    </span>
  )
}
