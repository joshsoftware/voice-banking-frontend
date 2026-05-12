import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/i18n/LanguageHooks'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'
import { VoiceSheet } from '@/components/home/VoiceSheet'

import {
  disallowVoiceSkip,
  getActiveCustomer,
  getPrimaryAccount,
  isVoiceRegistered,
  markVoiceUnregistered,
} from '@/lib/demoCustomer'
import { httpClient } from '@/lib/httpClient'

interface HomeProps {
  bottomSheet?: ReactNode
  isMuted?: boolean
  onToggleMute?: () => void
}

export default function Home({ bottomSheet, isMuted, onToggleMute }: HomeProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, refreshActiveCustomer } = useAuth()
  const [showVoiceUnregisteredToast, setShowVoiceUnregisteredToast] = useState(false)
  const customer = getActiveCustomer()
  const primaryAccount = customer ? getPrimaryAccount(customer.customer_id) : null
  const voiceRegistered = customer ? isVoiceRegistered(customer.customer_id) : false
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
    try {
      const voiceCustomerId = customer.voice_customer_id ?? customer.customer_id
      await httpClient.delete(`/voiceprint/${encodeURIComponent(voiceCustomerId)}`)
      markVoiceUnregistered(customer.customer_id)
      disallowVoiceSkip(customer.customer_id)
      refreshActiveCustomer()
      setShowVoiceUnregisteredToast(true)
      navigate('/home', { replace: true })
    } catch (e: any) {
      const msg = e.message || 'Failed to unregister voice.'
      window.alert(msg)
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
                onUnregisterVoice={() => void handleUnregisterVoice()}
              />
              <BalanceCard account={primaryAccount} />
            </div>
          </div>

          {/* Bottom Sheet */}
          {bottomSheet ?? <VoiceSheet onStart={() => navigate('/listening')} />}

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
        </div>
      </div>
    </div>
  )
}
