import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'

const STUDENT_ID_LENGTH = 6
const MAX_ATTEMPTS = 20

export const isValidStudentNumber = (value: string): boolean => {
  return /^\d{6}$/.test(value)
}

const generateCandidate = (): string => {
  const max = 10 ** STUDENT_ID_LENGTH
  const candidate = Math.floor(Math.random() * max).toString().padStart(STUDENT_ID_LENGTH, '0')
  return candidate
}

export const generateStudentNumber = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidate()
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.studentNumber, candidate))
      .limit(1)

    if (!existing.length) {
      return candidate
    }
  }

  throw new Error('Failed to generate a unique student ID after multiple attempts')
}
