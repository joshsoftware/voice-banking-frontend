import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'
import { DEFAULT_LANGUAGE, LANGUAGES } from '@/i18n/languages'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function Profile() {
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const { logout, user } = useAuth()
  const selectedLanguage = LANGUAGES.find((option) => option.id === (language || DEFAULT_LANGUAGE)) ?? LANGUAGES[0]

  return (
    <MobileContainer gradient={false}>
      <div className="flex h-full min-h-screen flex-col overflow-y-auto mobile-scroll bg-[var(--color-surface-app)] px-6 pb-10 pt-6 text-[var(--color-brand-900)] md:h-[var(--device-height)] md:min-h-[var(--device-height)]">
        <button
          type="button"
          data-testid="profile-back-btn"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-2 text-base font-medium text-[var(--color-brand-900)]"
        >
          <ArrowLeftIcon className="text-[var(--color-brand-900)]" />
          {t('back')}
        </button>

        <div className="mt-10 rounded-2xl bg-white p-6 text-[var(--color-brand-900)] shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold">{t('profileTitle')}</h1>
          {user && (
            <div className="mt-4 space-y-2 border-b pb-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Account Information</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mobile</span>
                <span className="font-medium">+{user.mobile_number}</span>
              </div>
            </div>
          )}
          
          <div className="mt-4 border-b pb-4">
            <button
              type="button"
              onClick={() => navigate('/language')}
              className="w-full flex items-center justify-between gap-4 text-left"
            >
              <span className="font-medium">{t('profileSelectedLanguage')}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--color-brand-900)]">
                  {selectedLanguage.label}
                  {selectedLanguage.subtitle !== selectedLanguage.label ? ` (${selectedLanguage.subtitle})` : ''}
                </span>
                <span className="text-[20px] leading-none text-gray-400">›</span>
              </span>
            </button>
          </div>

          <p className="mt-4 text-sm text-[var(--color-text-muted-2)]">
            {t('profilePlaceholder')}
          </p>
        </div>

        <div className="mt-auto pt-6">
          <Button 
            data-testid="profile-logout-btn"
            variant="primary" 
            className="w-full bg-red-500 hover:bg-red-600 border-none shadow-none"
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}

