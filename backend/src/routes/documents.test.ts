import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import { createDocumentsRouter } from './documents'
import { documents } from '../db/schema'
import type { DocumentUploadInput } from '../lib/document-processor'

type DocumentRecord = typeof documents.$inferSelect

type MockDb = {
  select: (args?: unknown) => any
}

type TestUser = {
  id: string
  email: string
  role: 'super_admin' | 'school_admin' | 'teacher'
  schoolId?: string
}

const superAdminUser: TestUser = {
  id: 'user-1',
  email: 'admin@example.com',
  role: 'super_admin',
}

const teacherUser: TestUser = {
  id: 'user-2',
  email: 'teacher@example.com',
  role: 'teacher',
  schoolId: 'school-123',
}

const createApp = (options: {
  user: TestUser
  db: MockDb
  documentProcessor: { upload: (input: DocumentUploadInput) => Promise<{ document: DocumentRecord; location?: string }> }
}) => {
  const router = createDocumentsRouter({
    authMiddleware: async (c, next) => {
      c.set('user', options.user as any)
      await next()
    },
    requireSchoolAccess: async (_c, next) => {
      await next()
    },
    db: options.db as any,
    documentProcessor: options.documentProcessor as any,
  })

  const app = new Hono()
  app.route('/', router)
  return app
}

describe('documents routes', () => {
  it('lists documents with pagination metadata', async () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    const records: DocumentRecord[] = [
      {
        id: 'doc-1',
        schoolId: 'school-001',
        uploaderId: 'user-1',
        title: 'Report 1',
        fileName: 'report-1.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        description: 'First report',
        s3Bucket: 'bucket',
        s3Key: 'key-1',
        status: 'uploaded',
        checksum: 'abc',
        metadata: JSON.stringify({ category: 'reports' }),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc-2',
        schoolId: 'school-001',
        uploaderId: 'user-2',
        title: 'Report 2',
        fileName: 'report-2.pdf',
        contentType: 'application/pdf',
        fileSize: 2048,
        description: 'Second report',
        s3Bucket: 'bucket',
        s3Key: 'key-2',
        status: 'uploaded',
        checksum: 'def',
        metadata: JSON.stringify({ category: 'finance' }),
        createdAt: now,
        updatedAt: now,
      },
    ]

    const mockDb: MockDb = {
      select: (args?: unknown) => {
        if (args && typeof args === 'object' && args !== null && 'count' in (args as Record<string, unknown>)) {
          return {
            from: () => ({
              where: () => Promise.resolve([{ count: records.length }]),
            }),
          }
        }

        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: async () => records,
                }),
              }),
            }),
          }),
        }
      },
    }

    const app = createApp({
      user: superAdminUser,
      db: mockDb,
      documentProcessor: {
        upload: async () => {
          throw new Error('upload should not be called')
        },
      },
    })

    const response = await app.request(
      'http://localhost/?page=1&limit=10&schoolId=school-001&search=Report'
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.documents).toHaveLength(2)
    expect(payload.documents[0].metadata).toEqual({ category: 'reports' })
    expect(payload.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      pages: 1,
    })
  })

  it('retrieves a document by id and enforces school ownership for non-admins', async () => {
    const now = new Date('2024-01-02T00:00:00.000Z')
    const record: DocumentRecord = {
      id: 'doc-3',
      schoolId: teacherUser.schoolId!,
      uploaderId: teacherUser.id,
      title: 'Syllabus',
      fileName: 'syllabus.pdf',
      contentType: 'application/pdf',
      fileSize: 4096,
      description: 'Course syllabus',
      s3Bucket: 'bucket',
      s3Key: 'key-3',
      status: 'uploaded',
      checksum: 'ghi',
      metadata: JSON.stringify({ unit: 'algebra' }),
      createdAt: now,
      updatedAt: now,
    }

    const mockDb: MockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [record],
          }),
        }),
      }),
    }

    const app = createApp({
      user: teacherUser,
      db: mockDb,
      documentProcessor: {
        upload: async () => {
          throw new Error('upload should not be called')
        },
      },
    })

    const response = await app.request('http://localhost/doc-3')

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.document.id).toBe('doc-3')
    expect(payload.document.metadata).toEqual({ unit: 'algebra' })
  })

  it('uploads a document and forwards metadata and tags to the processor', async () => {
    const uploadCalls: DocumentUploadInput[] = []

    const mockProcessor = {
      upload: async (input: DocumentUploadInput) => {
        uploadCalls.push(input)
        const now = new Date('2024-01-03T00:00:00.000Z')
        const document: DocumentRecord = {
          id: 'doc-4',
          schoolId: teacherUser.schoolId!,
          uploaderId: teacherUser.id,
          title: 'Uploaded Title',
          fileName: 'uploaded.pdf',
          contentType: 'application/pdf',
          fileSize: input.buffer.byteLength,
          description: 'Uploaded description',
          s3Bucket: 'bucket',
          s3Key: 'key-4',
          status: 'uploaded',
          checksum: 'jkl',
          metadata: JSON.stringify({ stored: true }),
          createdAt: now,
          updatedAt: now,
        }

        return { document, location: 'https://example.com/key-4' }
      },
    }

    const app = createApp({
      user: teacherUser,
      db: { select: () => ({}) } as MockDb,
      documentProcessor: mockProcessor,
    })

    const formData = new FormData()
    formData.append('file', new File(['Hello World'], 'notes.txt', { type: 'text/plain' }))
    formData.append('title', 'Lecture Notes')
    formData.append('description', 'Classroom resources')
    formData.append('metadata', JSON.stringify({ lesson: 'geometry', pages: 5 }))
    formData.append('tags', JSON.stringify({ department: 'math', priority: 1 }))

    const response = await app.request('http://localhost/', {
      method: 'POST',
      body: formData,
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(uploadCalls).toHaveLength(1)
    const [call] = uploadCalls
    expect(call.title).toBe('Lecture Notes')
    expect(call.description).toBe('Classroom resources')
    expect(call.schoolId).toBe(teacherUser.schoolId)
    expect(call.uploaderId).toBe(teacherUser.id)
    expect(call.metadata).toEqual({ lesson: 'geometry', pages: 5 })
    expect(call.tags).toEqual({ department: 'math', priority: '1' })
    expect(call.buffer.toString()).toBe('Hello World')

    expect(payload.document.id).toBe('doc-4')
    expect(payload.document.metadata).toEqual({ stored: true })
    expect(payload.location).toBe('https://example.com/key-4')
  })
})
