import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/constants'

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

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
]

// Volume analysis thresholds
const SPEAKING_THRESHOLD = 0.01   // remote bot is "speaking" above this
const SILENCE_DEBOUNCE_MS = 800   // ms of silence before going back to "listening"

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC() {
  const [state, setState] = useState<WebRTCState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Refs (non-reactive)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pcIdRef = useRef<string | null>(null)
  const connectingRef = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushMsg = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now() }])
  }, [])

  const cleanup = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.srcObject = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    sessionIdRef.current = null
    pcIdRef.current = null
    analyserRef.current = null
  }, [])

  const startVolumeWatcher = useCallback(
    (stream: MediaStream) => {
      try {
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(data)
          const avg = data.reduce((s, v) => s + v, 0) / data.length / 255

          if (avg > SPEAKING_THRESHOLD) {
            if (silenceTimerRef.current !== null) {
              clearTimeout(silenceTimerRef.current)
              silenceTimerRef.current = null
            }
            setState(s => (['connected', 'listening', 'processing'].includes(s) ? 'speaking' : s))
          } else {
            if (silenceTimerRef.current === null) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null
                setState(s => (s === 'speaking' ? 'listening' : s))
              }, SILENCE_DEBOUNCE_MS)
            }
          }
          animFrameRef.current = requestAnimationFrame(tick)
        }
        animFrameRef.current = requestAnimationFrame(tick)
      } catch (e) {
        console.warn('WebRTC: Failed to start volume watcher', e)
      }
    },
    []
  )

  // ── negotiate ──────────────────────────────────────────────────────────────

  const negotiate = useCallback(async () => {
    const pc = pcRef.current
    const sid = sessionIdRef.current
    if (!pc || !sid) return

    try {
      console.log('WebRTC: Negotiating (sending offer)...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const offerUrl = `${API_BASE}/sessions/${sid}/api/offer`
      const offerRes = await fetch(offerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription!.sdp,
          type: pc.localDescription!.type,
          pc_id: pcIdRef.current,
          config: { data_channel_enabled: true },
        }),
      })

      if (!offerRes.ok) throw new Error(`Negotiation POST failed: ${offerRes.status}`)

      const answer = await offerRes.json()
      console.log('WebRTC: Negotiation response:', answer)

      if (answer.pc_id || answer.pcId) {
        pcIdRef.current = answer.pc_id || answer.pcId
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (err) {
      console.error('WebRTC negotiation error:', err)
    }
  }, [])

  // ── connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (pcRef.current || connectingRef.current) return
    connectingRef.current = true

    setState('connecting')
    setMessages([])
    pushMsg('status', 'Connecting…')

    try {
      const startRes = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!startRes.ok) throw new Error(`/start failed: ${startRes.status}`)

      const { sessionId, iceConfig } = await startRes.json()
      sessionIdRef.current = sessionId

      const pc = new RTCPeerConnection({
        iceServers: iceConfig?.iceServers?.length ? iceConfig.iceServers : FALLBACK_ICE_SERVERS
      })
      pcRef.current = pc

      // A. Setup local tracks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      // B. Setup Data Channel
      pc.ondatachannel = (ev) => {
        ev.channel.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data)
            console.log('WebRTC DataChannel:', data) // <-- DEBUG LOG
            
            if (data.type === 'transcription') {
              if (data.finalized === false) return
              pushMsg(data.user_id === 'assistant' ? 'assistant' : 'user', data.text)
              setState(data.user_id === 'assistant' ? 'speaking' : 'listening')
            } else if (data.type === 'llm_text') {
              // pushMsg('assistant', data.text) // we might not want llm_text if TTS sends transcription
              // setState('speaking')
            }
          } catch {
            // Ignore non-standard DataChannel payloads / JSON parse failures
          }
        }
      }

      // C. Trickle ICE (Immediate PATCH)
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !pcIdRef.current || !sessionIdRef.current) return
        const offerUrl = `${API_BASE}/sessions/${sessionIdRef.current}/api/offer`
        fetch(offerUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pc_id: pcIdRef.current,
            candidates: [{
              candidate: ev.candidate.candidate,
              sdpMid: ev.candidate.sdpMid,
              sdpMLineIndex: ev.candidate.sdpMLineIndex !== null ? Number(ev.candidate.sdpMLineIndex) : null,
            }]
          })
        }).catch(err => console.warn('ICE Trickle failed:', err))
      }

      // D. Negotiation Needed (Triggers POST offer)
      pc.onnegotiationneeded = () => {
        negotiate()
      }

      // E. Track & State Monitoring
      pc.ontrack = (ev) => {
        const remoteStream = new MediaStream()
        ev.streams[0]?.getTracks().forEach(t => remoteStream.addTrack(t))
        if (!audioElRef.current) {
          audioElRef.current = new Audio()
          audioElRef.current.autoplay = true
        }
        audioElRef.current.srcObject = remoteStream
        startVolumeWatcher(remoteStream)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setState('listening')
          pushMsg('status', 'Listening…')
        } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          setState('disconnected')
          cleanup()
        }
      }

      // Since we added tracks, onnegotiationneeded will fire, but we can also trigger it manually
      // if needed. Most browsers fire it after the first addTrack.

    } catch (err) {
      console.error('WebRTC connect error:', err)
      pushMsg('status', `Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setState('error')
      cleanup()
    } finally {
      connectingRef.current = false
    }
  }, [cleanup, pushMsg, startVolumeWatcher, negotiate])

  // ── Actions ────────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    cleanup()
    setState('disconnected')
  }, [cleanup])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (!audioTrack) return
    audioTrack.enabled = !audioTrack.enabled
    setIsMuted(!audioTrack.enabled)
  }, [])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    state,
    isMuted,
    messages,
    connect,
    disconnect,
    toggleMute,
  }
}
