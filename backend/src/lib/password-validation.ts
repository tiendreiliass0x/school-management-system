import { z } from 'zod'

/**
 * Strong password validation with comprehensive security requirements
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must be less than 128 characters')
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    'Password must contain at least one special character'
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password must not contain more than 2 consecutive identical characters'
  )
  .refine(
    (password) => !/^(?:password|123456|qwerty|admin|letmein|welcome|monkey|dragon)$/i.test(password),
    'Password cannot be a common weak password'
  )

/**
 * Password strength checker
 */
export interface PasswordStrength {
  score: number // 0-100
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0
  const feedback: string[] = []

  // Length scoring
  if (password.length >= 12) score += 25
  else if (password.length >= 8) score += 15
  else feedback.push('Use at least 12 characters')

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10
  else feedback.push('Add lowercase letters')

  if (/[A-Z]/.test(password)) score += 10
  else feedback.push('Add uppercase letters')

  if (/[0-9]/.test(password)) score += 10
  else feedback.push('Add numbers')

  if (/[^a-zA-Z0-9]/.test(password)) score += 15
  else feedback.push('Add special characters')

  // Additional complexity scoring
  if (password.length >= 16) score += 10
  if (/[^a-zA-Z0-9\s]/.test(password) && password.length >= 12) score += 10
  if (!/(.)\1{2,}/.test(password)) score += 10
  else feedback.push('Avoid repeating characters')

  // Determine level
  let level: PasswordStrength['level']
  if (score >= 90) level = 'strong'
  else if (score >= 70) level = 'good'
  else if (score >= 50) level = 'fair'
  else if (score >= 30) level = 'weak'
  else level = 'very-weak'

  return { score, level, feedback }
}

/**
 * Common weak passwords list (subset)
 */
const COMMON_WEAK_PASSWORDS = new Set([
  'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
  'welcome', 'monkey', 'dragon', '123456789', 'abc123', 'password1',
  'iloveyou', 'princess', 'admin123', 'welcome123', '1234567890',
  'password@123', 'qwerty123', 'adminadmin'
])

/**
 * Check if password is in common weak passwords list
 */
export const isCommonWeakPassword = (password: string): boolean => {
  return COMMON_WEAK_PASSWORDS.has(password.toLowerCase())
}

/**
 * Check for password patterns that should be avoided
 */
export const hasWeakPatterns = (password: string): { hasWeak: boolean; patterns: string[] } => {
  const patterns: string[] = []
  
  // Sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    patterns.push('Sequential letters detected')
  }
  
  // Sequential numbers
  if (/(?:123|234|345|456|567|678|789|012)/.test(password)) {
    patterns.push('Sequential numbers detected')
  }
  
  // Keyboard patterns
  if (/(?:qwer|asdf|zxcv|1234|qwerty|asdfgh|zxcvbn)/i.test(password)) {
    patterns.push('Keyboard pattern detected')
  }
  
  // Date patterns
  if (/(?:19|20)\d{2}/.test(password)) {
    patterns.push('Year pattern detected')
  }
  
  return { hasWeak: patterns.length > 0, patterns }
}

/**
 * Comprehensive password validation for registration
 */
export const validatePassword = (password: string): { 
  isValid: boolean
  errors: string[] 
  strength: PasswordStrength 
} => {
  const errors: string[] = []
  
  try {
    passwordSchema.parse(password)
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map((e: any) => e.message))
    }
  }
  
  // Additional checks
  if (isCommonWeakPassword(password)) {
    errors.push('Password is too common and easily guessable')
  }
  
  const { hasWeak, patterns } = hasWeakPatterns(password)
  if (hasWeak) {
    errors.push(...patterns)
  }
  
  const strength = checkPasswordStrength(password)
  
  // Require at least "fair" strength
  if (strength.score < 50) {
    errors.push('Password is too weak - please choose a stronger password')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}
