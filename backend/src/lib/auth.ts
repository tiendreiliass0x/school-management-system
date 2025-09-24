import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../db/schema'
import { createRefreshToken, getDeviceInfo } from './refresh-token'

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (user: Omit<User, 'passwordHash'>): string => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    },
    jwtSecret,
    { expiresIn: '4h' }
  )
}

export const verifyToken = (token: string): jwt.JwtPayload | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set')
    }

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload
    return decoded
  } catch (error) {
    return null
  }
}

export type JWTPayload = {
  id: string
  email: string
  role: string
  schoolId?: string
  iat?: number
  exp?: number
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Generate both access and refresh tokens for a user
 */
export const generateAuthTokens = async (
  user: Omit<User, 'passwordHash'>,
  userAgent?: string,
  ip?: string
): Promise<AuthTokens> => {
  // Generate access token
  const accessToken = generateToken(user)
  
  // Generate refresh token
  const deviceInfo = getDeviceInfo(userAgent, ip)
  const { token: refreshToken } = await createRefreshToken(user.id, deviceInfo)
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 4 * 60 * 60 // 4 hours in seconds
  }
}