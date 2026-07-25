type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

interface ApiResponse<T = unknown> {
  data: T
  status: number
  ok: boolean
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const store = localStorage.getItem('cortex-store')
    if (store) {
      const parsed = JSON.parse(store)
      return parsed?.state?.token || null
    }
  } catch {
    return null
  }
  return null
}

function buildUrl(endpoint: string, params?: ApiOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, params, signal } = options

  const token = getAuthToken()

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  const config: RequestInit = {
    method,
    headers: defaultHeaders,
    signal,
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const url = buildUrl(endpoint, params)

  try {
    const response = await fetch(url, config)
    let data: T

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = (await response.json()) as T
    } else {
      data = (await response.text()) as unknown as T
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === 'object' && data !== null && 'message' in data
          ? (data as { message: string }).message
          : `Request failed with status ${response.status}`

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cortex-store')
          window.location.href = '/login'
        }
      }

      throw new ApiError(errorMessage, response.status, data)
    }

    return { data, status: response.status, ok: true }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request was aborted', 0)
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    )
  }
}

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export const api = {
  get<T>(endpoint: string, options?: Omit<ApiOptions, 'method'>) {
    return request<T>(endpoint, { ...options, method: 'GET' })
  },

  post<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) {
    return request<T>(endpoint, { ...options, method: 'POST', body })
  },

  put<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) {
    return request<T>(endpoint, { ...options, method: 'PUT', body })
  },

  patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) {
    return request<T>(endpoint, { ...options, method: 'PATCH', body })
  },

  delete<T>(endpoint: string, options?: Omit<ApiOptions, 'method'>) {
    return request<T>(endpoint, { ...options, method: 'DELETE' })
  },
}

export function createWebSocketConnection(path: string = '/ws'): WebSocket {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
  const token = getAuthToken()
  const url = `${wsBase}${path}${token ? `?token=${token}` : ''}`

  const ws = new WebSocket(url)

  ws.onopen = () => {
    console.log('[WS] Connection established')
  }

  ws.onerror = (error) => {
    console.error('[WS] Connection error:', error)
  }

  ws.onclose = (event) => {
    console.log(`[WS] Connection closed: code=${event.code}, reason=${event.reason}`)
  }

  return ws
}

export function startTranscriptionStream(
  meetingId: string,
  onTranscript: (text: string) => void,
  onError?: (error: Event) => void
): () => void {
  const ws = createWebSocketConnection(`/ws/transcribe/${meetingId}`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'transcript' && data.text) {
        onTranscript(data.text)
      }
    } catch {
      onTranscript(event.data)
    }
  }

  if (onError) {
    ws.onerror = onError
  }

  return () => {
    ws.close()
  }
}
