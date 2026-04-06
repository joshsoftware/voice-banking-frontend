import { useEffect, useRef, useState } from 'react'
import type { PipecatClient } from '@pipecat-ai/client-js'

interface BotAudioProps {
  client: PipecatClient | null
}

/**
 * Component that plays bot audio from the PipecatClient
 * Must be rendered when a WebRTC connection is active
 */
export function BotAudio({ client }: BotAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [hasSetup, setHasSetup] = useState(false)

  useEffect(() => {
    if (!client) {
      console.log('[BotAudio] No client available yet')
      return
    }
    if (!audioRef.current) {
      console.log('[BotAudio] No audio ref')
      return
    }

    console.log('[BotAudio] Component mounted, setting up listeners')

    const setupBotAudio = (track?: MediaStreamTrack) => {
      try {
        // Get the track from parameter or from client.tracks()
        let botAudioTrack = track
        
        if (!botAudioTrack) {
          const tracks = client.tracks()
          console.log('[BotAudio] Checking available tracks:', tracks)
          botAudioTrack = tracks?.bot?.audio
        }

        if (botAudioTrack && audioRef.current) {
          // If we already had a stream with this track, don't redo it
          if (audioRef.current.srcObject instanceof MediaStream) {
            const existingTracks = audioRef.current.srcObject.getAudioTracks();
            if (existingTracks.includes(botAudioTrack)) {
              console.log('[BotAudio] Track already attached to audio element');
              return;
            }
          }

          console.log('[BotAudio] Setting up bot audio track:', botAudioTrack.id)
          const stream = new MediaStream([botAudioTrack])
          audioRef.current.srcObject = stream
          audioRef.current.volume = 1.0
          setHasSetup(true)
          
          // CRITICAL: Ensure the element is unmuted and playing
          audioRef.current.muted = false;
          
          audioRef.current.play().then(() => {
            console.log('[BotAudio] Audio playing successfully')
          }).catch((err) => {
            console.warn('[BotAudio] Autoplay prevented:', err.message)
            // Fallback: simple global click listener to resume
            const resume = () => {
              audioRef.current?.play().catch(() => {});
              document.removeEventListener('click', resume);
            };
            document.addEventListener('click', resume);
          })
        }
      } catch (err) {
        console.error('[BotAudio] Error accessing tracks:', err)
      }
    }

    // Listen for track events
    const handleTrackStarted = (track: MediaStreamTrack, participant: any) => {
      console.log('[BotAudio] Track started event:', { kind: track.kind, participant })
      // Check if this is an audio track from bot (participant could be 'bot', {}, or undefined)
      if (track.kind === 'audio') {
        console.log('[BotAudio] Attempting to setup audio track')
        setupBotAudio(track)
      }
    }

    client.on('trackStarted', handleTrackStarted)

    // Re-setup if hasSetup is false and client state changes
    const handleBotReady = () => {
      console.log('[BotAudio] Bot ready, retrying setup');
      setupBotAudio();
    };
    client.on('botReady', handleBotReady);

    // Also try to setup immediately in case track is already available
    setupBotAudio()

    return () => {
      client.off('trackStarted', handleTrackStarted)
      client.off('botReady', handleBotReady)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.srcObject = null
      }
      setHasSetup(false)
    }
  }, [client, hasSetup])

  return <audio ref={audioRef} autoPlay playsInline />
}
