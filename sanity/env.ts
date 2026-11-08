export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-11-01'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''

/** Without a project ID the site runs on the bundled demo data (data/seed.json). */
export const isSanityConfigured = /^[a-z0-9-]+$/.test(projectId)
