import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-[14px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none'
    
    const variants = {
      primary: 'bg-[#f4f9ff] text-[#1a1f36] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] hover:bg-[#e4e9ef]',
      secondary: 'bg-white/20 text-white border border-white/30 hover:bg-white/30',
      ghost: 'text-[#2072b2] hover:bg-gray-100',
      success: 'bg-gradient-to-b from-[#5f8f40] to-[#1f4f1b] text-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.35)] hover:opacity-90',
    }

    const sizes = {
      sm: 'h-10 px-3 text-sm',
      md: 'h-[52px] px-4 text-base',
      lg: 'h-16 px-6 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
