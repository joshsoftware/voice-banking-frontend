import { useEffect, useState } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import Home from './Home'
import { ListeningSheet } from '@/components/home/ListeningSheet'
import { FeedbackModal } from '@/components/home/FeedbackModal'
import { useSmallWebRTC } from '@/hooks/useSmallWebRTC'
import { BotAudio } from '@/components/BotAudio'
import { getActiveCustomer } from '@/lib/demoCustomer'

export default function Listening() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const {
    state,
    isMuted,
    messages,
    sessionId,
    inputSoundStatus,
    connect,
    disconnect,
    toggleMute,
    stopAudioTracks,
    client,
  } = useSmallWebRTC()
  const [showFeedback, setShowFeedback] = useState(false)
  const [soundPopup, setSoundPopup] = useState<string | null>(null)
  const customer = getActiveCustomer()

  // Auto-connect only on intentional navigation (not browser back/forward)
  useEffect(() => {
    if (navigationType !== 'POP') {
      connect()
    } else {
      navigate('/home', { replace: true })
    }
  }, [connect, navigationType, navigate])

  // Navigate back when session ends or errors
  useEffect(() => {
    if (state === 'disconnected' || state === 'error') {
      const timer = setTimeout(() => navigate('/home'), state === 'error' ? 2500 : 800)
      return () => clearTimeout(timer)
    }
  }, [state, navigate])

  useEffect(() => {
    if (!inputSoundStatus) return
    if (inputSoundStatus === 'voice_detected') {
      setSoundPopup('Voice detected')
    } else {
      setSoundPopup('No sound detected. Please speak louder or check your mic.')
    }
    const timer = window.setTimeout(() => setSoundPopup(null), 2200)
    return () => window.clearTimeout(timer)
  }, [inputSoundStatus])

  const handleStop = async () => {
    stopAudioTracks()
    await disconnect()
    navigate('/home')
  }

  return (
    <div onClick={() => client?.transport?.initDevices()}>
      <BotAudio client={client} />
      {soundPopup ? (
        <div className="pointer-events-none fixed left-1/2 top-[52%] z-[1200] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-brand-900)]/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {soundPopup}
        </div>
      ) : null}
      <Home
        bottomSheet={
          <ListeningSheet
            state={state}
            isMuted={isMuted}
            messages={messages}
            onToggleMute={toggleMute}
            onStop={handleStop}
            onFeedback={() => setShowFeedback(true)}
          />
        }
      />
      {showFeedback && (
        <FeedbackModal
          username={customer?.name ?? ''}
          email={customer?.email ?? ''}
          sessionId={sessionId}
          deviceId={customer?.customer_id ?? ''}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}
