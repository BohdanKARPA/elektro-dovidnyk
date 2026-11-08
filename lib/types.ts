export type Lang = 'uk' | 'en'
export type Localized = { uk?: string; en?: string } | null | undefined

export interface SanityImage {
  asset?: { _ref?: string; _id?: string; url?: string }
  hotspot?: unknown
}

export interface Category {
  _id: string
  title: Localized
  slug: string
  icon?: string
  description?: Localized
  count?: number
}

export interface Spec {
  _key: string
  label: string
  value: string
}

export interface ComponentDoc {
  _id: string
  name: string
  slug: string
  manufacturer?: string
  category?: Category | null
  summary: Localized
  description?: Localized
  seoDescription?: Localized
  image?: SanityImage | null
  specs?: Spec[]
  package?: string
  priceUah?: number
  datasheetUrl?: string
  lcscPart?: string
  tags?: string[]
}

export interface Author {
  _id: string
  name: string
  slug: string
  role?: Localized
  bio?: Localized
}

export interface Step {
  _key: string
  title: Localized
  text: Localized
  image?: SanityImage | null
}

export interface ProjectDoc {
  _id: string
  title: Localized
  slug: string
  summary: Localized
  seoDescription?: Localized
  difficulty?: 'easy' | 'medium' | 'hard'
  durationHours?: number
  publishedAt?: string
  author?: Author | null
  /** Name of the site user who submitted the project (user submissions). */
  submittedByName?: string
  cover?: SanityImage | null
  components?: ComponentDoc[]
  steps?: Step[]
}

export interface Topic {
  _id: string
  title: string
  slug: string
  authorName?: string
  body: string
  pinned?: boolean
  createdAt?: string
  related?: ComponentDoc | null
  commentCount?: number
}

export interface CommentDoc {
  _id: string
  authorName: string
  text: string
  createdAt?: string
}
