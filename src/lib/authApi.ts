import { AUTH_API_BASE} from './constants';
import { computeDeviceId, getDeviceId } from './device';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  customer_id: string;
  base_customer_id?: string;
  is_voiceprint_registered: boolean;
  is_new_user: boolean;
  preferred_language: string | null;
  user?: {
    customer_id: string;
    name: string;
    mobile_number: string;
  };
}

export interface SetLanguageResponse {
  status: string;
  message: string;
  preferred_language: string;
}

export const authApi = {
  async sendOtp(mobile_number: string): Promise<{ status: string; message: string; otp?: string }> {
    const response = await fetch(`${AUTH_API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to send OTP' }));
      throw new Error(error.detail || 'Failed to send OTP');
    }

    return response.json();
  },

  async verifyOtp(mobile_number: string, otp: string): Promise<AuthResponse> {
    // device_id is a deterministic SHA-256 hash of the mobile number —
    // same number always produces the same ID on every browser.
    const device_id = await computeDeviceId(mobile_number);

    const response = await fetch(`${AUTH_API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number, otp, device_id }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(error.detail || 'Verification failed');
    }

    return response.json();
  },

  async refreshToken(refresh_token: string): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token,
        device_id: getDeviceId(), // Read from localStorage cache set during login
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Token refresh failed' }));
      throw new Error(error.detail || 'Token refresh failed');
    }

    return response.json();
  },

  async logout(refresh_token: string): Promise<void> {
    await fetch(`${AUTH_API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token,
        device_id: getDeviceId(), // Read from localStorage cache set during login
      }),
    });
  },

  async setLanguage(mobile_number: string, language: string): Promise<SetLanguageResponse> {
    const response = await fetch(`${AUTH_API_BASE}/auth/set-language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number, language }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to set language' }));
      throw new Error(error.detail || 'Failed to set language');
    }

    return response.json();
  },
};
