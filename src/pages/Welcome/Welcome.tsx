import { useId, useMemo, useState } from 'react'
import './Welcome.css'

type WelcomeProps = {
  onSendOtp: (phoneDigits: string) => void
}

export function Welcome({ onSendOtp }: WelcomeProps) {
  const inputId = useId()
  const [mobile, setMobile] = useState('')

  const digitsOnly = useMemo(() => mobile.replace(/\D/g, ''), [mobile])
  const canSubmit = digitsOnly.length >= 10

  return (
    <main className="welcome" aria-label="Welcome">
      <div className="welcome__frame">
        <header className="welcome__header" aria-hidden="true">
          <div className="welcome__hero">
            <div className="welcome__heroRing">
              <svg
                className="welcome__heroIcon"
                viewBox="0 0 160 160"
                role="presentation"
                aria-hidden="true"
              >
                {/* left sound waves */}
                <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round">
                  <path d="M38 74c-6 6-6 18 0 24" />
                  <path d="M26 62c-14 14-14 42 0 56" opacity="0.7" />
                </g>
                {/* right sound waves */}
                <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round">
                  <path d="M122 74c6 6 6 18 0 24" />
                  <path d="M134 62c14 14 14 42 0 56" opacity="0.7" />
                </g>
                {/* bank icon */}
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

        <section className="welcome__content" aria-label="VoiceBank sign in">
          <div className="welcome__titles">
            <h1 className="welcome__title">VoiceBank</h1>
            <p className="welcome__subtitle">Bank with Your Voice</p>
          </div>

          <form
            className="welcome__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canSubmit) return
              onSendOtp(digitsOnly)
            }}
          >
            <label className="welcome__label" htmlFor={inputId}>
              Mobile Number
            </label>

            <div className="welcome__phoneRow">
              <div className="welcome__country" aria-hidden="true">
                +91
              </div>
              <input
                id={inputId}
                className="welcome__input"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="1234567890"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                aria-label="Mobile number"
              />
            </div>

            <button className="welcome__button" type="submit" disabled={!canSubmit}>
              Send OTP
            </button>
          </form>
        </section>

        <footer className="welcome__footer">
          <p className="welcome__terms">
            By continuing, you agree to our{' '}
            <a className="welcome__termsLink" href="#" onClick={(e) => e.preventDefault()}>
              Terms &amp; Conditions
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}

