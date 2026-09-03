import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/LanguageHooks'
import { useAuth } from '@/contexts/AuthContext'
import { isCustomerNotFoundError, registerCustomerByPhone, resolveCustomerByPhone } from '@/lib/customerData'
import { useEffect } from 'react'

export default function Welcome() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false)
  const [showNameForm, setShowNameForm] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
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
      await resolveCustomerByPhone(phone)
      await requestOtp(`91${phone}`)
      navigate('/verify-otp', { state: { phone: `91${phone}` } })
    } catch (err) {
      if (isCustomerNotFoundError(err)) {
        setShowRegistrationPrompt(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send OTP')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10)
    setPhone(cleaned)
    if (error) setError('')
  }

  const closeRegistrationFlow = () => {
    setShowRegistrationPrompt(false)
    setShowNameForm(false)
    setRegistrationError('')
    setName('')
  }

  const handleContinueToRegistration = () => {
    setShowNameForm(true)
    setRegistrationError('')
  }

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setRegistrationError('Please enter customer name')
      return
    }

    setRegistrationError('')
    setIsRegistering(true)
    try {
      await registerCustomerByPhone(cleanName, phone)
      await requestOtp(`91${phone}`)
      closeRegistrationFlow()
      navigate('/verify-otp', { state: { phone: `91${phone}` } })
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setIsRegistering(false)
    }
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
                data-testid="welcome-phone-input"
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
            <Button type="submit" data-testid="welcome-send-otp-btn" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : t('sendOtp')}
            </Button>

            <p className="px-2 text-center text-sm leading-5 text-white/90">
              {t('termsPrefix')}{' '}
              <Link
                to="/terms"
                data-testid="welcome-terms-link"
                className="font-semibold underline decoration-solid [text-decoration-skip-ink:none]"
              >
                {t('termsLink')}
              </Link>
            </p>
          </div>
        </form>
      </div>
      {showRegistrationPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white p-5 text-gray-900 shadow-2xl">
            {!showNameForm ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Customer not found</h2>
                <p className="text-sm text-gray-700">
                  This mobile number is not registered. Do you want to create a new customer?
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="h-11 flex-1 border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200" onClick={closeRegistrationFlow}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" className="h-11 flex-1" onClick={handleContinueToRegistration}>
                    Add Customer
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleCreateCustomer}>
                <h2 className="text-lg font-semibold">Create customer</h2>
                <p className="text-sm text-gray-700">Enter name to register this mobile number and continue with OTP.</p>
                <div className="space-y-1">
                  <label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                    Customer name
                  </label>
                  <Input
                    id="customerName"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (registrationError) setRegistrationError('')
                    }}
                    placeholder="Enter full name"
                    className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                    disabled={isRegistering}
                  />
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Mobile number: +91 {phone}
                </div>
                {registrationError && <p className="text-sm text-red-600">{registrationError}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="h-11 flex-1 border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200" onClick={closeRegistrationFlow} disabled={isRegistering}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="h-11 flex-1" disabled={isRegistering}>
                    {isRegistering ? 'Creating...' : 'Create & Send OTP'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
