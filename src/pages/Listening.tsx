import { useEffect } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import Home from './Home'
import { ListeningSheet } from '@/components/home/ListeningSheet'
import { useSmallWebRTC } from '@/hooks/useSmallWebRTC'
import { BotAudio } from '@/components/BotAudio'

export default function Listening() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { state, isMuted, messages, connect, disconnect, toggleMute, stopAudioTracks, client } = useSmallWebRTC()

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

  const handleStop = async () => {
    stopAudioTracks()
    await disconnect()
    navigate('/home')
  }

  return (
    <div onClick={() => client?.transport?.initDevices()}>
      <BotAudio client={client} />
      <Home
        bottomSheet={
          <ListeningSheet
            state={state}
            isMuted={isMuted}
            messages={messages}
            onToggleMute={toggleMute}
            onStop={handleStop}
          />
        }
      />
    </div>
  )
}
