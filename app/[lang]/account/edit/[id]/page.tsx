import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ComponentSubmitForm, ProjectSubmitForm } from '@/components/SubmitForms'
import { getCurrentUser } from '@/lib/auth'
import { getCategories, getComponents } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'
import { clientSubmitDict } from '@/lib/i18n-submit'
import { getOwnSubmission } from '@/lib/submissions'

export const metadata: Metadata = { robots: { index: false } }

/** The author fixes a submission that an admin or the AI returned for changes. */
export default async function EditSubmissionPage({ params }: PageProps<'/[lang]/account/edit/[id]'>) {
  const { lang, id } = await params
  if (!isLang(lang) || !/^[A-Za-z0-9._-]{1,128}$/.test(id)) notFound()
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login?next=/${lang}/account/edit/${id}`)
  const sub = await getOwnSubmission(id, user._id)
  if (!sub) notFound()

  const dict = getDict(lang)
  const l = clientSubmitDict(lang)
  const note = sub.note || sub.aiReason

  return (
    <div style={{ maxWidth: 760 }}>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/account`}>{getAuthDict(lang).accountTitle}</Link>
      </nav>
      <h1>{sub.kind === 'component' ? l.editComponentTitle : l.editProjectTitle}</h1>
      {sub.status !== 'changes' ? (
        <p className="notice">{l.notEditable}</p>
      ) : (
        <>
          <p className="lede">{l.editIntro}</p>
          {note && (
            <div className="fix-note" role="note">
              <strong>{l.whatToFix}:</strong> {note}
            </div>
          )}
          {sub.kind === 'component' ? (
            <ComponentSubmitForm
              lang={lang}
              l={l}
              categories={(await getCategories()).map((c) => ({ id: c._id, title: t(c.title, lang) }))}
              initial={{ id: sub.id, ...sub.input }}
            />
          ) : (
            <ProjectSubmitForm
              lang={lang}
              l={l}
              parts={(await getComponents()).map((c) => ({ id: c._id, name: c.name, category: t(c.category?.title, lang) }))}
              difficulty={dict.difficulty}
              initial={{ id: sub.id, ...sub.input }}
            />
          )}
        </>
      )}
    </div>
  )
}
