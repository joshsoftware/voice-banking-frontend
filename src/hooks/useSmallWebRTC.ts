import { useCallback, useEffect, useRef, useState } from 'react'
import { PipecatClient } from '@pipecat-ai/client-js'
import { CustomSmallWebRTCTransport } from '@/lib/customTransport'
import { API_BASE } from '@/lib/constants'
import { getActiveCustomer, getPrimaryAccount, isVoiceRegistered } from '@/lib/demoCustomer'
import { useLanguage, useTranslation } from '@/i18n/LanguageHooks'

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
  transactions?: TransactionItem[]
}

export type InputSoundStatus = 'voice_detected' | 'no_sound'

export interface VoiceprintStatus {
  verified: boolean
  score: number
  ts: number
}

export interface OTPSignal {
  type: 'OTP_REQUIRED'
  transaction_id: string
  otp_code: string
  expires_in: number
  session_id: string
}

interface TransferSuccessSignal {
  type: 'TRANSFER_SUCCESS'
  transaction_id?: string
  message?: string
}

export interface TransactionItem {
  amount: number
  category?: string
  description: string
  transactionDate: string
  transactionId: string
  type: 'DEBIT' | 'CREDIT' | string
}

const NUMBER_WORDS_TO_VALUE: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
}

const CHAT_HISTORY_KEY_PREFIX = 'voicebank.chatHistory'
const AUTH_SESSION_ID_KEY = 'voicebank.auth_session_id'

function getChatHistoryStorageKey(customerId: string | null, authSessionId: string | null) {
  return `${CHAT_HISTORY_KEY_PREFIX}:${authSessionId ?? 'no-session'}:${customerId ?? 'anonymous'}`
}

function loadChatHistory(customerId: string | null, authSessionId: string | null): ChatMessage[] {
  try {
    const raw = localStorage.getItem(getChatHistoryStorageKey(customerId, authSessionId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (msg): msg is ChatMessage =>
        !!msg &&
        (msg.role === 'status' || msg.role === 'assistant' || msg.role === 'user') &&
        typeof msg.text === 'string' &&
        typeof msg.ts === 'number' &&
        (msg.transactions === undefined || Array.isArray(msg.transactions))
    )
  } catch {
    return []
  }
}

function forceLogoutOnUnauthorized() {
  localStorage.removeItem('voicebank.access_token')
  localStorage.removeItem('voicebank.refresh_token')
  localStorage.removeItem('voicebank.auth_session_id')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CHAT_HISTORY_KEY_PREFIX))
    .forEach((key) => localStorage.removeItem(key))
  window.location.href = '/welcome'
}

function normalizeAssistantMessage(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmallWebRTC() {
  const { language } = useLanguage()
  const [state, setState] = useState<WebRTCState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputSoundStatus, setInputSoundStatus] = useState<InputSoundStatus | null>(null)
  const [voiceprintStatus, setVoiceprintStatus] = useState<VoiceprintStatus | null>(null)
  const [otpSignal, setOtpSignal] = useState<OTPSignal | null>(null)

  const clientRef = useRef<PipecatClient | null>(null)
  const isConnectingRef = useRef(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const llmTextBufferRef = useRef<string>('')
  const lastUserTranscriptRef = useRef<string>('')
  const hasDetectedUserVoiceRef = useRef(false)
  const voiceprintBlockedRef = useRef(false)
  const noSoundTimerRef = useRef<number | null>(null)
  const { language: preferredLanguage } = useTranslation()
  const activeCustomer = getActiveCustomer()
  const activeCustomerId = activeCustomer?.customer_id ?? null
  const activeCustomerName = activeCustomer?.name ?? 'User'

  const primaryAccount = activeCustomerId ? getPrimaryAccount(activeCustomerId) : null
  const authSessionId = localStorage.getItem(AUTH_SESSION_ID_KEY)
  const shouldVerifyVoice = activeCustomerId ? isVoiceRegistered(activeCustomerId) : false
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory(activeCustomerId, authSessionId))

  useEffect(() => {
    setMessages(loadChatHistory(activeCustomerId, authSessionId))
  }, [activeCustomerId, authSessionId])

  useEffect(() => {
    try {
      localStorage.setItem(getChatHistoryStorageKey(activeCustomerId, authSessionId), JSON.stringify(messages))
    } catch {
      // ignore storage write errors
    }
  }, [activeCustomerId, authSessionId, messages])


  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushMsg = useCallback((role: ChatMessage['role'], text: string, transactions?: TransactionItem[]) => {
    const normalizedText = role === 'assistant' ? normalizeAssistantMessage(text) : text
    setMessages(prev => [...prev, { role, text: normalizedText, ts: Date.now(), transactions }])
  }, [])

  const getRequestedTransactionCount = useCallback(() => {
    const text = lastUserTranscriptRef.current.toLowerCase()
    const digitMatch = text.match(/(?:last|recent)?\s*(\d{1,2})\s+transactions?/)
    if (digitMatch) {
      const count = Number(digitMatch[1])
      return Number.isNaN(count) ? 5 : Math.max(1, Math.min(count, 20))
    }

    for (const [word, value] of Object.entries(NUMBER_WORDS_TO_VALUE)) {
      if (new RegExp(`\\b${word}\\b\\s+transactions?`).test(text)) {
        return value
      }
    }

    return 5
  }, [])

  const fetchRecentTransactions = useCallback(async (requestedSize: number): Promise<TransactionItem[]> => {
    if (!primaryAccount?.account_id) return []
    const accessToken = localStorage.getItem('voicebank.access_token')
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 90)

    const response = await fetch(`${API_BASE}/api/transactions/recent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        accountId: primaryAccount.account_id,
        fromDate: fromDate.toISOString().slice(0, 10),
        page: 0,
        size: requestedSize,
      }),
    })

    if (response.status === 401) {
      forceLogoutOnUnauthorized()
      return []
    }
    if (!response.ok) return []

    const data = (await response.json().catch(() => ({}))) as {
      transactionList?: TransactionItem[]
      data?: { transactionList?: TransactionItem[] }
    }
    const list = data.transactionList ?? data.data?.transactionList ?? []
    return Array.isArray(list) ? list.slice(0, requestedSize) : []
  }, [primaryAccount?.account_id])

  const pushAssistantMessage = useCallback(
    async (text: string) => {
      const normalized = normalizeAssistantMessage(text)
      const needsRecentTransactions = /recent\s+transactions?/i.test(normalized)
      if (!needsRecentTransactions) {
        pushMsg('assistant', normalized)
        return
      }

      try {
        const requestedSize = getRequestedTransactionCount()
        const transactions = await fetchRecentTransactions(requestedSize)
        pushMsg('assistant', normalized, transactions.length ? transactions : undefined)
      } catch {
        pushMsg('assistant', normalized)
      }
    },
    [fetchRecentTransactions, getRequestedTransactionCount, pushMsg]
  )

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
    setSessionId(null)
    setInputSoundStatus(null)
    hasDetectedUserVoiceRef.current = false
    clearNoSoundTimer()
    llmTextBufferRef.current = ''

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
        startNoSoundTimer()
      })

      client.on('userStartedSpeaking', () => {
        console.log('[SmallWebRTC] User started speaking')
        if (!hasDetectedUserVoiceRef.current) {
          hasDetectedUserVoiceRef.current = true
          setInputSoundStatus('voice_detected')
        }
        clearNoSoundTimer()
        voiceprintBlockedRef.current = false  // Reset block flag for new turn
        setOtpSignal(null)  // Reset OTP state for new turn
        setState('processing')
      })

      client.on('userStoppedSpeaking', () => {
        console.log('[SmallWebRTC] User stopped speaking')
        setState('listening')
      })

      client.on('botStartedSpeaking', () => {
        console.log('[SmallWebRTC] Bot started speaking')
        if (!voiceprintBlockedRef.current) {
          llmTextBufferRef.current = ''
        }
        setState('speaking')
      })

      client.on('botStoppedSpeaking', () => {
        console.log('[SmallWebRTC] Bot stopped speaking')
        if (voiceprintBlockedRef.current) {
          // Verification failed — discard any bot text for this turn
          llmTextBufferRef.current = ''
          setState('listening')
          return
        }
        // Flush any remaining buffer not yet flushed by botLlmStopped
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          void pushAssistantMessage(accumulated)
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
            audioElRef.current?.play().catch(() => { })
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
          lastUserTranscriptRef.current = text
          pushMsg('user', text)
        }
      })

      // botLlmText fires per streaming token — accumulate into buffer
      client.on('botLlmText', (data: any) => {
        if (voiceprintBlockedRef.current) return  // Suppress text when verification failed
        const token = typeof data === 'string' ? data : (data?.text ?? '')
        console.log('[SmallWebRTC] Bot LLM text token:', token)
        llmTextBufferRef.current += token
      })

      // botLlmStopped fires when the LLM finishes streaming — flush buffer immediately
      client.on('botLlmStopped', () => {
        console.log('[SmallWebRTC] Bot LLM stopped, flushing buffer')
        if (voiceprintBlockedRef.current) {
          llmTextBufferRef.current = ''
          return  // Don't flush — verification failed
        }
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          void pushAssistantMessage(accumulated)
          llmTextBufferRef.current = ''
        }
      })

      // botTtsText carries the full TTS sentence — use as fallback if no LLM tokens came in
      client.on('botTtsText', (data: any) => {
        console.log('[SmallWebRTC] Bot TTS text:', data)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (llmTextBufferRef.current) return // already handled via botLlmText
        const text = typeof data === 'string' ? data : data?.text
        if (text) void pushAssistantMessage(text)
      })

      // botTranscript — final fallback for older backends
      client.on('botTranscript', (data: any) => {
        console.log('[SmallWebRTC] Bot transcript:', data)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (llmTextBufferRef.current) return // already handled via botLlmText
        const text = typeof data === 'string' ? data : data?.text
        if (text) void pushAssistantMessage(text)
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

      // Voiceprint verification status from backend
      client.on('serverMessage', (data: any) => {
        console.log('[SmallWebRTC] Server message:', data)
        if (data?.type === 'voiceprint_verification') {
          const verified = !!data.verified
          const score = typeof data.score === 'number' ? data.score : 0
          console.log(`[SmallWebRTC] Voiceprint verification: verified=${verified}, score=${score}`)
          setVoiceprintStatus({ verified, score, ts: Date.now() })

          if (!verified) {
            // Voice verification failed — block ALL bot text for this turn.
            // The flag suppresses botLlmText/botLlmStopped/botStoppedSpeaking
            // so neither the originally-streamed balance text nor the backend's
            // replacement text will appear.  We push our own error message.
            voiceprintBlockedRef.current = true
            llmTextBufferRef.current = ''
            // Remove any assistant messages already flushed during this turn
            setMessages(prev => {
              const cutoff = Date.now() - 5000
              return prev.filter(m => !(m.role === 'assistant' && m.ts >= cutoff))
            })
            // Push a single authoritative error message
            pushMsg('assistant', 'Not authorised or Voice print not matched')
          }
        } else if (data?.type === 'OTP_REQUIRED') {
          console.log('[SmallWebRTC] OTP Required:', data)
          setOtpSignal({
            type: 'OTP_REQUIRED',
            transaction_id: data.transaction_id,
            otp_code: data.otp_code,
            expires_in: data.expires_in,
            session_id: data.session_id
          })
        } else if (data?.type === 'TRANSFER_SUCCESS') {
          const signal = data as TransferSuccessSignal
          console.log('[SmallWebRTC] Transfer success:', signal)
          // Transfer completed: close OTP panel and show outcome in chat stream.
          setOtpSignal(null)
          const successText = signal.message?.trim()
            || 'Transfer successful. The amount has been debited from your account.'
          pushMsg('assistant', successText)
        }
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
            customer_id: activeCustomer?.voice_customer_id ?? activeCustomerId,
            base_customer_id: activeCustomer?.base_customer_id ?? activeCustomerId,
            voiceprint_id: activeCustomer?.voice_customer_id ?? activeCustomerId,
            is_voice_print: shouldVerifyVoice,
            user_name: activeCustomerName,
            timezone: userTimezone,
            language: preferredLanguage,
            cust_name: activeCustomer?.name ?? '',
            lang: language,
          },
        }),
      })
      if (startRes.status === 401) {
        forceLogoutOnUnauthorized()
        return
      }
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
  }, [activeCustomer?.voice_customer_id, activeCustomerId, clearNoSoundTimer, pushAssistantMessage, pushMsg, shouldVerifyVoice, startNoSoundTimer])

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

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted

    // Mute/unmute the bot's audio output element only.
    // The mic and WebRTC connection stay active so the bot can still hear and process.
    if (audioElRef.current) {
      audioElRef.current.muted = newMutedState
    }

    setIsMuted(newMutedState)
  }, [isMuted])

  // ── Submit OTP ─────────────────────────────────────────────────────────────

  const submitOtp = useCallback(async (code: string) => {
    if (!sessionId) return { status: 'error', message: 'No active session' }

    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          otp_code: code
        })
      })
      const data = await response.json()
      const transferSucceeded = data?.status === 'success' || data?.transfer_ok === true
      if (transferSucceeded) {
        setOtpSignal(null) // Close OTP box immediately after successful transfer
      }
      return data
    } catch (err) {
      console.error('[SmallWebRTC] OTP verification error:', err)
      return { status: 'error', message: 'Verification failed' }
    }
  }, [sessionId])

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
    voiceprintStatus,
    otpSignal,
    connect,
    disconnect,
    toggleMute,
    submitOtp,
    stopAudioTracks,
    client: clientRef.current,
  }
}

// Export function to get client for audio component
export function useSmallWebRTCClient() {
  return globalClientInstance
}
