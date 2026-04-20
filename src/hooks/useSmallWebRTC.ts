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

export type InputSoundStatus = 'voice_detected' | 'no_sound'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmallWebRTC() {
  const [state, setState] = useState<WebRTCState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputSoundStatus, setInputSoundStatus] = useState<InputSoundStatus | null>(null)

  const clientRef = useRef<PipecatClient | null>(null)
  const isConnectingRef = useRef(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const llmTextBufferRef = useRef<string>('')
  const hasDetectedUserVoiceRef = useRef(false)
  const noSoundTimerRef = useRef<number | null>(null)
  const activeCustomer = getActiveCustomer()
  const activeCustomerId = activeCustomer?.customer_id ?? null
  const shouldVerifyVoice = activeCustomerId ? isVoiceRegistered(activeCustomerId) : false

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushMsg = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  const clearNoSoundTimer = useCallback(() => {
    if (noSoundTimerRef.current !== null) {
      window.clearTimeout(noSoundTimerRef.current)
      noSoundTimerRef.current = null
    }
  }, [])

  const startNoSoundTimer = useCallback(() => {
    clearNoSoundTimer()
    noSoundTimerRef.current = window.setTimeout(() => {
      if (!hasDetectedUserVoiceRef.current) {
        setInputSoundStatus('no_sound')
      }
    }, 7000)
  }, [clearNoSoundTimer])

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (clientRef.current || isConnectingRef.current) return
    isConnectingRef.current = true

    setState('connecting')
    setMessages([])
    setSessionId(null)
    setInputSoundStatus(null)
    hasDetectedUserVoiceRef.current = false
    clearNoSoundTimer()
    llmTextBufferRef.current = ''
    pushMsg('status', 'Connecting…')

    try {
      // Create transport WITHOUT waitForICEGathering:true – that option adds an
      // icegatheringstatechange listener in the library that calls
      // attemptReconnection() whenever gathering finishes while the ICE
      // connection is still "checking", which (after setRemoteDescription
      // triggers a second gathering round) creates an endless offer loop.
      // Our custom negotiate() already waits for gathering manually.
      const transport = new CustomSmallWebRTCTransport()

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
        startNoSoundTimer()
      })

      client.on('userStartedSpeaking', () => {
        console.log('[SmallWebRTC] User started speaking')
        if (!hasDetectedUserVoiceRef.current) {
          hasDetectedUserVoiceRef.current = true
          setInputSoundStatus('voice_detected')
        }
        clearNoSoundTimer()
        setState('processing')
      })

      client.on('userStoppedSpeaking', () => {
        console.log('[SmallWebRTC] User stopped speaking')
        setState('listening')
      })

      client.on('botStartedSpeaking', () => {
        console.log('[SmallWebRTC] Bot started speaking')
        llmTextBufferRef.current = ''
        setState('speaking')
      })

      client.on('botStoppedSpeaking', () => {
        console.log('[SmallWebRTC] Bot stopped speaking')
        // Flush any remaining buffer not yet flushed by botLlmStopped
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          pushMsg('assistant', accumulated)
          llmTextBufferRef.current = ''
        }
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

      // botLlmText fires per streaming token — accumulate into buffer
      client.on('botLlmText', (data: any) => {
        const token = typeof data === 'string' ? data : (data?.text ?? '')
        console.log('[SmallWebRTC] Bot LLM text token:', token)
        llmTextBufferRef.current += token
      })

      // botLlmStopped fires when the LLM finishes streaming — flush buffer immediately
      client.on('botLlmStopped', () => {
        console.log('[SmallWebRTC] Bot LLM stopped, flushing buffer')
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          pushMsg('assistant', accumulated)
          llmTextBufferRef.current = ''
        }
      })

      // botTtsText carries the full TTS sentence — use as fallback if no LLM tokens came in
      client.on('botTtsText', (data: any) => {
        console.log('[SmallWebRTC] Bot TTS text:', data)
        if (llmTextBufferRef.current) return // already handled via botLlmText
        const text = typeof data === 'string' ? data : data?.text
        if (text) pushMsg('assistant', text)
      })

      // botTranscript — final fallback for older backends
      client.on('botTranscript', (data: any) => {
        console.log('[SmallWebRTC] Bot transcript:', data)
        if (llmTextBufferRef.current) return // already handled via botLlmText
        const text = typeof data === 'string' ? data : data?.text
        if (text) pushMsg('assistant', text)
      })

      // Error handling
      client.on('error', (error: any) => {
        console.error('[SmallWebRTC] Error:', error)
        setState('error')
        pushMsg('status', `Error: ${error.message || 'Connection failed'}`)
      })

      client.on('disconnected', () => {
        console.log('[SmallWebRTC] Disconnected')
        clearNoSoundTimer()
        setState('disconnected')
      })

      // Attach the JWT access token so that /start and the subsequent
      // /sessions/{id}/api/offer requests reach the protected backend endpoints.
      const accessToken = localStorage.getItem('voicebank.access_token')
      const authHeaders: Record<string, string> = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}

      // Call /start manually to capture sessionId directly from the response
      const startRes = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          body: {
            customer_id: activeCustomerId,
            is_voice_print: shouldVerifyVoice,
          },
        }),
      })
      if (!startRes.ok) {
        throw new Error(`Failed to start session (${startRes.status})`)
      }
      const startData = await startRes.json()
      const sid: string = startData.sessionId ?? startData.session_id ?? null
      if (sid) setSessionId(sid)

      const offerEndpoint = sid
        ? `${API_BASE}/sessions/${sid}/api/offer`
        : `${API_BASE}/start`

      // Connect using the pre-built offer endpoint (skips library's own /start call)
      await client.connect({
        webrtcRequestParams: {
          endpoint: offerEndpoint,
          headers: authHeaders,
        },
        ...(startData.iceConfig ? { iceConfig: startData.iceConfig } : {}),
      } as any)

    } catch (err) {
      console.error('[SmallWebRTC] Connect error:', err)
      clearNoSoundTimer()
      pushMsg('status', `Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setState('error')
      clientRef.current = null
      globalClientInstance = null
    } finally {
      isConnectingRef.current = false
    }
  }, [activeCustomerId, clearNoSoundTimer, pushMsg, shouldVerifyVoice, startNoSoundTimer])

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

    clearNoSoundTimer()
    clientRef.current = null
    globalClientInstance = null
    setState('disconnected')
  }, [clearNoSoundTimer])

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

      const localStream = transport?.localStream ||
                         transport?._localStream ||
                         transport?.mediaManager?.localStream

      if (localStream && typeof localStream.getAudioTracks === 'function') {
        localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
          track.stop()
          console.log('[SmallWebRTC] Stopped audio track from stream:', track.id)
        })
      }

      // 4. Stop via RTCPeerConnection senders (catches any tracks the SDK attached directly)
      const pc = transport?.pc || transport?._pc
      if (pc && typeof pc.getSenders === 'function') {
        pc.getSenders().forEach((sender: RTCRtpSender) => {
          if (sender.track) {
            sender.track.stop()
            console.log('[SmallWebRTC] Stopped sender track:', sender.track.kind)
          }
        })
      }
      
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
      clearNoSoundTimer()
      if (audioElRef.current) {
        audioElRef.current.pause()
        audioElRef.current.srcObject = null
        audioElRef.current = null
      }
    }
  }, [clearNoSoundTimer])

  return {
    state,
    isMuted,
    messages,
    sessionId,
    inputSoundStatus,
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
