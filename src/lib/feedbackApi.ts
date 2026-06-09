import { httpClient } from './httpClient'

export type Feedback = {
  id: string
  username: string
  email: string
  session_id: string
  device_id: string | null
  description: string
  image_object_key: string
  image_content_type: string
  image_size: number
  created_at: string
  image_url: string
}

export type FeedbackResponse = {
  feedbacks: Feedback[]
  total: number
  skip: number
  limit: number
}

export const feedbackApi = {
  /**
   * Fetch feedback with pagination
   */
  async getFeedback(skip: number = 0, limit: number = 10): Promise<Feedback[]> {
    const response = await httpClient.get<Feedback[]>(
      `/api/feedback?skip=${skip}&limit=${limit}`
    )
    return response
  },
}
