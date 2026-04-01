import { useState } from 'react'
import { EyeIcon } from '@/components/ui/icons'

export function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="relative mx-auto mt-16 w-full max-w-[345px] overflow-hidden rounded-3xl bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] md:mt-20">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute left-0 top-0 flex size-48 items-center justify-center opacity-20">
        <div className="-scale-y-100 -rotate-90">
          <div className="size-12 rounded-full bg-gradient-to-br from-blue-300 to-blue-500" />
        </div>
      </div>

      <div className="pointer-events-none absolute -right-5 top-11 h-48 w-35 opacity-20">
        <div className="size-12 rounded-full bg-gradient-to-br from-blue-300 to-blue-500" />
      </div>

      {/* Card content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm leading-5 text-[rgba(15,52,104,0.8)]">Available Balance</div>
          <button
            type="button"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            onClick={() => setShowBalance(!showBalance)}
            className="rounded p-2 transition-colors hover:bg-gray-100"
          >
            <EyeIcon className="text-[#0f3468]" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <div className="text-4xl font-bold leading-10 text-[#163954]">
            {showBalance ? '₹45,250.75' : '₹••,•••.••'}
          </div>
          <div className="text-sm leading-5 text-[rgba(15,52,104,0.8)]">Savings Account</div>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <div className="text-sm leading-5 text-[rgba(15,52,104,0.7)]">****7890</div>
          <button
            type="button"
            className="rounded-[14px] px-3 py-2 text-sm font-medium leading-5 text-[#0f3468] transition-colors hover:bg-gray-100"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
