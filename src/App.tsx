import './App.css'
import { useState } from 'react'
import { Welcome } from './pages/Welcome/Welcome'
import { OtpVerify } from './pages/OtpVerify/OtpVerify'

function App() {
  const [screen, setScreen] = useState<'welcome' | 'otp' | 'success'>('welcome')
  const [phoneDigits, setPhoneDigits] = useState('')

  if (screen === 'otp') {
    return (
      <OtpVerify
        phoneDigits={phoneDigits}
        onBack={() => setScreen('welcome')}
        onSuccess={() => setScreen('success')}
      />
    )
  }

  if (screen === 'success') {
    return (
      <main
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background:
            'linear-gradient(180deg, #2b6f92 0%, #215d7e 55%, #1b4f70 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420, width: '100%' }}>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 0.2 }}>Success</h1>
          <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.82)' }}>
            OTP verified for <strong>+91 {phoneDigits}</strong>
          </p>
          <button
            style={{
              marginTop: 20,
              height: 46,
              width: '100%',
              borderRadius: 12,
              border: 0,
              background: '#fff',
              color: '#1e4661',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            type="button"
            onClick={() => setScreen('welcome')}
          >
            Go to Welcome
          </button>
        </div>
      </main>
    )
  }

  return (
    <Welcome
      onSendOtp={(digits) => {
        setPhoneDigits(digits)
        setScreen('otp')
      }}
    />
  )
}

export default App
