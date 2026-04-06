import { useState } from 'react'
import { EyeIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'

export function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true)
  const { t } = useTranslation()

  return (
    <div className="relative mx-auto mt-10 w-full max-w-[345px] overflow-hidden rounded-[32px] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)] md:mt-12">
      {/* Card content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-1)]">{t('availableBalance')}</div>
          <button
            type="button"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            onClick={() => setShowBalance(!showBalance)}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-50"
          >
            <EyeIcon className="size-5 text-[var(--color-brand-900)]/60" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-1.5">
          <div className="text-[40px] font-bold leading-tight tracking-tight text-[var(--color-brand-900)]">
            {showBalance ? '₹45,250.75' : '₹••,•••.••'}
          </div>
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-2)]">{t('savingsAccount')}</div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-3)]">****7890</div>
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold leading-5 text-[var(--color-brand-300)] transition-colors hover:bg-gray-50"
          >
            {t('viewDetails')}
          </button>
        </div>
      </div>
    </div>
  )
}
