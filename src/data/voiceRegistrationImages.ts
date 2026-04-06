/** Voice enrollment image prompts. `src` is served from `/public`; swap for API URLs when backend is ready. */
export interface VoiceRegistrationImageItem {
  id: string
  /** Public URL path (Vite: files in `public/`). */
  src: string
  /** Spoken when the user taps the speaker icon (browser TTS). */
  spokenDescription: string
}

export const VOICE_REGISTRATION_IMAGES: VoiceRegistrationImageItem[] = [
  {
    id: 'children-painting',
    src: '/voice-registration/children-painting.png',
    spokenDescription:
      'Five children sit on a carpet near a large window, happily painting colorful pictures together inside a bright living room.',
  },
  {
    id: 'children-dogs-frisbee',
    src: '/voice-registration/children-dogs-frisbee.png',
    spokenDescription:
      'Four children play joyfully with two dogs in a lush green garden, tossing a frisbee under the bright afternoon sun.',
  },
  {
    id: 'mom-son-kitchen',
    src: '/voice-registration/mom-son-kitchen.png',
    spokenDescription:
      'A mother helps her young son cook at the stove, standing on a wooden stool in a bright, modern white kitchen.',
  },
]
