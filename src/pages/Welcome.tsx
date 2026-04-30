import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/LanguageHooks'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function Welcome() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { requestOtp, sessionError, clearSessionError } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    // Clear session error when user types or on mount if they want to try again
    if (phone.length > 0) {
      clearSessionError()
    }
  }, [phone, clearSessionError])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (phone.length !== 10) {
      setError(t('welcomeInvalidPhone'))
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await requestOtp(`91${phone}`)
      navigate('/verify-otp', { state: { phone: `91${phone}` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10)
    setPhone(cleaned)
    if (error) setError('')
  }

  return (
    <MobileContainer>
      <div className="relative flex h-full min-h-screen flex-col px-6 pb-10 pt-6 md:min-h-[var(--device-height)]">
        {/* Logo Section */}
        <div className="mx-auto mt-12 md:mt-16">
          <Logo />
        </div>

        {/* Title Section */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-white">
          <h1 className="text-4xl font-bold leading-tight md:text-[36px]">VoiceBank</h1>
          <p className="text-lg leading-7 text-white/90 md:text-[18px]">{t('bankWithYourVoice')}</p>
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-1 flex-col justify-between text-white"
        >
          <div className="space-y-3">
            <label htmlFor="phone" className="block text-sm font-medium leading-5">
              {t('mobileNumber')}
            </label>
            <div className="flex gap-3">
              <div className="flex h-[52px] w-20 items-center justify-center rounded-[14px] border border-white/30 bg-white/20 text-sm font-medium">
                +91
              </div>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="1234567890"
                className="flex-1"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {sessionError && (
              <div className="rounded-lg bg-red-500/20 p-3 text-center text-sm font-medium text-red-200 border border-red-500/30">
                {sessionError}
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="mt-6 space-y-4">
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : t('sendOtp')}
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
