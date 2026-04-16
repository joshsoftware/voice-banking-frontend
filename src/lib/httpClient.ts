import { AUTH_API_BASE } from './constants'
import { getDeviceId } from './device'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

type SessionInvalidatedHandler = () => void;
let onSessionInvalidated: SessionInvalidatedHandler | null = null;

export function registerSessionInvalidatedHandler(handler: SessionInvalidatedHandler) {
  onSessionInvalidated = handler;
}

class HttpClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getTokens() {
    return {
      // Use the primary AuthContext's storage keys
      accessToken: localStorage.getItem('voicebank.access_token') || localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('voicebank.refresh_token') || localStorage.getItem('refresh_token'),
    }
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('voicebank.access_token', accessToken)
    localStorage.setItem('voicebank.refresh_token', refreshToken)
  }

  private clearTokens() {
    localStorage.removeItem('voicebank.access_token')
    localStorage.removeItem('voicebank.refresh_token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { accessToken } = this.getTokens()
    const { params, headers, ...rest } = options

    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`
    }

    const config = {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    }

    let response = await fetch(url, config)

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}))
      
      // Check for specific session invalidation message from backend
      if (errorData.detail === 'Session expired or invalidated') {
        if (onSessionInvalidated) {
          onSessionInvalidated()
        }
        throw {
          status: 401,
          message: errorData.detail,
          data: errorData,
        }
      }

      if (!endpoint.includes('/auth/refresh')) {
        const { refreshToken } = this.getTokens()
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                refresh_token: refreshToken,
                device_id: getDeviceId(), // Required by backend
              }),
            })

            if (refreshRes.ok) {
              const data = await refreshRes.json()
              this.setTokens(data.access_token, data.refresh_token)

              // Retry the original request with new token
              const retryHeaders = {
                ...config.headers,
                Authorization: `Bearer ${data.access_token}`,
              }
              response = await fetch(url, { ...config, headers: retryHeaders })
            } else {
              // Refresh failed, logout
              this.clearTokens()
              window.location.href = '/welcome'
            }
          } catch (error) {
            this.clearTokens()
            window.location.href = '/welcome'
          }
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw {
        status: response.status,
        message: errorData.message || errorData.detail || 'An error occurred',
        data: errorData,
      }
    }

    return response.json()
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const httpClient = new HttpClient(AUTH_API_BASE)
