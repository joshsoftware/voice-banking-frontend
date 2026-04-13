import { API_BASE } from './constants'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

class HttpClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getTokens() {
    return {
      accessToken: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
    }
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  private clearTokens() {
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

    // Handle Token Refresh on 401
    if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
      const { refreshToken } = this.getTokens()
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
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

export const httpClient = new HttpClient(API_BASE)
