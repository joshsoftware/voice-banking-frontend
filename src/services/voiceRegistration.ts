import { API_BASE } from '@/lib/constants'

export interface StartVoiceRegistrationResponse {
  registrationId: string
}

// Integration placeholders: update endpoint paths/payloads after backend repo is shared.
export async function startVoiceRegistration(userId: string) {
  const res = await fetch(`${API_BASE}/voice-registration/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`startVoiceRegistration failed: ${res.status}`)
  return (await res.json()) as StartVoiceRegistrationResponse
}

export async function submitVoiceConsent(registrationId: string, consentAccepted: boolean) {
  const res = await fetch(`${API_BASE}/voice-registration/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId, consentAccepted }),
  })
  if (!res.ok) throw new Error(`submitVoiceConsent failed: ${res.status}`)
  return res.json()
}

export async function completeVoiceRegistration(registrationId: string) {
  const res = await fetch(`${API_BASE}/voice-registration/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId }),
  })
  if (!res.ok) throw new Error(`completeVoiceRegistration failed: ${res.status}`)
  return res.json()
}

