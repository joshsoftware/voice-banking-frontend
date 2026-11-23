import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/i18n/LanguageHooks'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'

import {
  allowVoiceSkip,
  getActiveCustomer,
  isVoiceRegistered,
  markVoiceUnregistered,
} from '@/lib/customerData'
import { httpClient } from '@/lib/httpClient'
import { ENABLE_VOICE_FOLLOWUP } from '@/lib/constants'
import { getEnrollmentStatus, type EnrollmentStatus } from '@/lib/voiceprintApi'

// Kept for when VITE_ENABLE_VOICE_FOLLOWUP=true (Improve voice ID / multi-session enrollment).
const FOLLOWUP_DISMISS_KEY_PREFIX = 'voicebank.voiceFollowupPromptDismissed.'
const FOLLOWUP_PATH = '/voice-registration?intent=enroll&mode=followup'

function localDay(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in the device's time zone
}

function formatAvailableFrom(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

interface HomeProps {
  bottomSheet?: ReactNode
  isMuted?: boolean
  onToggleMute?: () => void
}

export default function Home({ bottomSheet, isMuted, onToggleMute }: HomeProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, refreshActiveCustomer, skipVoiceRegistration } = useAuth()
  const [showVoiceUnregisteredToast, setShowVoiceUnregisteredToast] = useState(false)
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false)
  const [isUnregisteringVoice, setIsUnregisteringVoice] = useState(false)
  const customer = getActiveCustomer()
  const voiceRegistered = customer ? isVoiceRegistered(customer.customer_id) : false
  const voiceCustomerId = customer ? (customer.voice_customer_id ?? customer.customer_id) : null
  const [enrollStatus, setEnrollStatus] = useState<EnrollmentStatus | null>(null)
  const [followupDismissedToday, setFollowupDismissedToday] = useState(false)

  useEffect(() => {
    // Follow-up UI is env-gated; leave this block in place for re-enable.
    if (!ENABLE_VOICE_FOLLOWUP || !voiceRegistered || !voiceCustomerId) {
      setEnrollStatus(null)
      return
    }
    let cancelled = false
    getEnrollmentStatus(voiceCustomerId)
      .then((s) => {
        if (!cancelled) setEnrollStatus(s)
      })
      .catch((e) => console.debug('Enrollment status unavailable:', e))
    try {
      setFollowupDismissedToday(localStorage.getItem(FOLLOWUP_DISMISS_KEY_PREFIX + voiceCustomerId) === localDay())
    } catch {
      setFollowupDismissedToday(false)
    }
    return () => {
      cancelled = true
    }
  }, [voiceRegistered, voiceCustomerId])

  const dismissFollowupForToday = () => {
    setFollowupDismissedToday(true)
    try {
      if (voiceCustomerId) localStorage.setItem(FOLLOWUP_DISMISS_KEY_PREFIX + voiceCustomerId, localDay())
    } catch {
      // Storage unavailable: the prompt simply shows again next time.
    }
  }

  // Improve voice ID — only when VITE_ENABLE_VOICE_FOLLOWUP=true
  const improveVoice =
    ENABLE_VOICE_FOLLOWUP &&
    enrollStatus?.is_registered &&
    enrollStatus.sessions_completed < enrollStatus.max_sessions
      ? {
          canStart: enrollStatus.can_add_session,
          availableFrom: enrollStatus.next_eligible_at ? formatAvailableFrom(enrollStatus.next_eligible_at) : null,
        }
      : undefined
  const showFollowupPrompt =
    ENABLE_VOICE_FOLLOWUP && Boolean(enrollStatus?.followup_due) && !followupDismissedToday
  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/welcome', { replace: true })
      return
    }
    // Voice registration is enforced from OTP → /voice-registration on first login, not by bouncing users away from Home after unregister or settings changes.
  }, [isAuthenticated, customer, navigate])

  useEffect(() => {
    if (!isAuthenticated || !customer) return
    window.history.pushState(null, '', window.location.href)
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href)
      navigate('/home', { replace: true })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isAuthenticated, customer, navigate])

  useEffect(() => {
    if (!showVoiceUnregisteredToast) return
    const id = window.setTimeout(() => setShowVoiceUnregisteredToast(false), 3200)
    return () => window.clearTimeout(id)
  }, [showVoiceUnregisteredToast])

  const handleUnregisterVoice = async () => {
    if (!customer) return
    setIsUnregisteringVoice(true)
    try {
      const voiceCustomerId = customer.voice_customer_id ?? customer.customer_id
      await httpClient.delete(`/voiceprint/${encodeURIComponent(voiceCustomerId)}`)
      markVoiceUnregistered(customer.customer_id)
      allowVoiceSkip(customer.customer_id)
      try {
        await skipVoiceRegistration()
      } catch (skipErr) {
        console.error('Failed to persist skip after unregister:', skipErr)
      }
      refreshActiveCustomer()
      setShowUnregisterConfirm(false)
      setShowVoiceUnregisteredToast(true)
    } catch (e: any) {
      const msg = e.message || 'Failed to unregister voice.'
      window.alert(msg)
    } finally {
      setIsUnregisteringVoice(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)] md:flex md:items-center md:justify-center md:p-4">
      <div className="mx-auto w-full md:max-w-[var(--device-width)]">
        <div className="relative min-h-screen w-full overflow-hidden bg-[var(--color-surface-app)] md:min-h-[var(--device-height)] md:rounded-[var(--device-radius)] md:shadow-[var(--shadow-device)]">
          {/* Header Section with gradient background */}
          <div
            className="relative w-full rounded-b-[48px] px-6 pt-6"
            style={{ backgroundImage: 'var(--gradient-brand)' }}
          >
            <div className="relative z-10 pb-5">
              <Header
                name={customer?.name ?? 'Test User'}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                canUnregisterVoice={voiceRegistered}
                onUnregisterVoice={() => setShowUnregisterConfirm(true)}
                improveVoice={improveVoice}
              />
              <BalanceCard customerId={customer?.customer_id} />
              {showFollowupPrompt && (
                <div
                  data-testid="voice-followup-banner"
                  className="mt-4 rounded-2xl bg-white/95 px-4 py-3 text-[var(--color-brand-900)] shadow-[var(--shadow-card)]"
                >
                  <p className="text-sm font-semibold">{t('voiceFollowupBannerTitle')}</p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted-1)]">
                    {t('voiceFollowupBannerBody')}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      data-testid="voice-followup-banner-start"
                      onClick={() => navigate(FOLLOWUP_PATH)}
                      className="h-9 flex-1 rounded-full bg-[var(--color-brand-500)] text-sm font-semibold text-white"
                    >
                      {t('voiceFollowupBannerStart')}
                    </button>
                    <button
                      type="button"
                      data-testid="voice-followup-banner-later"
                      onClick={dismissFollowupForToday}
                      className="h-9 flex-1 rounded-full bg-[var(--color-surface-app)] text-sm font-semibold text-[var(--color-brand-900)]"
                    >
                      {t('voiceFollowupBannerLater')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Sheet */}
          {bottomSheet}

          {showVoiceUnregisteredToast && (
            <div
              className="pointer-events-none fixed inset-0 z-[70] flex items-start justify-center px-6 pt-[28%] md:pt-32"
              role="status"
              aria-live="polite"
            >
              <div className="pointer-events-auto max-w-sm rounded-2xl bg-[var(--color-brand-900)] px-5 py-3.5 text-center text-sm font-medium leading-snug text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                {t('voiceUnregisteredSuccess')}
              </div>
            </div>
          )}

          {showUnregisterConfirm && (
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-voice-confirm-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isUnregisteringVoice) {
                  setShowUnregisterConfirm(false)
                }
              }}
            >
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-amber-50 text-amber-600">
                  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                </div>
                <h2 id="remove-voice-confirm-title" className="text-lg font-bold text-[var(--color-brand-900)]">
                  {t('voiceUnregisterConfirmTitle')}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted-2)]">
                  {t('voiceUnregisterConfirmMessage')}
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    disabled={isUnregisteringVoice}
                    onClick={() => setShowUnregisterConfirm(false)}
                    className="h-12 flex-1 rounded-full bg-[var(--color-surface-app)] text-sm font-semibold text-[var(--color-brand-900)] transition-colors hover:bg-gray-200 disabled:opacity-60"
                  >
                    {t('voiceUnregisterConfirmCancel')}
                  </button>
                  <button
                    type="button"
                    disabled={isUnregisteringVoice}
                    onClick={() => void handleUnregisterVoice()}
                    className="h-12 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {isUnregisteringVoice ? t('voiceUnregisterConfirmRemoving') : t('voiceUnregisterConfirmRemove')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
