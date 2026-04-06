import { LanguageIcon, UserIcon, VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/LanguageHooks'

interface HeaderProps {
  name?: string
  isMuted?: boolean
  onToggleMute?: () => void
}

export function Header({ name = 'Isha Kulkarni', isMuted, onToggleMute }: HeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const showMuteButton = typeof isMuted === 'boolean' && Boolean(onToggleMute)

  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="text-xs leading-4 text-white/70">{t('headerGoodAfternoon')}</div>
        <div className="text-base font-semibold leading-6 text-white">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        {showMuteButton ? (
          <button
            type="button"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            onClick={onToggleMute}
            className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            {isMuted ? (
              <VolumeMutedIcon className="text-white" />
            ) : (
              <VolumeIcon className="text-white" />
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Open language settings"
              className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              onClick={() => navigate('/language')}
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
          </>
        )}
      </div>
    </div>
  )
}
