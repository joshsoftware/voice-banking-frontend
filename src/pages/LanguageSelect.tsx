import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { LANGUAGES, type LanguageId } from '@/i18n/languages'
import { useLanguage, useTranslation } from '@/i18n/LanguageHooks'


export default function LanguageSelect() {
  const navigate = useNavigate()
  const { setLanguage, language } = useLanguage()
  const { t } = useTranslation()

  const [selected, setSelected] = useState<LanguageId>(language)
  const selectedId = useMemo(() => selected, [selected])

  return (
    <MobileContainer gradient={false}>
      <div className="flex h-full min-h-screen flex-col bg-[var(--color-surface-app)] px-6 pb-10 pt-6 text-[var(--color-brand-900)] md:min-h-[var(--device-height)]">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-2 text-base font-medium text-[var(--color-brand-900)] transition-opacity hover:opacity-80"
          >
            <ArrowLeftIcon className="text-[var(--color-brand-900)]" />
            <span>{t('back')}</span>
          </button>
          <div />
        </div>

        {/* Title */}
        <div className="mx-auto w-full max-w-[360px] pt-8">
          <h1 className="text-center text-2xl font-bold">{t('selectLanguage')}</h1>

          {/* Language grid */}
          <div className="mt-7 grid grid-cols-2 gap-4">
            {LANGUAGES.map((opt) => {
              const isSelected = opt.id === selectedId
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelected(opt.id)
                    setLanguage(opt.id)
                  }}
                  className={[
                    'relative flex h-[86px] flex-col items-center justify-center rounded-2xl border px-4 text-center transition-colors',
                    isSelected
                      ? 'border-[var(--color-brand-500)] bg-[rgba(32,114,178,0.08)]'
                      : 'border-gray-200 bg-white',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <div className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--color-brand-500)] text-white">
                      ✓
                    </div>
                  )}
                  <div className="text-base font-semibold leading-tight">{opt.label}</div>
                  <div className="mt-1 text-[11px] font-medium leading-4 text-gray-500">{opt.subtitle}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom action */}
        <div className="mt-auto pt-10 relative z-10">
          <Button
            type="button"
            variant="primary"
            className="h-16 w-full rounded-full bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-card)] hover:bg-[var(--color-brand-400)] relative z-10"
            onClick={() => navigate('/home')}
          >
            {t('continue')}
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}

