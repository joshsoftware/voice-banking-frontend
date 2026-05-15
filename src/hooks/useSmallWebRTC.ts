import { useCallback, useEffect, useRef, useState } from 'react'
import { PipecatClient } from '@pipecat-ai/client-js'
import { CustomSmallWebRTCTransport } from '@/lib/customTransport'
import { API_BASE } from '@/lib/constants'
import { getActiveCustomer, getPrimaryAccount, getPrimaryLoanAccount, isVoiceRegistered } from '@/lib/demoCustomer'
import { getDeviceId } from '@/lib/device'
import { useLanguage } from '@/i18n/LanguageHooks'
import { LANGUAGE_IDS, type LanguageId } from '@/i18n/languages'
import { useAuth } from '@/contexts/AuthContext'

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
  tableTitle?: string
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
        (msg.transactions === undefined || Array.isArray(msg.transactions)) &&
        (msg.tableTitle === undefined || typeof msg.tableTitle === 'string')
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

function isLoanStatementQuery(text: string) {
  const normalized = text.toLowerCase()
  const hasLoanContext = /\bloan\b/.test(normalized)
  if (!hasLoanContext) return false

  const asksForStatementLikeData =
    /\bstatement\b/.test(normalized) ||
    /\btransactions?\b/.test(normalized) ||
    /\bhistory\b/.test(normalized) ||
    /\brecent\b/.test(normalized) ||
    /\blast\b/.test(normalized)

  // "EMI" alone is ambiguous (e.g. "next EMI due date"), so only treat it as
  // a statement request when paired with payment/list verbs.
  const asksForEmiPaymentList =
    /\bemi\b/.test(normalized) &&
    (/\bpayments?\b/.test(normalized) || /\bpaid\b/.test(normalized) || /\btransactions?\b/.test(normalized))

  return (
    asksForStatementLikeData || asksForEmiPaymentList
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmallWebRTC() {
  const { language } = useLanguage()
  const { preferredLanguage: authPreferredLanguage } = useAuth()
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
  const isBackgroundPausedRef = useRef(false)
  const wasMutedBeforeBackgroundRef = useRef(false)
  const pendingBotMessageRef = useRef<{ text: string; transactions?: TransactionItem[]; tableTitle?: string } | null>(null)
  const hasAudioStartedRef = useRef(false)
  const activeCustomer = getActiveCustomer()
  const activeCustomerId = activeCustomer?.customer_id ?? null
  const activeCustomerName = activeCustomer?.name ?? 'User'

  const primaryAccount = activeCustomerId ? getPrimaryAccount(activeCustomerId) : null
  const primaryLoanAccount = activeCustomerId ? getPrimaryLoanAccount(activeCustomerId) : null
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

  const pushMsg = useCallback((
    role: ChatMessage['role'],
    text: string,
    transactions?: TransactionItem[],
    tableTitle?: string
  ) => {
    const normalizedText = role === 'assistant' ? normalizeAssistantMessage(text) : text
    setMessages(prev => [...prev, { role, text: normalizedText, ts: Date.now(), transactions, tableTitle }])
  }, [])

  const getRequestedTransactionCount = useCallback(() => {
    const text = lastUserTranscriptRef.current.toLowerCase()

    if (/\b(?:latest|last|most recent)\s+transaction\b/.test(text)) {
      return 1
    }

    const digitMatch = text.match(/(?:last|recent|latest|most recent)?\s*(\d{1,2})\s+transactions?/)
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

  const fetchLoanTransactions = useCallback(async (): Promise<TransactionItem[]> => {
    if (!primaryLoanAccount?.account_id) return []
    const accessToken = localStorage.getItem('voicebank.access_token')
    const toDate = new Date().toISOString().slice(0, 10)

    const response = await fetch(`${API_BASE}/api/loan_transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        accountId: primaryLoanAccount.account_id,
        fromDate: '2022-01-01',
        toDate,
        page: 0,
        size: 5,
      }),
    })

    if (response.status === 401) {
      forceLogoutOnUnauthorized()
      return []
    }
    if (!response.ok) return []

    const data = (await response.json().catch(() => ({}))) as {
      data?: { loanTransactionList?: Array<{ amount?: number; date?: string; description?: string }> }
      loanTransactionList?: Array<{ amount?: number; date?: string; description?: string }>
    }

    const list = data.data?.loanTransactionList ?? data.loanTransactionList ?? []
    if (!Array.isArray(list)) return []

    return list
      .map((item, index) => ({
        amount: Number(item.amount ?? 0),
        category: 'EMI',
        description: item.description ?? 'EMI Payment',
        transactionDate: item.date ?? '',
        transactionId: `loan-${index}-${item.date ?? 'na'}`,
        type: 'DEBIT',
      }))
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 5)
  }, [primaryLoanAccount?.account_id])

  const bufferAssistantMessage = useCallback(
    async (text: string) => {
      const normalized = normalizeAssistantMessage(text)
      const userIntentText = lastUserTranscriptRef.current || ''
      const needsRecentTransactions =
        /(?:recent|latest|last)\s+transactions?/i.test(normalized) || /(?:recent|latest|last)\s+transactions?/i.test(userIntentText)
      const needsLoanStatement =
        isLoanStatementQuery(normalized) || isLoanStatementQuery(userIntentText)

      // Check if audio/speaking has already started - if so, push immediately
      const shouldPushImmediately = hasAudioStartedRef.current
      console.log('[SmallWebRTC] bufferAssistantMessage - shouldPushImmediately:', shouldPushImmediately)

      if (!needsRecentTransactions && !needsLoanStatement) {
        // Buffer the message instead of pushing immediately
        if (shouldPushImmediately) {
          // Audio already started, push immediately
          console.log('[SmallWebRTC] Pushing message immediately (audio started):', normalized.substring(0, 50))
          pushMsg('assistant', normalized)
        } else {
          // Buffer until audio starts
          console.log('[SmallWebRTC] Buffering message (audio not started yet):', normalized.substring(0, 50))
          pendingBotMessageRef.current = { text: normalized }
        }
        return
      }

      try {
        if (needsLoanStatement) {
          const loanTransactions = await fetchLoanTransactions()
          const messageData = {
            text: normalized,
            transactions: loanTransactions.length ? loanTransactions : undefined,
            tableTitle: 'Loan Statement' as const
          }
          if (shouldPushImmediately) {
            pushMsg('assistant', normalized, messageData.transactions, messageData.tableTitle)
          } else {
            pendingBotMessageRef.current = messageData
          }
          lastUserTranscriptRef.current = ''
          return
        }

        const requestedSize = getRequestedTransactionCount()
        const transactions = await fetchRecentTransactions(requestedSize)
        const messageData = {
          text: normalized,
          transactions: transactions.length ? transactions : undefined,
          tableTitle: 'Recent Transactions' as const
        }
        if (shouldPushImmediately) {
          pushMsg('assistant', normalized, messageData.transactions, messageData.tableTitle)
        } else {
          pendingBotMessageRef.current = messageData
        }
        lastUserTranscriptRef.current = ''
      } catch {
        if (shouldPushImmediately) {
          pushMsg('assistant', normalized)
        } else {
          pendingBotMessageRef.current = { text: normalized }
        }
      }
    },
    [fetchLoanTransactions, fetchRecentTransactions, getRequestedTransactionCount, pushMsg]
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

  // ── Force Terminate Local Media ────────────────────────────────────────────

  const forceTerminateLocalMedia = useCallback(() => {
    const client = clientRef.current
    if (!client) return

    try {
      void client.enableMic(false)
    } catch (micErr) {
      console.error('[SmallWebRTC] Error disabling mic during force terminate:', micErr)
    }

    try {
      const tracks = client.tracks()
      tracks?.local?.audio?.stop()
      tracks?.local?.video?.stop()
    } catch (trackErr) {
      console.error('[SmallWebRTC] Error stopping local tracks during force terminate:', trackErr)
    }

    try {
      const transport = client.transport as any
      const localStream =
        transport?.localStream ||
        transport?._localStream ||
        transport?.mediaManager?.localStream
      if (localStream?.getTracks) {
        localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }

      const pc = transport?.pc || transport?._pc
      if (pc?.getSenders) {
        pc.getSenders().forEach((sender: RTCRtpSender) => sender.track?.stop())
      }
    } catch (streamErr) {
      console.error('[SmallWebRTC] Error stopping transport tracks during force terminate:', streamErr)
    }

    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.srcObject = null
    }
  }, [])

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (isConnectingRef.current) return

    // If a previous client exists, tear it down completely before reconnecting.
    // This handles the case where disconnect() failed or the peer connection
    // was closed externally (e.g. by the OS during app backgrounding).
    if (clientRef.current) {
      console.log('[SmallWebRTC] Cleaning up stale client before reconnect')
      try {
        forceTerminateLocalMedia()
        await clientRef.current.disconnect()
      } catch (err) {
        console.warn('[SmallWebRTC] Error cleaning stale client:', err)
      }
      clientRef.current = null
      globalClientInstance = null
    }
    isConnectingRef.current = true

    setState('connecting')
    setSessionId(null)
    setInputSoundStatus(null)
    lastUserTranscriptRef.current = ''
    hasDetectedUserVoiceRef.current = false
    clearNoSoundTimer()
    llmTextBufferRef.current = ''
    pendingBotMessageRef.current = null
    hasAudioStartedRef.current = false

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
        hasAudioStartedRef.current = false  // Reset audio flag for new turn
        pendingBotMessageRef.current = null  // Clear any pending message
        setState('processing')
      })

      client.on('userStoppedSpeaking', () => {
        console.log('[SmallWebRTC] User stopped speaking')
        setState('listening')
      })

      client.on('botStartedSpeaking', () => {
        console.log('[SmallWebRTC] Bot started speaking')
        // Never clear llmTextBufferRef here: English skips rewriter LLM so TTS can
        // start before botLlmStopped; clearing would drop the buffered welcome text.
        
        // Mark that audio/speaking has started and flush any pending message
        hasAudioStartedRef.current = true
        if (pendingBotMessageRef.current) {
          console.log('[SmallWebRTC] Flushing pending message:', pendingBotMessageRef.current.text.substring(0, 50))
          const { text, transactions, tableTitle } = pendingBotMessageRef.current
          pushMsg('assistant', text, transactions, tableTitle)
          pendingBotMessageRef.current = null
        } else {
          console.log('[SmallWebRTC] No pending message to flush')
        }
        
        setState('speaking')
      })

      client.on('botStoppedSpeaking', () => {
        console.log('[SmallWebRTC] Bot stopped speaking')
        if (voiceprintBlockedRef.current) {
          // Verification failed — discard any bot text for this turn
          llmTextBufferRef.current = ''
          pendingBotMessageRef.current = null
          setState('listening')
          return
        }
        // Flush any remaining buffer not yet flushed by botLlmStopped
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          void bufferAssistantMessage(accumulated)
          llmTextBufferRef.current = ''
        }
        // Reset audio flag for next turn
        hasAudioStartedRef.current = false
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

        // Mark that audio has started for this turn
        hasAudioStartedRef.current = true
        
        // Push any pending bot message now that audio is playing
        if (pendingBotMessageRef.current) {
          const { text, transactions, tableTitle } = pendingBotMessageRef.current
          pushMsg('assistant', text, transactions, tableTitle)
          pendingBotMessageRef.current = null
        }

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
        console.log('[SmallWebRTC] Bot LLM text token:', token, '| hasAudioStarted:', hasAudioStartedRef.current)
        llmTextBufferRef.current += token
      })

      // botLlmStopped fires when the LLM finishes streaming — buffer the message
      client.on('botLlmStopped', () => {
        console.log('[SmallWebRTC] Bot LLM stopped, buffering message')
        if (voiceprintBlockedRef.current) {
          llmTextBufferRef.current = ''
          return  // Don't buffer — verification failed
        }
        const accumulated = llmTextBufferRef.current.trim()
        if (accumulated) {
          console.log('[SmallWebRTC] Buffering accumulated text:', accumulated.substring(0, 50))
          void bufferAssistantMessage(accumulated)
          llmTextBufferRef.current = ''
        }
      })

      // botTtsText carries the full TTS sentence — use as fallback if no LLM tokens came in
      client.on('botTtsText', (data: any) => {
        console.log('[SmallWebRTC] Bot TTS text:', data, '| hasAudioStarted:', hasAudioStartedRef.current)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (llmTextBufferRef.current) {
          console.log('[SmallWebRTC] Skipping botTtsText (llmTextBuffer has content):', llmTextBufferRef.current.substring(0, 30))
          return // already handled via botLlmText
        }
        const text = typeof data === 'string' ? data : data?.text
        console.log('[SmallWebRTC] Processing botTtsText:', text?.substring(0, 50))
        if (text) void bufferAssistantMessage(text)
      })

      // botTranscript — final fallback for older backends
      client.on('botTranscript', (data: any) => {
        console.log('[SmallWebRTC] Bot transcript:', data)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (llmTextBufferRef.current) return // already handled via botLlmText
        const text = typeof data === 'string' ? data : data?.text
        if (text) void bufferAssistantMessage(text)
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
            pendingBotMessageRef.current = null
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

      // Prefer JWT/session-backed preferred_language so /start matches the DB even
      // if LanguageProvider state is one frame behind right after login/navigation.
      const langForVoiceBackend: LanguageId =
        authPreferredLanguage && LANGUAGE_IDS.has(authPreferredLanguage as LanguageId)
          ? (authPreferredLanguage as LanguageId)
          : language

      // Call /start manually to capture sessionId directly from the response
      const startRes = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          body: {
            customer_id: activeCustomerId,
            base_customer_id: activeCustomer?.base_customer_id ?? activeCustomerId,
            voiceprint_id: activeCustomer?.voice_customer_id ?? activeCustomerId,
            is_voice_print: shouldVerifyVoice,
            user_name: activeCustomerName,
            timezone: userTimezone,
            language: langForVoiceBackend,
            cust_name: activeCustomer?.name ?? '',
            lang: langForVoiceBackend,
            mobile_number: activeCustomer?.mobile_number ?? '',
            device_id: getDeviceId(),
            auth_session_id: localStorage.getItem('voicebank.auth_session_id') ?? '',
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
  }, [
    activeCustomer?.base_customer_id,
    activeCustomer?.mobile_number,
    activeCustomer?.name,
    activeCustomer?.voice_customer_id,
    activeCustomerId,
    activeCustomerName,
    authPreferredLanguage,
    clearNoSoundTimer,
    forceTerminateLocalMedia,
    language,
    bufferAssistantMessage,
    pushMsg,
    shouldVerifyVoice,
    startNoSoundTimer,
    userTimezone,
  ])

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    const client = clientRef.current
    if (!client) {
      // Even with no client, reset state flags that may be stale
      isBackgroundPausedRef.current = false
      setState('idle')
      return
    }

    console.log('[SmallWebRTC] Disconnecting...')

    // Null out refs immediately to prevent concurrent disconnect/connect races
    clientRef.current = null
    globalClientInstance = null

    try {
      forceTerminateLocalMedia()
      await client.disconnect()
      console.log('[SmallWebRTC] Client disconnected')
    } catch (err) {
      console.error('[SmallWebRTC] Disconnect error:', err)
    }

    clearNoSoundTimer()
    isBackgroundPausedRef.current = false
    setState('disconnected')
  }, [clearNoSoundTimer, forceTerminateLocalMedia])

  useEffect(() => {
    const pauseSessionForBackground = () => {
      if (!clientRef.current) return
      if (isBackgroundPausedRef.current) return

      console.log('[SmallWebRTC] App moved to background, pausing mic and bot audio')
      isBackgroundPausedRef.current = true
      clearNoSoundTimer()

      try {
        void clientRef.current.enableMic(false)
      } catch (err) {
        console.error('[SmallWebRTC] Failed to pause mic on background:', err)
      }

      if (audioElRef.current) {
        wasMutedBeforeBackgroundRef.current = audioElRef.current.muted
        audioElRef.current.pause()
        // Keep stream attached, only mute playback while in background.
        audioElRef.current.muted = true
      }

      setState('connected')
    }

    const resumeSessionFromBackground = () => {
      if (!clientRef.current) return
      if (!isBackgroundPausedRef.current) return

      // Check if the underlying peer connection is still alive.
      // Mobile browsers frequently close WebRTC connections while backgrounded.
      try {
        const transport = clientRef.current.transport as any
        const pc = transport?.pc || transport?._pc
        if (pc && (pc.connectionState === 'closed' || pc.connectionState === 'failed'
            || pc.signalingState === 'closed')) {
          console.warn('[SmallWebRTC] PeerConnection died while backgrounded, forcing disconnect')
          isBackgroundPausedRef.current = false
          void disconnect()
          return
        }
      } catch (pcCheckErr) {
        console.warn('[SmallWebRTC] Error checking PC state on resume:', pcCheckErr)
      }

      console.log('[SmallWebRTC] App returned to foreground, resuming mic and bot audio')
      isBackgroundPausedRef.current = false

      try {
        void clientRef.current.enableMic(true)
      } catch (err) {
        console.error('[SmallWebRTC] Failed to resume mic on foreground:', err)
      }

      if (audioElRef.current) {
        audioElRef.current.muted = wasMutedBeforeBackgroundRef.current
        if (audioElRef.current.srcObject && !audioElRef.current.muted) {
          audioElRef.current.play().catch((err) => {
            console.warn('[SmallWebRTC] Failed to resume bot audio playback:', err?.message ?? err)
          })
        }
      }

      setState('listening')
      startNoSoundTimer()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseSessionForBackground()
      } else if (document.visibilityState === 'visible') {
        resumeSessionFromBackground()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearNoSoundTimer, disconnect, startNoSoundTimer])

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
        forceTerminateLocalMedia()
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
  }, [clearNoSoundTimer, forceTerminateLocalMedia])

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
