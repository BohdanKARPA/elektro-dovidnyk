/**
 * Imports data/seed.json into your Sanity dataset.
 * Usage:  node --env-file=.env.local scripts/seed.mjs
 * Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and SANITY_API_WRITE_TOKEN (Editor rights).
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

// References must point at existing documents, so create in dependency order.
const order = ['author', 'category', 'component', 'project', 'topic', 'comment']
const tx = client.transaction()
for (const type of order) for (const doc of docs.filter((d) => d._type === type)) tx.createOrReplace(doc)

const res = await tx.commit()
console.log(`Imported ${res.results.length} documents into ${projectId}/${dataset}.`)
