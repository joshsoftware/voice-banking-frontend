import { LanguageIcon, UserIcon } from '@/components/ui/icons'

export function Header() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="text-xs leading-4 text-white/70">Good Afternoon</div>
        <div className="text-base font-semibold leading-6 text-white">Isha Kulkarni</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open language settings"
          className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <LanguageIcon className="text-white" />
        </button>
        <button
          type="button"
          aria-label="Open profile"
          className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <UserIcon className="text-white" />
        </button>
      </div>
    </div>
  )
}
