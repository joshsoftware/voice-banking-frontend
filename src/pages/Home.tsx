import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'
import { VoiceSheet } from '@/components/home/VoiceSheet'
import {
  getActiveCustomer,
  getPrimaryAccount,
  isVoiceRegistered,
  markVoiceUnregistered,
} from '@/lib/demoCustomer'
import { API_BASE, VOICEPRINT_API_BASE } from '@/lib/constants'

interface HomeProps {
  bottomSheet?: ReactNode
  isMuted?: boolean
  onToggleMute?: () => void
}

export default function Home({ bottomSheet, isMuted, onToggleMute }: HomeProps) {
  const navigate = useNavigate()
  const customer = getActiveCustomer()
  const primaryAccount = customer ? getPrimaryAccount(customer.customer_id) : null
  const voiceRegistered = customer ? isVoiceRegistered(customer.customer_id) : false

  useEffect(() => {
    if (!customer) {
      navigate('/welcome', { replace: true })
      return
    }
    if (!voiceRegistered) {
      navigate('/voice-registration', { replace: true })
    }
  }, [customer, voiceRegistered, navigate])

  const handleUnregisterVoice = async () => {
    if (!customer) return
    const backendBase = (VOICEPRINT_API_BASE || API_BASE).replace(/\/+$/, '')
    const url = `${backendBase}/voiceprint/${encodeURIComponent(customer.customer_id)}`
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = (err as { detail?: string; message?: string }).detail || (err as { message?: string }).message
        throw new Error(detail || `Unregister failed (${res.status})`)
      }
      markVoiceUnregistered(customer.customer_id)
      navigate('/voice-registration', { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to unregister voice.'
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
