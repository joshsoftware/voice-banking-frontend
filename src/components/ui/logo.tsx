import { cn } from '@/lib/utils'
import BankIcon from '@/assets/bank.svg?react'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
          <BankIcon className="h-auto text-white" />
    </div>
  )
}
