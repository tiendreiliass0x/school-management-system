import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { Buffer } from 'node:buffer'

import { authMiddleware, requireSchoolAccess } from '../middleware/auth'
import { documentProcessor } from '../lib/document-processor'
import { db } from '../db'
import { documents } from '../db/schema'

const documentsRouter = new Hono()

const listQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  schoolId: z.string().uuid().optional(),
  uploaderId: z.string().uuid().optional(),
  search: z.string().optional(),
})

type ParsedFile = {
  arrayBuffer: () => Promise<ArrayBuffer>
  name?: string
  type?: string
  size?: number
}

const parseRecord = (
  rawValue: unknown
): Record<string, string | number | boolean | null | undefined> | undefined => {
  if (!rawValue) return undefined

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) return undefined

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string | number | boolean | null | undefined>
      }
    } catch (error) {
      throw new Error('Metadata payload must be valid JSON when provided')
    }

    return undefined
  }

  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return rawValue as Record<string, string | number | boolean | null | undefined>
  }

  return undefined
}

const safeParseMetadata = (metadata: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(metadata)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch (_) {
    // Ignore parsing error and return null
  }

  return null
}

documentsRouter.get(
  '/',
  authMiddleware,
  requireSchoolAccess,
  zValidator('query', listQuerySchema),
  async (c) => {
    try {
      const { page, limit, schoolId, uploaderId, search } = c.req.valid('query')
      const currentUser = c.get('user')

      const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)
      const limitNumber = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20))
      const offset = (pageNumber - 1) * limitNumber

      const filters: SQL[] = []

      let effectiveSchoolId: string | undefined
      if (currentUser.role === 'super_admin') {
        effectiveSchoolId = schoolId
      } else {
        effectiveSchoolId = currentUser.schoolId
      }

      if (!effectiveSchoolId) {
        return c.json({ error: 'A schoolId is required to list documents' }, 400)
      }

      filters.push(eq(documents.schoolId, effectiveSchoolId))

      if (uploaderId) {
        filters.push(eq(documents.uploaderId, uploaderId))
      }

      if (search && search.trim().length) {
        const pattern = `%${search.trim()}%`
        const searchFilter = or(
          ilike(documents.title, pattern),
          ilike(documents.fileName, pattern)
        )

        if (searchFilter) {
          filters.push(searchFilter)
        }
      }

      const whereClause = filters.length === 1 ? filters[0] : and(...filters)

      const items = await db
        .select()
        .from(documents)
        .where(whereClause)
        .orderBy(desc(documents.createdAt))
        .limit(limitNumber)
        .offset(offset)

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(documents)
        .where(whereClause)

      const parsedItems = items.map((item) => ({
        ...item,
        metadata: item.metadata ? safeParseMetadata(item.metadata) : null,
      }))

      return c.json({
        documents: parsedItems,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber),
        },
      })
    } catch (error) {
      console.error('List documents error:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

documentsRouter.get('/:id', authMiddleware, requireSchoolAccess, async (c) => {
  try {
    const id = c.req.param('id')
    const currentUser = c.get('user')

    const documentRecords = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1)

    if (!documentRecords.length) {
      return c.json({ error: 'Document not found' }, 404)
    }

    const documentRecord = documentRecords[0]

    if (currentUser.role !== 'super_admin' && currentUser.schoolId !== documentRecord.schoolId) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json({
      document: {
        ...documentRecord,
        metadata: documentRecord.metadata ? safeParseMetadata(documentRecord.metadata) : null,
      },
    })
  } catch (error) {
    console.error('Get document error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

documentsRouter.post('/', authMiddleware, requireSchoolAccess, async (c) => {
  try {
    const body = (await c.req.parseBody()) as Record<string, unknown>
    const file = body.file as ParsedFile | undefined
    const currentUser = c.get('user')

    if (!file || typeof file.arrayBuffer !== 'function') {
      return c.json({ error: 'A file upload is required under the "file" field' }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const originalName = typeof file.name === 'string' && file.name.length > 0 ? file.name : 'document'
    const contentType = typeof file.type === 'string' && file.type.length > 0 ? file.type : null

    const title = typeof body.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : null
    const description =
      typeof body.description === 'string' && body.description.trim().length > 0
        ? body.description.trim()
        : null

    const metadata = parseRecord(body.metadata)
    const tagsRecord = parseRecord(body.tags)
    const tags = tagsRecord
      ? Object.fromEntries(
          Object.entries(tagsRecord)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
            .filter(([, value]) => value.length > 0)
        )
      : undefined

    let schoolId: string | undefined
    if (currentUser.role === 'super_admin') {
      schoolId = typeof body.schoolId === 'string' && body.schoolId.length > 0 ? body.schoolId : undefined
    } else {
      schoolId = currentUser.schoolId
    }

    if (!schoolId) {
      return c.json({ error: 'A schoolId is required to upload documents' }, 400)
    }

    const uploadResult = await documentProcessor.upload({
      buffer,
      originalName,
      contentType,
      uploaderId: currentUser.id,
      schoolId,
      title,
      description,
      metadata,
      tags,
    })

    return c.json({
      document: {
        ...uploadResult.document,
        metadata: uploadResult.document.metadata
          ? safeParseMetadata(uploadResult.document.metadata)
          : null,
      },
      location: uploadResult.location,
    })
  } catch (error) {
    console.error('Upload document error:', error)
    const isClientError =
      error instanceof Error &&
      (error.message.toLowerCase().includes('content type') ||
        error.message.toLowerCase().includes('document is empty') ||
        error.message.toLowerCase().includes('maximum allowed size') ||
        error.message.toLowerCase().includes('metadata payload') ||
        error.message.toLowerCase().includes('schoolid is required'))

    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload document',
      },
      isClientError ? 400 : 500
    )
  }
})

export default documentsRouter
