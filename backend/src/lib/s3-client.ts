import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Buffer } from 'node:buffer'

let cachedClient: S3Client | null = null

const resolveRegion = (): string => {
  const region = process.env.AWS_REGION

  if (!region) {
    throw new Error('AWS_REGION environment variable is required for document uploads')
  }

  return region
}

const resolveBucket = (bucket?: string): string => {
  const envBucket = bucket || process.env.AWS_S3_BUCKET || process.env.DOCUMENTS_S3_BUCKET

  if (!envBucket) {
    throw new Error('AWS_S3_BUCKET (or DOCUMENTS_S3_BUCKET) environment variable is required for document uploads')
  }

  return envBucket
}

export const getS3Client = (): S3Client => {
  if (!cachedClient) {
    const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined

    cachedClient = new S3Client({
      region: resolveRegion(),
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      credentials,
    })
  }

  return cachedClient
}

export interface UploadBufferOptions {
  body: Buffer
  key: string
  bucket?: string
  contentType?: string
  metadata?: Record<string, string>
  checksum?: string
  tags?: Record<string, string>
}

const buildTaggingString = (tags?: Record<string, string>): string | undefined => {
  if (!tags) return undefined

  const entries = Object.entries(tags).filter(([, value]) => typeof value === 'string' && value.length > 0)
  if (!entries.length) return undefined

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export const normalizeS3Metadata = (
  metadata?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> | undefined => {
  if (!metadata) return undefined

  const normalized: Record<string, string> = {}

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    if (rawValue === null || rawValue === undefined) continue

    const key = rawKey
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '_')
      .slice(0, 128)

    const value = String(rawValue).slice(0, 1024)

    if (!key || !value) continue

    normalized[key] = value
  }

  return Object.keys(normalized).length ? normalized : undefined
}

export interface UploadResult {
  bucket: string
  key: string
  etag?: string
  location?: string
}

export const uploadBufferToS3 = async (options: UploadBufferOptions): Promise<UploadResult> => {
  const bucket = resolveBucket(options.bucket)
  const client = getS3Client()
  const metadata = normalizeS3Metadata(options.metadata)
  const tagging = buildTaggingString(options.tags)

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      Metadata: metadata,
      ChecksumSHA256: options.checksum,
      Tagging: tagging,
    },
  })

  const result = await upload.done()

  return {
    bucket,
    key: options.key,
    etag: result.ETag,
    location: `s3://${bucket}/${options.key}`,
  }
}
