import { httpClient } from '@/lib/httpClient'

export interface AuthSuccessResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface SendOtpResponse {
  status: string
  message: string
  otp?: string // Available in dev/test
}

export const authService = {
  async sendOtp(mobileNumber: string): Promise<SendOtpResponse> {
    return httpClient.post<SendOtpResponse>('/auth/send-otp', { mobile_number: mobileNumber })
  },

  async verifyOtp(mobileNumber: string, otp: string): Promise<AuthSuccessResponse> {
    return httpClient.post<AuthSuccessResponse>('/auth/verify-otp', {
      mobile_number: mobileNumber,
      otp: otp,
    })
  },

  async refreshToken(refreshToken: string): Promise<AuthSuccessResponse> {
    return httpClient.post<AuthSuccessResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
  },

  async logout(refreshToken: string): Promise<{ status: string; message: string }> {
    return httpClient.post('/auth/logout', { refresh_token: refreshToken })
  },
}
