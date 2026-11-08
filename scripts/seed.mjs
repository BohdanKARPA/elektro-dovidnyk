/**
 * Imports data/seed.json into your Sanity dataset.
 * Usage:  node --env-file=.env.local scripts/seed.mjs
 * Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and SANITY_API_WRITE_TOKEN (Editor rights).
 *
 * Optional SEED_OWNER_EMAIL: the site account of the author of the demo content.
 * If that account exists, the author profile and the demo topics and comments
 * signed with the author's first name are linked to it, so they show up in
 * that user's "My account" page. The email itself is not written anywhere.
 */
import { readFile } from 'node:fs/promises'
import { createClient } from '@sanity/client'

const { NEXT_PUBLIC_SANITY_PROJECT_ID: projectId, NEXT_PUBLIC_SANITY_DATASET: dataset = 'production', SANITY_API_WRITE_TOKEN: token } =
  process.env

if (!projectId || !token) {
  console.error('Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.local first.')
  process.exit(1)
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-11-01', useCdn: false })
const docs = JSON.parse(await readFile(new URL('../data/seed.json', import.meta.url), 'utf8'))

const ownerEmail = (process.env.SEED_OWNER_EMAIL || '').trim().toLowerCase()
const owner = ownerEmail ? await client.fetch('*[_type == "siteUser" && email == $email][0]{ _id, name }', { email: ownerEmail }) : null
if (ownerEmail && !owner) console.warn(`No site account with SEED_OWNER_EMAIL yet — register it on the site and run the seed again to link the content.`)
if (owner) {
  const authorDoc = docs.find((d) => d._id === 'author-karpa')
  const firstName = authorDoc?.name?.split(' ')[0]
  const ref = { _type: 'reference', _ref: owner._id, _weak: true }
  let linked = 0
  for (const d of docs) {
    if (d._id === 'author-karpa') d.user = ref
    else if ((d._type === 'topic' || d._type === 'comment') && d.authorName === firstName) {
      d.author = ref
      linked++
    }
  }
  console.log(`Linked the author profile and ${linked} topics/comments to the account "${owner.name}".`)
}

// References must point at existing documents, so create in dependency order.
const order = ['author', 'category', 'component', 'project', 'topic', 'comment']
const tx = client.transaction()
for (const type of order) for (const doc of docs.filter((d) => d._type === type)) tx.createOrReplace(doc)

const res = await tx.commit()
console.log(`Imported ${res.results.length} documents into ${projectId}/${dataset}.`)
