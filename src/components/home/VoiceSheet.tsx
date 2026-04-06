import { useState } from 'react'
import { MicIcon, VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'

interface VoiceSheetProps {
  onStart?: () => void
}

export function VoiceSheet({ onStart }: VoiceSheetProps) {
  const [muted, setMuted] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-2 shadow-[var(--shadow-sheet)]">
        <div className="mx-auto w-full max-w-[356px] px-3">
          <div className="flex flex-col items-center gap-6 md:gap-[76px]">
            {/* Handle */}
            <div className="h-0.5 w-10 rounded-full bg-black/40" />

            <div className="flex w-full flex-col items-center gap-12 md:gap-[60px]">
              {/* Voice button container */}
              <div className="w-52 rounded-[52px] bg-[var(--color-surface-card)] px-3 py-2 shadow-[var(--shadow-voice-btn)]">
                <button
                  type="button"
                  aria-label="Start voice conversation"
                  onClick={onStart}
                  className="flex h-16 w-full items-center justify-center rounded-full [background:var(--gradient-mic)] shadow-[var(--shadow-mic)] transition-transform hover:scale-105 active:scale-95"
                >
                  <MicIcon className="text-white" />
                </button>
              </div>

              {/* Instructions */}
              <div className="text-center text-lg font-semibold leading-7 text-[var(--color-brand-600)]">
                <div>{t('voiceSheetSayHeyFin')}</div>
                <div>{t('voiceSheetToStartConversation')}</div>
              </div>
            </div>

            {/* Mute button */}
            <div className="flex w-full items-center justify-end gap-2 pb-2">
              <div className="text-center text-[10px] font-medium leading-normal text-[var(--color-brand-600)]/50">
                {muted ? t('tapToUnmute') : t('tapToMute')}
              </div>
              <button
                type="button"
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => setMuted(!muted)}
                className="grid size-10 place-items-center rounded-full bg-[var(--color-surface-app)] shadow-[var(--shadow-mute)] transition-colors hover:bg-gray-200"
              >
                {muted ? (
                  <VolumeMutedIcon className="text-[var(--color-brand-500)]" />
                ) : (
                  <VolumeIcon className="text-[var(--color-brand-500)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
