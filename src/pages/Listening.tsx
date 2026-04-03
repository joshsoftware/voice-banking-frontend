import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Home from './Home'
import { ListeningSheet } from '@/components/home/ListeningSheet'
import { useWebRTC } from '@/hooks/useWebRTC'

export default function Listening() {
  const navigate = useNavigate()
  const { state, isMuted, messages, connect, disconnect, toggleMute } = useWebRTC()

  // Auto-connect on mount
  useEffect(() => {
    connect()
  }, [connect])

  // Navigate back when session ends or errors
  useEffect(() => {
    if (state === 'disconnected' || state === 'error') {
      const timer = setTimeout(() => navigate('/home'), state === 'error' ? 2500 : 800)
      return () => clearTimeout(timer)
    }
  }, [state, navigate])

  const handleStop = () => {
    disconnect()
    navigate('/home')
  }

  return (
    <Home
      bottomSheet={
        <ListeningSheet
          state={state}
          isMuted={isMuted}
          messages={messages}
          onToggleMute={toggleMute}
          onStop={handleStop}
          showMuteControl={false}
        />
      }
      isMuted={isMuted}
      onToggleMute={toggleMute}
    />
  )
}
