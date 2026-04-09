import { useCallback, useEffect, useRef, useState } from 'react'
import { PipecatClient } from '@pipecat-ai/client-js'
import { CustomSmallWebRTCTransport } from '@/lib/customTransport'
import { API_BASE } from '@/lib/constants'
import { getActiveCustomer, isVoiceRegistered } from '@/lib/demoCustomer'

// Helper to get client instance (for audio component)
let globalClientInstance: PipecatClient | null = null

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebRTCState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'disconnected'

export interface ChatMessage {
  role: 'status' | 'assistant' | 'user'
  text: string
  ts: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmallWebRTC() {
  const [state, setState] = useState<WebRTCState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const clientRef = useRef<PipecatClient | null>(null)
  const isConnectingRef = useRef(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const activeCustomer = getActiveCustomer()
  const activeCustomerId = activeCustomer?.customer_id ?? null
  const shouldVerifyVoice = activeCustomerId ? isVoiceRegistered(activeCustomerId) : false

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushMsg = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (clientRef.current || isConnectingRef.current) return
    isConnectingRef.current = true

    setState('connecting')
    setMessages([])
    pushMsg('status', 'Connecting…')

    try {
      // Create transport with custom Josh backend negotiations
      const transport = new CustomSmallWebRTCTransport({
        waitForICEGathering: true,
      })

      // Create Pipecat client
      const client = new PipecatClient({
        transport,
        enableMic: true,
        enableCam: false,
      })

      clientRef.current = client
      globalClientInstance = client

      // ── Event Handlers ──────────────────────────────────────────────────────

      client.on('connected', () => {
        console.log('[SmallWebRTC] Connected')
        setState('connected')
      })

      client.on('botReady', () => {
        console.log('[SmallWebRTC] Bot ready')
        setState('listening')
        pushMsg('status', 'Listening…')
      })

      client.on('userStartedSpeaking', () => {
        console.log('[SmallWebRTC] User started speaking')
        setState('processing')
      })

      client.on('userStoppedSpeaking', () => {
        console.log('[SmallWebRTC] User stopped speaking')
        setState('listening')
      })

      client.on('botStartedSpeaking', () => {
        console.log('[SmallWebRTC] Bot started speaking')
        setState('speaking')
      })

      client.on('botStoppedSpeaking', () => {
        console.log('[SmallWebRTC] Bot stopped speaking')
        setState('listening')
      })

      // ── Bot audio playback ────────────────────────────────────────────────
      // trackStarted fires when the remote audio track unmutes. This must be
      // handled HERE (not in a child component) because by the time child
      // components re-render with the new client instance, the event has
      // already fired and is lost.
      client.on('trackStarted', (track: MediaStreamTrack, participant: unknown) => {
        console.log('[SmallWebRTC] trackStarted:', { kind: track.kind, participant })
        // Only play remote (bot) audio tracks. Local mic tracks also fire this
        // event but come with a participant argument — skip those to avoid
        // playing back the user's own voice as a weird echo/artifact.
        if (track.kind !== 'audio' || participant != null) return

        if (!audioElRef.current) {
          audioElRef.current = new Audio()
        }
        const stream = new MediaStream([track])
        audioElRef.current.srcObject = stream
        audioElRef.current.muted = false
        audioElRef.current.volume = 1.0
        audioElRef.current.play().catch(err => {
          console.warn('[SmallWebRTC] Bot audio autoplay blocked:', err.message)
          // Resume on next user interaction
          const resume = () => {
            audioElRef.current?.play().catch(() => {})
            document.removeEventListener('click', resume)
          }
          document.addEventListener('click', resume)
        })
      })

      // Transcript events
      client.on('userTranscript', (data: any) => {
        console.log('[SmallWebRTC] User transcript:', data)
        let text = data.text;
        // Strip out language tags like [en] if present
        if (text && text.startsWith('[')) {
          text = text.replace(/^\[[a-z]{2}\]\s*/i, '');
        }
        if (text && data.final) {
          pushMsg('user', text)
        }
      })

      client.on('botOutput', (data: any) => {
        console.log('[SmallWebRTC] Bot output:', data)
        if (data.text) {
          pushMsg('assistant', data.text)
        }
      })

      client.on('botTranscript', (data: any) => {
        console.log('[SmallWebRTC] Bot transcript:', data)
        const text = typeof data === 'string' ? data : data.text;
        if (text) {
          pushMsg('assistant', text)
        }
      })

      // Error handling
      client.on('error', (error: any) => {
        console.error('[SmallWebRTC] Error:', error)
        setState('error')
        pushMsg('status', `Error: ${error.message || 'Connection failed'}`)
      })

      client.on('disconnected', () => {
        console.log('[SmallWebRTC] Disconnected')
        setState('disconnected')
      })

      // Start bot and connect
      await client.startBotAndConnect({
        endpoint: `${API_BASE}/start`,
        requestData: {
          createDailyRoom: false,
          enableDefaultIceServers: true,
          transport: 'webrtc',
          customer_id: activeCustomerId,
          is_voice_print: shouldVerifyVoice,
        },
        timeout: 30000,
      })

    } catch (err) {
      console.error('[SmallWebRTC] Connect error:', err)
      pushMsg('status', `Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setState('error')
      clientRef.current = null
      globalClientInstance = null
    } finally {
      isConnectingRef.current = false
    }
  }, [activeCustomerId, pushMsg, shouldVerifyVoice])

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (!clientRef.current) return

    console.log('[SmallWebRTC] Disconnecting...')

    try {
      const client = clientRef.current

      // Disable microphone first
      try {
        await client.enableMic(false)
        console.log('[SmallWebRTC] Disabled microphone')
      } catch (micErr) {
        console.error('[SmallWebRTC] Error disabling mic:', micErr)
      }

      // Stop all local tracks
      try {
        const tracks = client.tracks()
        console.log('[SmallWebRTC] Current tracks:', tracks)
        
        if (tracks?.local?.audio) {
          tracks.local.audio.stop()
          console.log('[SmallWebRTC] Stopped local audio track')
        }
        if (tracks?.local?.video) {
          tracks.local.video.stop()
          console.log('[SmallWebRTC] Stopped local video track')
        }
      } catch (trackErr) {
        console.error('[SmallWebRTC] Error stopping tracks:', trackErr)
      }

      // Also try to get media stream directly from transport
      try {
        const transport = client.transport as any
        if (transport?.localStream) {
          transport.localStream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop()
            console.log('[SmallWebRTC] Stopped track from localStream:', track.kind)
          })
        }
      } catch (streamErr) {
        console.error('[SmallWebRTC] Error stopping stream tracks:', streamErr)
      }

      // Stop bot audio element
      if (audioElRef.current) {
        audioElRef.current.pause()
        audioElRef.current.srcObject = null
      }

      // Disconnect the client
      await client.disconnect()
      
      // EXPLICIT: Also search for any dangling media streams in the entire document
      // to handle cases where the SDK might have cloned the stream
      navigator.mediaDevices.enumerateDevices().then(() => {
        // This is a hint to the browser to check media states
        // But the real fix is stopping all tracks we can find
        if ((window as any).localStream) {
          (window as any).localStream.getTracks().forEach((t: any) => t.stop())
        }
      })

      console.log('[SmallWebRTC] Client disconnected')
    } catch (err) {
      console.error('[SmallWebRTC] Disconnect error:', err)
    }

    clientRef.current = null
    globalClientInstance = null
    setState('disconnected')
  }, [])

  // ── Toggle Mute ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(async () => {
    if (!clientRef.current) return

    try {
      const newMutedState = !isMuted
      await clientRef.current.enableMic(!newMutedState)
      setIsMuted(newMutedState)
    } catch (err) {
      console.error('[SmallWebRTC] Toggle mute error:', err)
    }
  }, [isMuted])

  // ── Stop Audio Track ───────────────────────────────────────────────────────────

  const stopAudioTracks = useCallback(() => {
    if (!clientRef.current) return
    console.log('[SmallWebRTC] Stopping all audio input tracks...')

    try {
      // 1. First, tell the SDK to disable the mic
      clientRef.current.enableMic(false);

      // 2. Stop tracks from the client's local tracks collection
      const tracks = clientRef.current.tracks()
      if (tracks?.local?.audio) {
        tracks.local.audio.stop()
        console.log('[SmallWebRTC] Stopped local audio track via client')
      }

      // 3. Stop any remaining tracks on the transport's local stream
      const transport = clientRef.current.transport as any
      
      // Check common Pipecat/Daily property names for local media
      const localStream = transport?.localStream || 
                         transport?._localStream || 
                         transport?.mediaManager?.localStream ||
                         (transport as any)._pc?.getSenders?.().find((s: any) => s.track)?.track;

      if (localStream && typeof localStream.getAudioTracks === 'function') {
        localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
          track.stop()
          console.log('[SmallWebRTC] Stopped audio track from stream:', track.id)
        })
      }

      // 4. Nuclear option: global browser media track search
      // This is often needed if the SDK or Transport created a "hidden" stream
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(t => t.stop());
      }).catch(() => {});
      
    } catch (err) {
      console.error('[SmallWebRTC] Error stopping audio tracks:', err)
    }
  }, [])

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        console.log('[SmallWebRTC] Component unmounting, cleaning up...')
        
        // Stop all tracks
        try {
          const tracks = clientRef.current.tracks()
          tracks?.local?.audio?.stop()
          tracks?.local?.video?.stop()
          
          const transport = clientRef.current.transport as any
          transport?.localStream?.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop()
          })
        } catch (err) {
          console.error('[SmallWebRTC] Cleanup track error:', err)
        }

        clientRef.current.disconnect().catch(console.error)
        clientRef.current = null
        globalClientInstance = null
      }
      if (audioElRef.current) {
        audioElRef.current.pause()
        audioElRef.current.srcObject = null
        audioElRef.current = null
      }
    }
  }, [])

  return {
    state,
    isMuted,
    messages,
    connect,
    disconnect,
    toggleMute,
    stopAudioTracks,
    client: clientRef.current,
  }
}

// Export function to get client for audio component
export function useSmallWebRTCClient() {
  return globalClientInstance
}
