'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { ClientSubmitDict } from '@/lib/i18n-submit'
import type { Lang } from '@/lib/types'

type Msg = {
  _id: string
  from: 'user' | 'admin'
  authorName: string
  text: string
  createdAt: string
  about?: { id: string; title: string; kind: 'component' | 'project'; slug?: string; status?: string } | null
}

const POLL_MS = 8000

/**
 * A private conversation. Users see their own thread; admins pass `thread`
 * (the user's id) to reply. New messages are fetched every few seconds while
 * the tab is visible; sending refreshes immediately.
 */
export function ChatBox({
  lang,
  l,
  thread,
  about,
  side,
}: {
  lang: Lang
  l: ClientSubmitDict
  /** The user's id when an admin opens a conversation. */
  thread?: string
  /** Pre-selected submission the message is about. */
  about?: { id: string; title: string } | null
  /** Whose view this is: messages from this side are shown as "mine". */
  side: 'user' | 'admin'
}) {
  const [messages, setMessages] = useState<Msg[] | null>(null)
  const [text, setText] = useState('')
  const [topic, setTopic] = useState(about ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const url = `/api/messages${thread ? `?thread=${encodeURIComponent(thread)}` : ''}`

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
      window.dispatchEvent(new CustomEvent('unread-changed', { detail: data.unread }))
    } catch {
      /* offline: keep what we have */
    }
  }, [url])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages?.length])

  async function send(e?: FormEvent) {
    e?.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, thread, about: topic?.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'flagged' ? l.chat.flagged : data.error === 'too_many_requests' ? l.chat.tooMany : l.chat.error)
        return
      }
      setText('')
      setTopic(null)
      await load()
    } catch {
      setError(l.chat.error)
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }
  const time = (iso: string) => new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
  const aboutHref = (a: NonNullable<Msg['about']>) =>
    a.status === 'published' && a.slug ? `/${lang}/${a.kind === 'component' ? 'components' : 'projects'}/${a.slug}` : side === 'user' ? `/${lang}/account/edit/${a.id}` : undefined

  return (
    <div className="chat">
      {messages === null ? (
        <div className="skeleton" aria-hidden="true" />
      ) : messages.length === 0 ? (
        <p className="chat-empty">{l.chat.empty}</p>
      ) : (
        <ol className="chat-list" ref={listRef} aria-live="polite">
          {messages.map((m) => {
            const mine = m.from === side
            return (
              <li key={m._id} className={`chat-msg ${mine ? 'mine' : 'theirs'} ${m.from}`}>
                <div className="chat-meta">
                  <strong>{mine ? l.chat.you : m.from === 'admin' ? `${l.chat.admin} · ${m.authorName}` : m.authorName}</strong>
                  <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
                </div>
                {m.about && (
                  <div className="chat-about">
                    {l.chat.about}:{' '}
                    {aboutHref(m.about) ? <Link href={aboutHref(m.about)!}>{m.about.title}</Link> : m.about.title}
                  </div>
                )}
                <p>{m.text}</p>
              </li>
            )
          })}
        </ol>
      )}

      <form className="chat-form" onSubmit={send}>
        {topic && (
          <div className="chat-topic">
            {l.chat.about}: <strong>{topic.title}</strong>
            <button type="button" className="link-btn" onClick={() => setTopic(null)}>
              {l.chat.clearAbout}
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={l.chat.placeholder}
          aria-label={l.chat.placeholder}
          maxLength={2000}
          rows={3}
        />
        <div className="chat-actions">
          <span className="dim">{l.chat.hint}</span>
          <button className="btn small" type="submit" disabled={busy || !text.trim()}>
            {busy ? l.chat.sending : l.chat.send}
          </button>
        </div>
        {error && (
          <p className="form-note err" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
