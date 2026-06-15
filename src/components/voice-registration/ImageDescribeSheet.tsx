import { MicIcon } from '@/components/ui/icons'
import { Waveform } from '@/components/ui/waveform'
import { useTranslation } from '@/i18n/LanguageHooks'

export type ImageDescribeSheetState = 'micIdle' | 'countdown' | 'recording' | 'review'

interface ImageDescribeSheetProps {
  state: ImageDescribeSheetState
  countdown: number
  recordProgress: number
  micActive: boolean
  onTapMic: () => void
  onRerecord: () => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function ImageDescribeSheet({
  state,
  countdown,
  recordProgress,
  micActive,
  onTapMic,
  onRerecord,
  onSubmit,
  isSubmitting = false,
}: ImageDescribeSheetProps) {
  const { t } = useTranslation()

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-4 pb-6 pt-2 shadow-[var(--shadow-sheet)]">
        <div className="mx-auto flex w-full max-w-[356px] flex-col items-center gap-4 px-1">
          <div className="h-0.5 w-10 rounded-full bg-black/35" />

          {state === 'micIdle' && (
            <>
              <div className="w-full rounded-[52px] bg-[var(--color-surface-card)] px-2 py-2 shadow-[var(--shadow-voice-btn)]">
                <button
                  type="button"
                  data-testid="voice-registration-mic-btn"
                  aria-label={t('voiceRegistrationStartSpeaking')}
                  onClick={onTapMic}
                  className="flex h-16 w-full items-center justify-center rounded-full [background:var(--gradient-mic)] shadow-[var(--shadow-mic)] transition-transform active:scale-95"
                >
                  <MicIcon className="text-white" />
                </button>
              </div>
              <p className="text-center text-base font-semibold text-[var(--color-brand-600)]">
                {t('voiceRegistrationTapToStartSpeaking')}
              </p>
            </>
          )}

          {state === 'countdown' && (
            <div className="flex w-full flex-col items-center gap-3 py-2">
              <div className="flex h-16 w-full max-w-[280px] items-center justify-center rounded-full [background:var(--gradient-mic)] px-6 shadow-[var(--shadow-mic)]">
                <span className="text-lg font-bold text-white">
                  {t('voiceRegistrationBeReadyIn')}{' '}
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/20">{countdown}</span>
                </span>
              </div>
            </div>
          )}

          {state === 'recording' && (
            <div className="flex w-full flex-col items-center gap-3 py-1">
              <p className="text-sm font-semibold text-[var(--color-brand-500)]">
                {t('voiceRegistrationRecordingProgress', { percent: Math.min(100, Math.round(recordProgress)) })}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-app)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand-500)] transition-[width] duration-100 ease-linear"
                  style={{ width: `${Math.min(100, recordProgress)}%` }}
                />
              </div>
              <Waveform active={micActive} className="scale-90" />
            </div>
          )}

          {state === 'review' && (
            <div className="flex w-full gap-3 pt-1">
              <button
                type="button"
                data-testid="voice-registration-rerecord-btn"
                disabled={isSubmitting}
                onClick={onRerecord}
                className="h-12 flex-1 rounded-full border-2 border-[var(--color-brand-500)] bg-white text-sm font-semibold text-[var(--color-brand-500)] transition-colors hover:bg-[rgba(32,114,178,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('voiceRegistrationRerecord')}
              </button>
              <button
                type="button"
                data-testid="voice-registration-submit-btn"
                disabled={isSubmitting}
                onClick={onSubmit}
                className="h-12 flex-1 rounded-full bg-[var(--color-success-from)] text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 disabled:bg-[#c8d4e2] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('voiceRegistrationSubmitting')}</span>
                  </>
                ) : (
                  t('voiceRegistrationSubmit')
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
