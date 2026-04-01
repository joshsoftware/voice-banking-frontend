import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileContainerProps {
  children: ReactNode
  className?: string
  gradient?: boolean
}

export function MobileContainer({ children, className, gradient = true }: MobileContainerProps) {
  return (
    <div className="min-h-screen bg-[#0b0f14] md:flex md:items-center md:justify-center md:p-4">
      <div className="mx-auto w-full md:max-w-[393px]">
        <div
          className={cn(
            'relative min-h-screen w-full overflow-hidden md:min-h-[852px] md:rounded-[24px] md:shadow-[0px_25px_60px_-20px_rgba(0,0,0,0.45)]',
            gradient &&
              'bg-gradient-to-br from-[#2072b2] via-[#18405f] to-[#163955]',
            className
          )}
        >
          {gradient && (
            <div className="absolute inset-0 opacity-10">
              <div className="h-full w-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,1)_0%,_rgba(0,0,0,0)_60%)]" />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
