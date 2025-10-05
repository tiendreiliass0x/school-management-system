import { NextResponse } from 'next/server'

export const revalidate = 0

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
