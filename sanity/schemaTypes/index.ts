import type { SchemaTypeDefinition } from 'sanity'
import { localeString, localeText } from './locale'
import { author, category, comment, component, message, project, siteUser, topic } from './documents'

export const schemaTypes: SchemaTypeDefinition[] = [
  localeString,
  localeText,
  author,
  category,
  component,
  project,
  topic,
  comment,
  siteUser,
  message,
]
