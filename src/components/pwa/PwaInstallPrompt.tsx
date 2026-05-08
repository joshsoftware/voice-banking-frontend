import { useEffect, useMemo, useState } from 'react'

const PROMPT_DISMISSED_KEY = 'voicebank.pwa_install_prompt_dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
}

function isIosSafari() {
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIos && isSafari
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showManualSteps, setShowManualSteps] = useState(false)
  const [installUnavailable, setInstallUnavailable] = useState(false)

  const shouldUseIosInstructions = useMemo(() => isIosSafari() && !isStandaloneMode(), [])
  const isManualMode = shouldUseIosInstructions || showManualSteps
  
  useEffect(() => {
    if (isStandaloneMode()) return
    if (localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true') return

    if (shouldUseIosInstructions) {
      setIsVisible(true)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    const fallbackTimer = window.setTimeout(() => {
      // Some browsers never fire beforeinstallprompt; still show guidance popup.
      setIsVisible(true)
    }, 1200)
    return () => {
      window.clearTimeout(fallbackTimer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [shouldUseIosInstructions])

  useEffect(() => {
    const onInstalled = () => {
      setIsVisible(false)
      localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  const handleClose = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
    setIsVisible(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowManualSteps(true)
      setInstallUnavailable(true)
      return
    }

    try {
      setIsInstalling(true)
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
        setIsVisible(false)
      }
      setDeferredPrompt(null)
    } finally {
      setIsInstalling(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--color-text-900)]">Install Voice Banking App</h2>
        {isManualMode ? (
          <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--color-text-muted-2)]">
            {installUnavailable && (
              <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                Native install is not available in this browser session. Follow manual steps below.
              </p>
            )}
            <p>Install manually with these steps:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open your browser menu.</li>
              <li>Tap <span className="font-semibold">Install App</span> or <span className="font-semibold">Add to Home Screen</span>.</li>
              <li>Confirm installation.</li>
            </ol>
            <p>
              On iPhone Safari: tap <span className="font-semibold">Share</span> then{' '}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted-2)]">
            Add Voice Banking to your home screen for a full app-like experience and faster access.
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted-2)] hover:bg-gray-100"
          >
            Not now
          </button>
          {!isManualMode && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={isInstalling}
              className="rounded-lg bg-[var(--color-brand-300)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
