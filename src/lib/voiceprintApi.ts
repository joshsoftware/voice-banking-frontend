import { VOICEPRINT_API_BASE } from '@/lib/constants'

/**
 * Voiceprint REST API — aligned with `voice-banking-frontend/src/lib/api.ts`.
 * Backend expects multipart `files` (min 3 clips) at POST .../enroll/{user_id}.
 */
export const voiceprintApi = {
  async enroll(userId: string, audioFiles: (File | Blob)[]): Promise<unknown> {
    const formData = new FormData()
    audioFiles.forEach((file, i) => {
      const f =
        file instanceof File
          ? file
          : new File([file], `sample_${i + 1}.wav`, { type: 'audio/webm' })
      formData.append('files', f)
    })

    const response = await fetch(`${VOICEPRINT_API_BASE}/enroll/${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Enrollment failed' }))
      const detail = (error as { detail?: string }).detail
      throw new Error(detail || `Enrollment failed (${response.status})`)
    }

    return response.json()
  },

  async verify(
    userId: string,
    audioFile: File | Blob
  ): Promise<{
    verified: boolean
    score: number
    threshold: number
    cohort_stats: Record<string, unknown>
  }> {
    const formData = new FormData()
    const f =
      audioFile instanceof File
        ? audioFile
        : new File([audioFile], 'verify.wav', { type: 'audio/webm' })
    formData.append('file', f)

    const response = await fetch(`${VOICEPRINT_API_BASE}/verify/${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Verification failed' }))
      const detail = (error as { detail?: string }).detail
      throw new Error(detail || `Verification failed (${response.status})`)
    }

    return response.json()
  },

  async healthCheck(): Promise<unknown> {
    const response = await fetch(`${VOICEPRINT_API_BASE}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  },
}
