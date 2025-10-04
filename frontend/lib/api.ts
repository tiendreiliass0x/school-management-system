import { appConfig } from './config'

type FetchOptions = RequestInit & { revalidate?: number }

export interface HealthResponse {
  status: string
  timestamp: string
  version?: string
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = new URL(path, appConfig.apiBaseUrl)
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  }

  try {
    const response = await fetch(url, {
      ...requestOptions,
      cache: options.revalidate === undefined ? 'no-store' : 'force-cache',
      next: options.revalidate ? { revalidate: options.revalidate } : undefined
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    return (await response.json()) as T
  } catch (error) {
    console.warn('[apiFetch] Request failed', error)
    throw error
  }
}

export async function getHealthStatus(): Promise<HealthResponse | null> {
  try {
    return await apiFetch<HealthResponse>('/health')
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getHealthStatus] Failed to retrieve health status:', error)
    }
    return null
  }
}
