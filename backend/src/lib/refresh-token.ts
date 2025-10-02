import crypto from 'crypto'
import { eq, and, lt, gt } from 'drizzle-orm'
import { db } from '../db'
import { refreshTokens, users, type RefreshToken, type NewRefreshToken } from '../db/schema'

/**
 * Refresh token configuration
 */
export const REFRESH_TOKEN_CONFIG = {
  EXPIRY_DAYS: 30, // 30 days
  MAX_TOKENS_PER_USER: 5, // Limit concurrent sessions
  TOKEN_LENGTH: 32, // bytes
} as const

/**
 * Generate a cryptographically secure refresh token
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(REFRESH_TOKEN_CONFIG.TOKEN_LENGTH).toString('hex')
}

/**
 * Hash a refresh token for secure storage
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new refresh token for a user
 */
export const createRefreshToken = async (
  userId: string,
  deviceInfo?: string
): Promise<{ token: string; tokenRecord: RefreshToken }> => {
  // Generate the token
  const token = generateRefreshToken()
  const tokenHash = hashRefreshToken(token)
  
  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_CONFIG.EXPIRY_DAYS)
  
  // Clean up old tokens first (keep only the most recent ones)
  await cleanupOldTokens(userId)
  
  // Create the token record
  const tokenData: NewRefreshToken = {
    userId,
    tokenHash,
    expiresAt,
    deviceInfo,
    isRevoked: false,
  }
  
  const [tokenRecord] = await db.insert(refreshTokens).values(tokenData).returning()
  
  return { token, tokenRecord }
}

/**
 * Verify and use a refresh token
 */
export const verifyRefreshToken = async (
  token: string
): Promise<{ isValid: boolean; userId?: string; tokenRecord?: RefreshToken }> => {
  const tokenHash = hashRefreshToken(token)
  
  // Find the token in database
  const tokenRecord = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.isRevoked, false),
        gt(refreshTokens.expiresAt, new Date()) // Not expired
      )
    )
    .limit(1)
  
  if (!tokenRecord.length) {
    return { isValid: false }
  }
  
  const token_record = tokenRecord[0]
  
  // Verify user is still active
  const user = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, token_record.userId))
    .limit(1)
  
  if (!user.length || !user[0].isActive) {
    // Revoke token if user is inactive
    await revokeRefreshToken(token)
    return { isValid: false }
  }
  
  // Update last used timestamp
  await db
    .update(refreshTokens)
    .set({ 
      lastUsedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(refreshTokens.id, token_record.id))
  
  return { 
    isValid: true, 
    userId: token_record.userId, 
    tokenRecord: token_record 
  }
}

/**
 * Revoke a refresh token
 */
export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  const tokenHash = hashRefreshToken(token)
  
  const result = await db
    .update(refreshTokens)
    .set({ 
      isRevoked: true,
      updatedAt: new Date()
    })
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .returning()
  
  return result.length > 0
}

/**
 * Revoke all refresh tokens for a user (useful for logout all devices)
 */
export const revokeAllUserTokens = async (userId: string): Promise<number> => {
  const result = await db
    .update(refreshTokens)
    .set({ 
      isRevoked: true,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, false)
      )
    )
    .returning()
  
  return result.length
}

/**
 * Clean up old tokens for a user (keep only the most recent active ones)
 */
export const cleanupOldTokens = async (userId: string): Promise<void> => {
  // Get all active tokens for user, ordered by creation date
  const userTokens = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, false)
      )
    )
    .orderBy(refreshTokens.createdAt)
  
  // If we're at or above the limit, revoke the oldest ones
  if (userTokens.length >= REFRESH_TOKEN_CONFIG.MAX_TOKENS_PER_USER) {
    const tokensToRevoke = userTokens.slice(0, userTokens.length - REFRESH_TOKEN_CONFIG.MAX_TOKENS_PER_USER + 1)
    
    for (const token of tokensToRevoke) {
      await db
        .update(refreshTokens)
        .set({ 
          isRevoked: true,
          updatedAt: new Date()
        })
        .where(eq(refreshTokens.id, token.id))
    }
  }
}

/**
 * Clean up expired tokens (run periodically)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await db
    .update(refreshTokens)
    .set({ 
      isRevoked: true,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(refreshTokens.isRevoked, false),
        lt(refreshTokens.expiresAt, new Date())
      )
    )
    .returning()
  
  return result.length
}

/**
 * Get active tokens for a user (for session management)
 */
export const getUserActiveTokens = async (userId: string): Promise<RefreshToken[]> => {
  return await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, false),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .orderBy(refreshTokens.lastUsedAt)
}

/**
 * Get device info from request headers
 */
export const getDeviceInfo = (userAgent?: string, ip?: string): string => {
  const info = []
  
  if (userAgent) {
    // Extract browser and OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)
    const osMatch = userAgent.match(/(Windows|Mac|Linux|iOS|Android)/)
    
    if (browserMatch) info.push(browserMatch[0])
    if (osMatch) info.push(osMatch[0])
  }
  
  if (ip) info.push(`IP: ${ip}`)
  
  return info.join(' | ') || 'Unknown Device'
}
