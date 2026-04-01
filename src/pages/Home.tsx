import { ReactNode } from 'react'
import { Header } from '@/components/home/Header'
import { BalanceCard } from '@/components/home/BalanceCard'
import { TransactionList } from '@/components/home/TransactionList'
import { VoiceSheet } from '@/components/home/VoiceSheet'

interface HomeProps {
  onStartListening?: () => void
  bottomSheet?: ReactNode
}

export default function Home({ onStartListening, bottomSheet }: HomeProps) {
  return (
    <div className="min-h-screen bg-[#0b0f14] md:flex md:items-center md:justify-center md:p-4">
      <div className="mx-auto w-full md:max-w-[393px]">
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f5f7fa] md:min-h-[852px] md:rounded-3xl md:shadow-[0px_25px_60px_-20px_rgba(0,0,0,0.45)]">
          {/* Header Section with gradient background */}
          <div
            className="relative h-[346px] w-full rounded-b-2xl px-6 pt-6"
            style={{
              backgroundImage:
                'linear-gradient(129.811deg, rgb(32, 114, 178) 6.5081%, rgb(24, 64, 95) 45.642%, rgb(22, 57, 85) 77.3%)',
            }}
          >
            <Header />
            <BalanceCard />
          </div>

          {/* Transactions Section */}
          <div className="relative pb-48">
            <TransactionList />
          </div>

          {/* Bottom Sheet */}
          {bottomSheet ?? <VoiceSheet onStart={onStartListening} />}
        </div>
      </div>
    </div>
  )
}
