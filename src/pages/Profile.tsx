import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'

export default function Profile() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <MobileContainer gradient={false}>
      <div className="flex h-full min-h-screen flex-col overflow-y-auto bg-[var(--color-surface-app)] px-6 pb-10 pt-6 text-[var(--color-brand-900)] md:h-[var(--device-height)] md:min-h-[var(--device-height)]">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-2 text-base font-medium text-[var(--color-brand-900)]"
        >
          <ArrowLeftIcon className="text-[var(--color-brand-900)]" />
          {t('back')}
        </button>

        <div className="mt-10 rounded-2xl bg-white p-6 text-[var(--color-brand-900)] shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold">{t('profileTitle')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted-2)]">
            {t('profilePlaceholder')}
          </p>
        </div>
      </div>
    </MobileContainer>
  )
}

