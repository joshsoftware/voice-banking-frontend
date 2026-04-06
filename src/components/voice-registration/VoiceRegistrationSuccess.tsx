import { Button } from '@/components/ui/button'

interface VoiceRegistrationSuccessProps {
  onStartBanking: () => void
}

export function VoiceRegistrationSuccess({ onStartBanking }: VoiceRegistrationSuccessProps) {
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
        Your Secure Voice Banking Starts Now!
      </h2>

      <div className="mx-auto mt-6 w-full max-w-[320px] rounded-2xl bg-white px-4 py-5 shadow-[var(--shadow-card)]">
        <ul className="flex flex-col gap-4 text-[var(--color-brand-900)]">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">🛡</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">Enhanced security</span> for all your transactions
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">⚡</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">Quick access</span> to banking features with voice commands
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm">🎙</span>
            <span className="text-sm leading-snug">
              <span className="font-semibold">Hands-free banking</span> anytime, anywhere
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-auto w-full max-w-[320px] pt-8">
        <Button
          type="button"
          variant="primary"
          className="h-14 w-full rounded-full bg-[var(--color-brand-900)] text-base font-semibold text-white hover:opacity-95"
          onClick={onStartBanking}
        >
          Start Banking
        </Button>
      </div>
    </div>
  )
}
