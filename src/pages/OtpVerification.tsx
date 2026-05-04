import { useState, type FormEvent, type KeyboardEvent, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'
import { useAuth } from '@/contexts/AuthContext'

export default function OtpVerification() {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(27)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login } = useAuth()
  const phone = (location.state as { phone?: string } | null)?.phone ?? ''

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = cleaned
    setOtp(newOtp)
    if (error) setError('')

    // Auto-focus next input
    if (cleaned && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4)
    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, 3)]?.focus()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length < 4) {
      setError(t('otpEnterAllDigits'))
      return
    }
    
    setIsLoading(true)
    setError('')
    try {
      const response = await login(phone, otpString)

      // New user or user who hasn't chosen a language yet → language selection
      if (response.is_new_user || !response.preferred_language) {
        navigate('/language', { replace: true })
      } else if (response.is_voiceprint_registered) {
        navigate('/home', { replace: true })
      } else {
        navigate('/voice-registration', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <MobileContainer>
      <div className="relative flex h-full min-h-screen flex-col px-6 pb-10 pt-6 text-white md:min-h-[var(--device-height)]">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="inline-flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-80"
        >
          <ArrowLeftIcon className="text-white" />
          <span>{t('back')}</span>
        </button>

        {/* Logo Section */}
        <div className="mx-auto mt-8">
          <Logo />
        </div>

        {/* Title Section */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-bold leading-9 md:text-[30px]">{t('verifyOtp')}</h1>
          <p className="text-base leading-6 text-white/90 md:text-[16px]">
            {t('enterOtpInstruction')}
          </p>

        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-1 flex-col items-center justify-between"
        >
          <div className="w-full space-y-4">
            <p className="text-center text-sm font-medium leading-5">{t('enterOtpLabel')}</p>
            <div className="flex justify-center gap-3 md:gap-4" onPaste={handlePaste}>
              {otp.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-14 w-14 rounded-[14px] border border-white/30 bg-white/20 text-center text-2xl font-semibold tracking-[0.2em] text-white outline-none transition-colors focus:border-white/50 md:h-16 md:w-16"
                  aria-label={t('otpDigitAria', { index: index + 1 })}
                />
              ))}
            </div>
            {error && <p className="text-center text-sm text-red-300">{error}</p>}
            {/* TODO: Temporarily disabled Resend OTP logic
            <div className="mt-2 text-center text-sm leading-5 text-white/90">
              {timer > 0 && (
                <span>
                  {t('resendOtpIn', { seconds: timer })}
                </span>
              )}
            </div>
            */}
          </div>

          {/* Bottom Section */}
          <div className="w-full space-y-3">
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verifying...' : t('continue')}
            </Button>
            <p className="px-2 text-center text-sm leading-5 text-white/90">
              {t('termsPrefix')}{' '}
              <Link
                to="/terms"
                className="font-semibold underline decoration-solid [text-decoration-skip-ink:none]"
              >
                {t('termsLink')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </MobileContainer>
  )
}
