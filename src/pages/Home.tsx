import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'
import { VoiceSheet } from '@/components/home/VoiceSheet'

interface HomeProps {
  bottomSheet?: ReactNode
}

export default function Home({ bottomSheet }: HomeProps) {
  const navigate = useNavigate()
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
              <Header />
              <BalanceCard />
            </div>
          </div>

          {/* Bottom Sheet */}
          {bottomSheet ?? <VoiceSheet onStart={() => navigate('/listening')} />}
        </div>
      </div>
    </div>
  )
}
