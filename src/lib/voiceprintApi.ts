import { httpClient } from './httpClient'

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
