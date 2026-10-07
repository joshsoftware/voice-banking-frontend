import { httpClient } from './httpClient'

/** Enrollment sessions on file and whether another (follow-up) session can / should be recorded. */
export interface EnrollmentStatus {
  is_registered: boolean
  sessions_completed: number
  max_sessions: number
  first_session_at: string | null
  last_session_at: string | null
  next_eligible_at: string | null
  can_add_session: boolean
  followup_due: boolean
  reason: string | null
}

export function getEnrollmentStatus(voiceCustomerId: string): Promise<EnrollmentStatus> {
  return httpClient.get<EnrollmentStatus>(`/enrollment/status/${encodeURIComponent(voiceCustomerId)}`)
}

/**
 * Voiceprint REST API — aligned with `voice-banking-frontend/src/lib/api.ts`.
 * Backend expects multipart `files` (min 3 clips) at POST .../enrollment/enroll/{user_id}.
 * Note: Updated to usehttpClient for automatic auth headers and updated endpoint paths.
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

    // Documentation mentions /enrollment/* for enrollment endpoints
    return httpClient.post(`/enrollment/enroll/${encodeURIComponent(userId)}`, formData)
  },

  async verify(
    userId: string,
    audioFile: File | Blob,
    isVoicePrint = true
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
    formData.append('is_voice_print', String(isVoicePrint))

    // Documentation mentions /voiceprint/* for verification endpoints
    return httpClient.post<{
      verified: boolean
      score: number
      threshold: number
      cohort_stats: Record<string, unknown>
    }>(`/voiceprint/verify/${encodeURIComponent(userId)}`, formData)
  },

  async healthCheck(): Promise<unknown> {
    return httpClient.get('/voiceprint/health')
  },
}
