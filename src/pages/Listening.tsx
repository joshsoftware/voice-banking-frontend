import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Home from './Home'
import { ListeningSheet } from '@/components/home/ListeningSheet'
import { FeedbackModal } from '@/components/home/FeedbackModal'
import { useVoiceSession } from '@/contexts/VoiceSessionContext'
import { BotAudio } from '@/components/BotAudio'
import { getActiveCustomer } from '@/lib/demoCustomer'
import { MicIcon } from '@/components/ui/icons'

export default function Listening() {
  const navigate = useNavigate()
  const {
    state,
    isMuted,
    isMicHeld,
    messages,
    sessionId,
    inputSoundStatus,
    voiceprintStatus,
    otpSignal,
    connect,
    disconnect,
    toggleMute,
    startPushToTalk,
    stopPushToTalk,
    submitOtp,
    client,
  } = useVoiceSession()
  const [showFeedback, setShowFeedback] = useState(false)
  const [soundPopup, setSoundPopup] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const didInitialConnectRef = useRef(false)
  const reconnectInFlightRef = useRef(false)
  const reconnectCountRef = useRef(0)
  const MAX_AUTO_RECONNECTS = 3
  const customer = getActiveCustomer()

  useEffect(() => {
    if (didInitialConnectRef.current) return
    didInitialConnectRef.current = true
    void connect()
  }, [connect])

  // Auto-reconnect with a fresh WebRTC peer on unexpected disconnect (capped).
  useEffect(() => {
    if (state !== 'disconnected') return
    if (reconnectInFlightRef.current) return
    if (reconnectCountRef.current >= MAX_AUTO_RECONNECTS) {
      console.warn('[Listening] Max auto-reconnect attempts reached')
      return
    }
    reconnectInFlightRef.current = true
    reconnectCountRef.current += 1

    const timer = setTimeout(() => {
      void connect().finally(() => {
        reconnectInFlightRef.current = false
      })
    }, 2500)

    return () => {
      clearTimeout(timer)
      reconnectInFlightRef.current = false
    }
  }, [state, connect])

  useEffect(() => {
    if (state === 'connected' || state === 'listening') {
      reconnectCountRef.current = 0
    }
  }, [state])

  // Navigate back only on errors (not on normal disconnect)
  useEffect(() => {
    if (state === 'error') {
      const timer = setTimeout(() => navigate('/welcome', { replace: true }), 2500)
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

  const handleReconnect = async () => {
    // Reconnect to start a new session while keeping chat history
    await connect()
  }

  const handleClose = async () => {
    await disconnect()
    setChatOpen(false)
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
          chatOpen ? (
            <ListeningSheet
              state={state}
              isMuted={isMuted}
              isMicHeld={isMicHeld}
              messages={messages}
              voiceprintStatus={voiceprintStatus}
              otpSignal={otpSignal}
              onToggleMute={toggleMute}
              onPushToTalkStart={startPushToTalk}
              onPushToTalkEnd={stopPushToTalk}
              onSubmitOtp={submitOtp}
              onReconnect={handleReconnect}
              onClose={handleClose}
              onFeedback={() => setShowFeedback(true)}
            />
          ) : (
            <div className="absolute bottom-0 left-0 w-full">
              <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-6 shadow-[var(--shadow-sheet)]">
                <div className="mx-auto flex w-full max-w-[356px] flex-col items-center px-3 pb-2">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      startPushToTalk()
                      setChatOpen(true)
                      const handleUp = () => {
                        stopPushToTalk()
                        document.removeEventListener('pointerup', handleUp)
                        document.removeEventListener('pointercancel', handleUp)
                      }
                      document.addEventListener('pointerup', handleUp)
                      document.addEventListener('pointercancel', handleUp)
                    }}
                    className={`h-16 w-full max-w-[280px] touch-none select-none rounded-full font-semibold shadow-[var(--shadow-voice-btn)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 px-6 ${
                      isMicHeld
                        ? '[background:var(--gradient-mic)] text-white shadow-[var(--shadow-mic)]'
                        : 'bg-[var(--color-surface-card)] text-[var(--color-brand-900)] ring-2 ring-[var(--color-brand-500)]/30'
                    }`}
                  >
                    <MicIcon width="20" height="20" className="shrink-0" />
                    <span>{isMicHeld ? 'Release to send' : 'Hold to speak'}</span>
                  </button>
                </div>
              </div>
            </div>
          )
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
