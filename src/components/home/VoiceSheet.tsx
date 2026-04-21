import { MicIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'

interface VoiceSheetProps {
  onStart?: () => void
}

export function VoiceSheet({ onStart }: VoiceSheetProps) {
  const { t } = useTranslation()

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-6 shadow-[var(--shadow-sheet)]">
        <div className="mx-auto w-full max-w-[356px] px-3">
          <div className="flex flex-col items-center gap-6 md:gap-[76px]">

            <div className="flex w-full flex-col items-center pb-4">
              {/* Voice button container */}
              <div className="w-64 rounded-[52px] bg-[var(--color-surface-card)] px-4 py-3 shadow-[var(--shadow-voice-btn)]">
                <button
                  type="button"
                  aria-label={t('ariaStartVoiceConversation')}
                  onClick={onStart}
                  className="flex h-16 w-full items-center justify-center rounded-full [background:var(--gradient-mic)] shadow-[var(--shadow-mic)] transition-transform hover:scale-105 active:scale-95"
                >
                  <MicIcon className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
