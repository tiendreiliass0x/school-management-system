import { createHash, randomUUID } from 'node:crypto'
import type { Buffer } from 'node:buffer'

import { db } from '../db'
import { documents } from '../db/schema'
import type { Document } from '../db/schema'
import { uploadBufferToS3, normalizeS3Metadata } from './s3-client'

const DEFAULT_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5MB

export interface DocumentUploadInput {
  buffer: Buffer
  originalName: string
  contentType?: string | null
  uploaderId: string
  schoolId: string
  title?: string | null
  description?: string | null
  metadata?: Record<string, string | number | boolean | null | undefined>
  tags?: Record<string, string>
}

export interface DocumentUploadResult {
  document: Document
  location?: string
}

interface SanitizedFileInfo {
  originalFileName: string
  baseName: string
  extension: string
  sanitizedFileName: string
}

class DocumentProcessor {
  private readonly allowedContentTypes: Set<string>
  private readonly maxFileBytes: number

  constructor() {
    this.allowedContentTypes = this.resolveAllowedContentTypes()
    this.maxFileBytes = this.resolveMaxBytes()
  }

  private resolveAllowedContentTypes(): Set<string> {
    const raw = process.env.DOCUMENT_ALLOWED_MIME_TYPES
    if (!raw) return new Set(DEFAULT_ALLOWED_TYPES)

    const parsed = raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)

    return parsed.length ? new Set(parsed) : new Set(DEFAULT_ALLOWED_TYPES)
  }

  private resolveMaxBytes(): number {
    const raw = process.env.DOCUMENT_MAX_BYTES
    if (!raw) return DEFAULT_MAX_BYTES

    const parsed = Number(raw)
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_MAX_BYTES
    }

    return parsed
  }

  private sanitizeFileName(fileName: string): SanitizedFileInfo {
    const trimmed = fileName.trim()
    const lastDotIndex = trimmed.lastIndexOf('.')

    const base = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed
    const extension = lastDotIndex > 0 ? trimmed.slice(lastDotIndex + 1) : ''

    const sanitizedBase = base
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'document'

    const sanitizedExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '')

    const sanitizedFileName = sanitizedExtension
      ? `${sanitizedBase}.${sanitizedExtension}`
      : sanitizedBase

    return {
      originalFileName: trimmed,
      baseName: sanitizedBase,
      extension: sanitizedExtension,
      sanitizedFileName,
    }
  }

  private ensureFileSize(size: number) {
    if (size <= 0) {
      throw new Error('Document is empty')
    }

    if (size > this.maxFileBytes) {
      throw new Error(`Document exceeds the maximum allowed size of ${this.maxFileBytes} bytes`)
    }
  }

  private ensureContentType(contentType?: string | null) {
    if (!contentType) return

    const normalized = contentType.toLowerCase()
    if (!this.allowedContentTypes.has(normalized)) {
      throw new Error(`Content type ${contentType} is not allowed`)
    }
  }

  private buildStorageKey(schoolId: string, sanitized: SanitizedFileInfo) {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')

    const uniquePart = randomUUID()
    const extension = sanitized.extension ? `.${sanitized.extension}` : ''

    return `documents/${schoolId}/${year}/${month}/${day}/${uniquePart}${extension}`
  }

  private createChecksum(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex')
  }

  public async upload(input: DocumentUploadInput): Promise<DocumentUploadResult> {
    const fileSize = input.buffer.byteLength
    this.ensureFileSize(fileSize)
    this.ensureContentType(input.contentType ?? undefined)

    const sanitized = this.sanitizeFileName(input.originalName)
    const checksum = this.createChecksum(input.buffer)
    const storageKey = this.buildStorageKey(input.schoolId, sanitized)

    const metadata = normalizeS3Metadata({
      original_name: sanitized.originalFileName,
      uploaded_by: input.uploaderId,
      school_id: input.schoolId,
      ...(input.metadata ?? {}),
    })

    const uploadResult = await uploadBufferToS3({
      body: input.buffer,
      key: storageKey,
      contentType: input.contentType ?? undefined,
      metadata: metadata,
      checksum,
      tags: input.tags,
    })

    const [documentRecord] = await db
      .insert(documents)
      .values({
        schoolId: input.schoolId,
        uploaderId: input.uploaderId,
        title: input.title?.trim() || sanitized.baseName,
        fileName: sanitized.sanitizedFileName,
        contentType: input.contentType ?? null,
        fileSize,
        description: input.description?.trim() || null,
        s3Bucket: uploadResult.bucket,
        s3Key: uploadResult.key,
        status: 'uploaded',
        checksum,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return {
      document: documentRecord,
      location: uploadResult.location,
    }
  }
}

export const documentProcessor = new DocumentProcessor()
