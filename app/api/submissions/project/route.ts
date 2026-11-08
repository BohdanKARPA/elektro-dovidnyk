import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { reviewSubmission } from '@/lib/ai'
import { getComponents } from '@/lib/data'
import { revalidateCatalog } from '@/lib/revalidate'
import { createProject, getOwnSubmission, statusFromReview, updateProject } from '@/lib/submissions'
import { blankToUndefined, clean, consumeQuota, guardSubmission } from '@/lib/submit-guard'

export const runtime = 'nodejs'

const text = (min: number, max: number) => z.string().transform(clean).pipe(z.string().min(min).max(max))

const schema = z.object({
  title: text(8, 120),
  summary: text(20, 240),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  durationHours: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(500).optional()),
  componentIds: z.array(z.string().regex(/^[A-Za-z0-9._-]{1,128}$/)).min(1).max(8),
  steps: z.array(z.object({ title: text(3, 100), text: text(20, 2000) })).min(1).max(12),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
  /** Set when the author resubmits a submission returned for changes. */
  id: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/).optional(),
})

/** Submit a DIY project. AI review decides: publish, reject, or queue for an admin. */
export async function POST(req: NextRequest) {
  const user = await guardSubmission(req, 'project')
  if (user instanceof NextResponse) return user

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((i) => i.path.join('.')) }, { status: 400 })
  const d = parsed.data
  if (d.id) {
    const own = await getOwnSubmission(d.id, user._id)
    if (!own || own.kind !== 'project') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (own.status !== 'changes') return NextResponse.json({ error: 'not_editable' }, { status: 409 })
  }

  const components = await getComponents()
  const ids = [...new Set(d.componentIds)]
  if (!ids.every((id) => components.some((c) => c._id === id))) return NextResponse.json({ error: 'invalid_input', fields: ['componentIds'] }, { status: 400 })

  const limited = consumeQuota(user, 'project', Boolean(d.id))
  if (limited) return limited

  const input = { title: d.title, summary: d.summary, difficulty: d.difficulty, durationHours: d.durationHours, componentIds: ids, steps: d.steps }
  const review =
    user.role === 'admin'
      ? null
      : await reviewSubmission('project', { ...input, componentIds: undefined, components: ids.map((id) => components.find((c) => c._id === id)?.name) })
  const status = statusFromReview(review, user.role === 'admin')
  const saved = d.id ? { id: d.id, slug: await updateProject(d.id, input, status, review) } : await createProject(input, user, status, review)
  revalidateCatalog()
  return NextResponse.json({ slug: saved.slug, id: saved.id, status, reason: review && !review.failed ? review.reason : null }, { status: d.id ? 200 : 201 })
}
