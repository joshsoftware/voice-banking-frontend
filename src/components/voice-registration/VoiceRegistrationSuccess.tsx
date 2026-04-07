import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/LanguageHooks'

interface VoiceRegistrationSuccessProps {
  onStartBanking: () => void
  isSubmitting?: boolean
  error?: string | null
}

export function VoiceRegistrationSuccess({
  onStartBanking,
  isSubmitting = false,
  error = null,
}: VoiceRegistrationSuccessProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-1 pt-2">
      <div className="grid size-24 place-items-center rounded-full bg-[var(--color-success-from)] text-white shadow-[var(--shadow-success)]">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-center text-xl font-bold leading-snug text-[var(--color-brand-900)] text-balance">
        {t('voiceRegistrationSuccessTitle')}
      </h2>

      <div className="mx-auto mt-6 w-full max-w-[320px] rounded-2xl bg-white px-4 py-5 shadow-[var(--shadow-card)]">
        <ul className="flex flex-col gap-4 text-[var(--color-brand-900)]">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">🛡</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">{t('voiceRegistrationSuccessSecurityTitle')}</span>{' '}
              {t('voiceRegistrationSuccessSecurityDesc')}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">⚡</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">{t('voiceRegistrationSuccessQuickTitle')}</span>{' '}
              {t('voiceRegistrationSuccessQuickDesc')}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">🎙</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">{t('voiceRegistrationSuccessHandsFreeTitle')}</span>{' '}
              {t('voiceRegistrationSuccessHandsFreeDesc')}
            </span>
          </li>
        </ul>
      </div>

      {error ? (
        <p className="mt-6 max-w-[320px] text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-auto w-full max-w-[320px] pt-8">
        <Button
          type="button"
          variant="primary"
          disabled={isSubmitting}
          className="h-14 w-full rounded-full bg-[var(--color-brand-900)] text-base font-semibold text-white hover:opacity-95 disabled:opacity-60"
          onClick={onStartBanking}
        >
          {isSubmitting ? t('voiceRegistrationSavingProfile') : t('voiceRegistrationStartBanking')}
        </Button>
      </div>
    </div>
  )
}
