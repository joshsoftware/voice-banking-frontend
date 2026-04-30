import { LanguageIcon, UserIcon, VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/LanguageHooks'
import { clearActiveCustomer } from '@/lib/demoCustomer'

interface HeaderProps {
  name?: string
  isMuted?: boolean
  onToggleMute?: () => void
  canUnregisterVoice?: boolean
  onUnregisterVoice?: () => void
}

export function Header({
  name = 'Test User',
  isMuted,
  onToggleMute,
  canUnregisterVoice = false,
  onUnregisterVoice,
}: HeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const showMuteButton = typeof isMuted === 'boolean' && Boolean(onToggleMute)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const hour = new Date().getHours()
  const greetingKey =
    hour < 12
      ? 'headerGoodMorning'
      : hour < 17
        ? 'headerGoodAfternoon'
        : hour < 21
          ? 'headerGoodEvening'
          : 'headerGoodNight'

  return (
    <>
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="text-xs leading-4 text-white/70">{t(greetingKey)}</div>
        <div className="text-base font-semibold leading-6 text-white">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        {showMuteButton ? (
          <button
            type="button"
            aria-label={isMuted ? t('ariaUnmute') : t('ariaMute')}
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
          <button
            type="button"
            aria-label={t('ariaOpenLanguageSettings')}
            className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            onClick={() => navigate('/language')}
          >
            <LanguageIcon className="text-white" />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label={t('ariaOpenUserActions')}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <UserIcon className="text-white" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 min-w-52 rounded-xl bg-white py-2 text-[var(--color-brand-900)] shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
              {canUnregisterVoice && onUnregisterVoice ? (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm font-medium text-amber-700 hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false)
                    onUnregisterVoice()
                  }}
                >
                  Unregister voice
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/voice-registration')
                  }}
                >
                  {t('menuRegisterVoice')}
                </button>
              )}
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/profile')
                }}
              >
                {t('menuViewProfile')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false)
                  clearActiveCustomer()
                  navigate('/welcome')
                }}
              >
                {t('menuLogOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>


    </>
  )
}
