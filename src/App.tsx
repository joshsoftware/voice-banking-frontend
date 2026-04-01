import './App.css'
import { useState } from 'react'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import OtpVerification from './pages/OtpVerification'
import Listening from './pages/Listening'

type Screen = 'welcome' | 'otp' | 'home' | 'listening'

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')

  if (screen === 'welcome') {
    return (
      <Welcome
        onSendOtp={() => {
          setScreen('otp')
        }}
      />
    )
  }

  if (screen === 'otp') {
    return (
      <OtpVerification
        onBack={() => setScreen('welcome')}
        onVerified={() => setScreen('home')}
      />
    )
  }

  if (screen === 'listening') {
    return <Listening onSubmit={() => setScreen('home')} />
  }

  return <Home onStartListening={() => setScreen('listening')} />
}

export default App
