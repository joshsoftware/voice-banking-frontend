import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/LanguageHooks'

export default function Welcome() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setError('')
    // TODO: Send OTP API call here
    navigate('/verify-otp', { state: { phone } })
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
          </div>

          {/* Bottom Section */}
          <div className="mt-6 space-y-4">
            <Button type="submit" variant="primary" className="w-full">
              {t('sendOtp')}
            </Button>

            <p className="px-2 text-center text-sm leading-5 text-white/90">
              {t('termsPrefix')}{' '}
              <span className="font-semibold underline decoration-solid [text-decoration-skip-ink:none]">
                {t('termsLink')}
              </span>
            </p>
          </div>
        </form>
      </div>
    </MobileContainer>
  )
}
