import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'
import { VoiceSheet } from '@/components/home/VoiceSheet'
import {
  disallowVoiceSkip,
  getActiveCustomer,
  getPrimaryAccount,
  isVoiceRegistered,
  isVoiceSkipAllowed,
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
  const { isAuthenticated } = useAuth()
  const customer = getActiveCustomer()
  const primaryAccount = customer ? getPrimaryAccount(customer.customer_id) : null
  const voiceRegistered = customer ? isVoiceRegistered(customer.customer_id) : false
  const voiceSkipAllowed = customer ? isVoiceSkipAllowed(customer.customer_id) : false

  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/welcome', { replace: true })
      return
    }
    if (!voiceRegistered && !voiceSkipAllowed) {
      navigate('/voice-registration')
    }
  }, [isAuthenticated, customer, voiceRegistered, voiceSkipAllowed, navigate])

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

  const handleUnregisterVoice = async () => {
    if (!customer) return
    try {
      await httpClient.delete(`/voiceprint/${encodeURIComponent(customer.customer_id)}`)
      markVoiceUnregistered(customer.customer_id)
      disallowVoiceSkip(customer.customer_id)
      navigate('/voice-registration', { replace: true })
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
        </div>
      </div>
    </div>
  )
}
