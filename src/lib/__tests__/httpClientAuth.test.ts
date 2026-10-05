import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient, registerSessionInvalidatedHandler, AppApiError } from '../httpClient'

describe('httpClient authentication & 401 recovery', () => {
  const sessionHandler = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionHandler.mockReset()
    registerSessionInvalidatedHandler(sessionHandler)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('clears tokens and notifies session invalidation when backend returns Session expired or invalidated', async () => {
    localStorage.setItem('voicebank.access_token', 'expired-token')
    localStorage.setItem('voicebank.refresh_token', 'valid-refresh')

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Session expired or invalidated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(httpClient.get('/auth/me')).rejects.toThrow('You have been logged out')

    expect(sessionHandler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('voicebank.access_token')).toBeNull()
    expect(localStorage.getItem('voicebank.refresh_token')).toBeNull()
  })

  it('clears tokens and redirects when 401 occurs without a refresh token', async () => {
    localStorage.setItem('voicebank.access_token', 'stale-token')

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(httpClient.get('/auth/me')).rejects.toBeInstanceOf(AppApiError)

    expect(sessionHandler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('voicebank.access_token')).toBeNull()
  })

  it('clears tokens and redirects if retried request returns 401 after token refresh', async () => {
    localStorage.setItem('voicebank.access_token', 'old-access')
    localStorage.setItem('voicebank.refresh_token', 'valid-refresh')
    localStorage.setItem('voicebank.device_id', 'test-device')

    // 1. Initial request returns 401 (expired access token)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // 2. Refresh endpoint returns 200 OK with new tokens
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // 3. Retried request returns 401 again (e.g. session mismatch)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Device ID missing in token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(httpClient.get('/auth/me')).rejects.toBeInstanceOf(AppApiError)

    expect(sessionHandler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('voicebank.access_token')).toBeNull()
    expect(localStorage.getItem('voicebank.refresh_token')).toBeNull()
  })

  it('clears tokens and redirects when token refresh fails with 401', async () => {
    localStorage.setItem('voicebank.access_token', 'old-access')
    localStorage.setItem('voicebank.refresh_token', 'revoked-refresh')

    // 1. Initial request returns 401
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // 2. Refresh request fails with 401
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Token has been revoked' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(httpClient.get('/auth/me')).rejects.toBeInstanceOf(AppApiError)

    expect(sessionHandler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('voicebank.access_token')).toBeNull()
    expect(localStorage.getItem('voicebank.refresh_token')).toBeNull()
  })

  it('successfully refreshes and returns retried response when retry succeeds', async () => {
    localStorage.setItem('voicebank.access_token', 'old-access')
    localStorage.setItem('voicebank.refresh_token', 'valid-refresh')
    localStorage.setItem('voicebank.device_id', 'test-device')

    // 1. Initial request returns 401
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // 2. Refresh request succeeds
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // 3. Retried request returns 200 OK
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ mobile_number: '919876543210', customer_id: 'cust-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await httpClient.get<{ customer_id: string }>('/auth/me')

    expect(result).toEqual({ mobile_number: '919876543210', customer_id: 'cust-1' })
    expect(sessionHandler).not.toHaveBeenCalled()
    expect(localStorage.getItem('voicebank.access_token')).toBe('new-access')
    expect(localStorage.getItem('voicebank.refresh_token')).toBe('new-refresh')
  })
})
