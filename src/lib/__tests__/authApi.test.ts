import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../device', () => ({
  computeDeviceId: vi.fn(),
  getDeviceId: vi.fn(),
}))

import { computeDeviceId, getDeviceId } from '../device'
import { authApi } from '../authApi'

const mockedComputeDeviceId = vi.mocked(computeDeviceId)
const mockedGetDeviceId = vi.mocked(getDeviceId)

describe('authApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockedComputeDeviceId.mockResolvedValue('device-hash')
    mockedGetDeviceId.mockReturnValue('cached-device-hash')
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends OTP requests with the expected payload', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok', message: 'sent', otp: '123456' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(authApi.sendOtp('919876543210')).resolves.toEqual({
      status: 'ok',
      message: 'sent',
      otp: '123456',
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/send-otp'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: '919876543210' }),
      }),
    )
  })

  it('verifies OTP with the deterministic device id', async () => {
    const response = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      customer_id: 'customer-1',
      is_voiceprint_registered: false,
      is_new_user: true,
      preferred_language: null,
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(authApi.verifyOtp('919876543210', '123456')).resolves.toEqual(response)
    expect(mockedComputeDeviceId).toHaveBeenCalledWith('919876543210')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/verify-otp'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          mobile_number: '919876543210',
          otp: '123456',
          device_id: 'device-hash',
        }),
      }),
    )
  })

  it('uses the cached device id for refresh requests', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await authApi.refreshToken('refresh-token')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'refresh-token',
          device_id: 'cached-device-hash',
        }),
      }),
    )
  })

  it('throws backend error details when verification fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Invalid OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(authApi.verifyOtp('919876543210', '000000')).rejects.toThrow('Invalid OTP')
  })
})

