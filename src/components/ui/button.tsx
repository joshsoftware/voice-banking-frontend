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
      primary: 'bg-[var(--color-primary-btn)] text-[var(--color-text-dark)] shadow-[var(--shadow-mute)] hover:bg-[var(--color-primary-btn-hover)]',
      secondary: 'bg-white/20 text-white border border-white/30 hover:bg-white/30',
      ghost: 'text-[var(--color-brand-500)] hover:bg-gray-100',
      success: '[background:var(--gradient-success)] text-white shadow-[var(--shadow-success)] hover:opacity-90',
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
