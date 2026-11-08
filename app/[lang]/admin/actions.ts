'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { findUserById, getCurrentUser, updateUser } from '@/lib/auth'
import { setCommentStatus, setTopicHidden } from '@/lib/community'
import { revalidateCatalog, revalidateCommunity } from '@/lib/revalidate'
import { setSubmissionStatus } from '@/lib/submissions'
import { sendMessage } from '@/lib/messages'
import { getSubmitDict } from '@/lib/i18n-submit'

/**
 * Admin-only server actions. Every action re-checks the role on the server:
 * hiding a button in the UI is not access control. Next.js also rejects
 * server-action calls whose Origin does not match the host (CSRF).
 */
async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin' || user.blocked) throw new Error('Forbidden: administrators only')
  return user
}

const id = z.string().regex(/^[A-Za-z0-9._-]{1,128}$/)
const done = () => revalidatePath('/[lang]/admin', 'page')

export async function setUserBlocked(formData: FormData) {
  const admin = await requireAdmin()
  const userId = id.parse(formData.get('id'))
  const blocked = z.enum(['true', 'false']).parse(formData.get('blocked')) === 'true'
  if (userId === admin._id) return // cannot block yourself
  const target = await findUserById(userId)
  if (!target || (blocked && target.role === 'admin')) return // admins must be demoted first
  await updateUser(userId, { blocked })
  done()
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin()
  const userId = id.parse(formData.get('id'))
  const role = z.enum(['user', 'admin']).parse(formData.get('role'))
  if (userId === admin._id) return // cannot change your own role (no accidental lock-out)
  await updateUser(userId, role === 'admin' ? { role, blocked: false } : { role })
  done()
}

export async function moderateComment(formData: FormData) {
  await requireAdmin()
  await setCommentStatus(id.parse(formData.get('id')), z.enum(['approved', 'rejected']).parse(formData.get('status')))
  revalidateCommunity()
  done()
}

export async function setTopicVisibility(formData: FormData) {
  await requireAdmin()
  await setTopicHidden(id.parse(formData.get('id')), z.enum(['true', 'false']).parse(formData.get('hidden')) === 'true')
  revalidateCommunity()
  done()
}

/**
 * Publish, return for changes or reject a user submission. Returning and
 * rejecting need a note; the author gets it in their account and as a chat message.
 */
export async function moderateSubmission(formData: FormData) {
  const admin = await requireAdmin()
  const submissionId = id.parse(formData.get('id'))
  const status = z.enum(['published', 'changes', 'rejected']).parse(formData.get('status'))
  const note = z.string().trim().max(500).parse(formData.get('note') ?? '')
  if (status !== 'published' && !note) return // the form requires a note; ignore crafted requests without one
  const meta = await setSubmissionStatus(submissionId, status, note || undefined)
  if (meta?.userId && (status !== 'published' || note)) {
    const t = getSubmitDict('uk').auto
    await sendMessage({ thread: meta.userId, from: 'admin', authorName: admin.name, text: t[status](meta.title, note), about: submissionId })
  }
  revalidateCatalog()
  done()
}
