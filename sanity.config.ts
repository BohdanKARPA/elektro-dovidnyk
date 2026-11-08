'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { apiVersion, dataset, projectId } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'
import { structure } from './sanity/structure'

export default defineConfig({
  name: 'elektro-dovidnyk',
  title: 'Довідник електроніки — адмін',
  basePath: '/studio',
  projectId: projectId || '10y4h59g',
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
  document: {
    // Comments are created by visitors through the API, not from the "new document" menu.
    newDocumentOptions: (prev) => prev.filter((item) => !['comment', 'siteUser'].includes(item.templateId)),
  },
})
