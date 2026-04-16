const DEVICE_ID_KEY = 'voicebank.device_id';

/**
 * Computes a deterministic device_id from the mobile number using SHA-256.
 *
 * Same mobile number → same hash → same device_id on every browser, every device.
 * Also persists the result in localStorage so refresh/logout calls can read it
 * without needing the mobile number again.
 */
export async function computeDeviceId(mobileNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(mobileNumber);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Cache so getDeviceId() works for refresh/logout
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

/**
 * Returns the cached device_id (stored during login).
 * Use this for refresh and logout calls where the mobile number is not available.
 * Returns an empty string if not yet set (pre-login state).
 */
export function getDeviceId(): string {
  return localStorage.getItem(DEVICE_ID_KEY) ?? '';
}
