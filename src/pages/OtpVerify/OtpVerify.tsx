import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './OtpVerify.css'

type OtpVerifyProps = {
  phoneDigits: string
  onBack: () => void
  onSuccess: () => void
}

function clampDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

export function OtpVerify({ phoneDigits, onBack, onSuccess }: OtpVerifyProps) {
  const baseId = useId()
  const [otp, setOtp] = useState<string[]>(['', '', '', ''])
  const [seconds, setSeconds] = useState(27)
  const [submitted, setSubmitted] = useState(false)

  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (seconds <= 0) return
    const t = window.setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(t)
  }, [seconds])

  const otpValue = useMemo(() => otp.join(''), [otp])
  const canSubmit = otpValue.length === 4

  function focusIndex(idx: number) {
    const el = inputsRef.current[idx]
    if (!el) return
    el.focus()
    el.select()
  }

  function setDigit(idx: number, value: string) {
    const digit = clampDigits(value, 1)
    setOtp((prev) => {
      const next = [...prev]
      next[idx] = digit
      return next
    })
    if (digit && idx < 3) focusIndex(idx + 1)
  }

  function handlePaste(text: string) {
    const digits = clampDigits(text, 4).split('')
    if (digits.length === 0) return
    setOtp((prev) => {
      const next = [...prev]
      for (let i = 0; i < 4; i++) next[i] = digits[i] ?? ''
      return next
    })
    focusIndex(Math.min(digits.length, 4) - 1)
  }

  return (
    <main className="otp" aria-label="OTP verification">
      <div className="otp__frame">
        <header className="otp__header">
          <button className="otp__back" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>

          <div className="otp__hero" aria-hidden="true">
            <div className="otp__heroRing">
              <svg className="otp__heroIcon" viewBox="0 0 160 160" role="presentation" aria-hidden="true">
                <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round">
                  <path d="M38 74c-6 6-6 18 0 24" />
                  <path d="M26 62c-14 14-14 42 0 56" opacity="0.7" />
                </g>
                <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round">
                  <path d="M122 74c6 6 6 18 0 24" />
                  <path d="M134 62c14 14 14 42 0 56" opacity="0.7" />
                </g>
                <g transform="translate(46 44)" fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round">
                  <path d="M34 0 0 16h68L34 0Z" />
                  <path d="M6 18v36M22 18v36M38 18v36M54 18v36" strokeLinecap="round" />
                  <path d="M0 56h68" strokeLinecap="round" />
                  <path d="M10 66h48" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </header>

        <section className="otp__content" aria-label="Enter OTP">
          <div className="otp__titles">
            <h1 className="otp__title">Verify OTP</h1>
            <p className="otp__subtitle">Enter the 4-digit code sent to your mobile</p>
            <p className="otp__subtle">+91 {phoneDigits}</p>
          </div>

          <form
            className="otp__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canSubmit) return
              setSubmitted(true)
              window.setTimeout(() => onSuccess(), 600)
            }}
          >
            <label className="otp__label" htmlFor={`${baseId}-0`}>
              Enter OTP
            </label>
            <div
              className="otp__boxes"
              onPaste={(e) => {
                e.preventDefault()
                handlePaste(e.clipboardData.getData('text'))
              }}
            >
              {otp.map((value, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputsRef.current[idx] = el
                  }}
                  id={`${baseId}-${idx}`}
                  className="otp__box"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  aria-label={`OTP digit ${idx + 1}`}
                  value={value}
                  onChange={(e) => setDigit(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[idx] && idx > 0) focusIndex(idx - 1)
                    if (e.key === 'ArrowLeft' && idx > 0) focusIndex(idx - 1)
                    if (e.key === 'ArrowRight' && idx < 3) focusIndex(idx + 1)
                  }}
                />
              ))}
            </div>

            <button className="otp__button" type="submit" disabled={!canSubmit || submitted}>
              {submitted ? 'Verifying…' : 'Submit'}
            </button>
          </form>

          <div className="otp__resend">
            {seconds > 0 ? (
              <span>Resend OTP in {seconds}s</span>
            ) : (
              <button
                className="otp__resendBtn"
                type="button"
                onClick={() => {
                  setSeconds(27)
                  setOtp(['', '', '', ''])
                  focusIndex(0)
                }}
              >
                Resend OTP
              </button>
            )}
          </div>
        </section>

        <footer className="otp__footer">
          <p className="otp__terms">
            By continuing, you agree to our{' '}
            <a className="otp__termsLink" href="#" onClick={(e) => e.preventDefault()}>
              Terms &amp; Conditions
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}

