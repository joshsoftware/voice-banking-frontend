import { useCallback, useEffect, useRef, useState } from 'react'
import { PipecatClient } from '@pipecat-ai/client-js'
import { CustomSmallWebRTCTransport } from '@/lib/customTransport'
import { API_BASE } from '@/lib/constants'
import { getActiveCustomer, isVoiceRegistered } from '@/lib/customerData'
import { getDeviceId } from '@/lib/device'
import { useTranslation } from '@/i18n/LanguageHooks'
import { LANGUAGE_IDS, type LanguageId } from '@/i18n/languages'
import { useAuth } from '@/contexts/AuthContext'

// Helper to get client instance (for audio component)
let globalClientInstance: PipecatClient | null = null

// ─── Beep ─────────────────────────────────────────────────────────────────────

/** Resolves once the beep is audibly started (~120 ms). */
function playBeep(): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => window.setTimeout(resolve, 120)
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.02)
      gain.gain.setValueAtTime(0.9, ctx.currentTime + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.1)
      osc.onended = () => ctx.close()
      finish()
    } catch {
      resolve()
    }
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebRTCState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'transcribing'
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
  totalSpent?: number
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

interface TransactionListSignal {
  type: 'TRANSACTION_LIST'
  transactions?: unknown[]
  tableTitle?: string
  totalSpent?: number
}

export interface TransactionItem {
  amount: number
  category?: string
  description: string
  transactionDate: string
  transactionId: string
  type: 'DEBIT' | 'CREDIT' | string
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
        (msg.tableTitle === undefined || typeof msg.tableTitle === 'string') &&
        (msg.totalSpent === undefined || typeof msg.totalSpent === 'number')
    )
  } catch {
    return []
  }
}

// ─── Mute State Storage ────────────────────────────────────────────────────────

const MUTE_STATE_KEY_PREFIX = 'voicebank.isMuted'

function getMuteStorageKey(authSessionId: string | null): string {
  return `${MUTE_STATE_KEY_PREFIX}.${authSessionId ?? 'no-session'}`
}

function loadMuteState(authSessionId: string | null): boolean {
  try {
    const raw = localStorage.getItem(getMuteStorageKey(authSessionId))
    if (raw === null) return false // Default to unmuted for new sessions
    return raw === 'true'
  } catch {
    return false
  }
}

function saveMuteState(authSessionId: string | null, isMuted: boolean): void {
  try {
    localStorage.setItem(getMuteStorageKey(authSessionId), String(isMuted))
  } catch {
    console.warn('[SmallWebRTC] Failed to save mute state to localStorage')
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

function isRecentTransactionsQuery(text: string) {
  const normalized = text.toLowerCase()

  // Unambiguous patterns — match regardless of whether a request verb is present.
  // These are specific enough that no false-positive guard is needed.
  if (/\b(?:recent|latest|last)\s+(?:\d{1,2}\s+)?transactions?\b/.test(normalized)) return true
  if (/\btransaction\s+(?:history|statement|list|details?)\b/.test(normalized)) return true
  if (/\baccount\s+(?:statement|history)\b/.test(normalized)) return true
  if (/\b(?:latest|last|most recent)\s+transaction\b/.test(normalized)) return true
  if (/\b(?:my|all)\s+transactions?\b/.test(normalized)) return true

  // Verb-gated patterns — generic words like "transactions" need a request verb
  // to avoid matching them in unrelated sentences.
  const hasUserRequestVerb =
    /\b(?:show|get|see|check|tell|give|display|want|need|fetch|view|list|find|send|pull)\b/.test(normalized) ||
    /\b(?:what are|what were|what is)\b/.test(normalized)
  if (!hasUserRequestVerb) return false

  return /\b(?:show|get|see|check|tell|list|give|view|fetch|find)\s+(?:me\s+)?(?:my\s+)?(?:all\s+)?(?:the\s+)?(?:recent|latest|last)?\s*transactions?\b/.test(normalized)
}

/** Bot welcome / capability intro — must never trigger structured loan/txn tables. */
function isAssistantWelcomeMessage(text: string) {
  const normalized = text.toLowerCase()
  if (/\bwhat would you like to do today\b/.test(normalized)) return true
  if (/\bvoice banking assistant\b/.test(normalized)) return true
  if (
    /\b(can help you|i can help you)\b/.test(normalized) &&
    /\b(account balance|review transactions|transfer money|loan details)\b/.test(normalized)
  ) {
    return true
  }
  if (
    /\bwelcome\b/.test(normalized) &&
    /\b(speak to me in|you can speak to me)\b/.test(normalized)
  ) {
    return true
  }
  return false
}

/** Backend sometimes returns spoken loan rows as prose — wait for TRANSACTION_LIST signal. */
function isAssistantLoanStatementProse(text: string) {
  const normalized = text.toLowerCase()
  return (
    /\bloan statement for\b/.test(normalized) ||
    (/\bemi payment\b/.test(normalized) && /\brupees paid on\b/.test(normalized))
  )
}

function mapTransactionListSignal(signal: TransactionListSignal): {
  transactions: TransactionItem[]
  tableTitle: string
  totalSpent?: number
} {
  const rawList = Array.isArray(signal.transactions) ? signal.transactions : []
  const transactions: TransactionItem[] = rawList.map((item: any, index) => ({
    amount: Number(item?.amount ?? 0),
    category: item?.category,
    description: item?.description ?? '',
    transactionDate: item?.transactionDate ?? item?.date ?? '',
    transactionId: item?.transactionId ?? `txn-${index}`,
    type: item?.type ?? 'DEBIT',
  }))
  const totalSpent =
    typeof signal.totalSpent === 'number' && Number.isFinite(signal.totalSpent)
      ? signal.totalSpent
      : undefined
  return {
    transactions,
    tableTitle: signal.tableTitle ?? 'Recent Transactions',
    totalSpent,
  }
}

function isAssistantRecentTransactionsProse(text: string) {
  const normalized = text.toLowerCase()
  if (/^total spent on\b/.test(normalized)) return true
  if (/^recent transactions\b/.test(normalized)) return true
  if (/\btransactions?\s+found\b/.test(normalized) && /\d{4}-\d{2}-\d{2}/.test(text)) return true
  // "recent/latest/last transactions … rupees" — original pattern
  if (/\b(?:recent|latest|last)\s+transactions?\b/.test(normalized) && /\brupees\b/.test(normalized)) return true
  // Bot listing transactions as prose: "debited on YYYY-MM-DD" or "credited on YYYY-MM-DD"
  if (/\b(?:debited?|credited?)\s+on\b/.test(normalized) && /\d{4}-\d{2}-\d{2}/.test(text)) return true
  // "1000 on YYYY-MM-DD via Mobile Phone EMI | UPI" — UPI/account specific prose.
  if (/\b\d[\d,]*(?:\.\d+)?\s+on\s+\d{4}-\d{2}-\d{2}\s+via\b/.test(normalized)) return true
  // "Transfer to/from X … on YYYY-MM-DD" — typical multi-row listing format
  if (/\btransfer\s+(?:to|from)\b/.test(normalized) && /\bon \d{4}-\d{2}-\d{2}\b/.test(text)) return true
  return false
}

/** Bot did not answer transaction request yet (fallback/help/repair response). */
function isAssistantNonTransactionalFallback(text: string) {
  const normalized = text.toLowerCase()
  if (/\bsorry[, ]+i didn't understand\b/.test(normalized)) return true
  if (/\bi can help with things like\b/.test(normalized)) return true
  if (/\bwhat would you like to do\b/.test(normalized)) return true
  if (/\bcould you please rephrase\b/.test(normalized)) return true
  return false
}

/** Bot is asking the user to choose (account type, etc.) — do not fetch tables yet. */
function isAssistantClarifyingQuestion(text: string) {
  const normalized = text.toLowerCase()
  if (/\bwhich account\b/.test(normalized)) return true
  if (/\bwould you like to check\b/.test(normalized)) return true
  if (/\bplease (?:choose|select|specify|tell)\b/.test(normalized)) return true
  if (
    /\btransaction(?:s)?\s+history\b/.test(normalized) &&
    /\b(current|savings?)\b/.test(normalized) &&
    (/\bor\b/.test(normalized) || /\band\b/.test(normalized) || /\?/.test(normalized))
  ) {
    return true
  }
  if (/\bwhich\b.*\bwould you like\b/.test(normalized)) return true
  return false
}

function isAccountSelectionReply(text: string) {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return false
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length > 6) return false
  return /\b(savings?|current)\b/.test(normalized)
}

type PendingStructuredIntent = 'transactions' | null

function clearPendingUserIntent(
  pendingUserIntentRef: { current: string },
  lastUserTranscriptRef: { current: string },
  pendingStructuredIntentRef?: { current: PendingStructuredIntent }
) {
  pendingUserIntentRef.current = ''
  lastUserTranscriptRef.current = ''
  if (pendingStructuredIntentRef) {
    pendingStructuredIntentRef.current = null
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmallWebRTC() {
  const { t, language } = useTranslation()
  const { preferredLanguage: authPreferredLanguage, isAuthenticated } = useAuth()
  const [state, setState] = useState<WebRTCState>('idle')
  const authSessionId = localStorage.getItem(AUTH_SESSION_ID_KEY)
  const [isMuted, setIsMuted] = useState(() => loadMuteState(authSessionId))
  const [isMicHeld, setIsMicHeld] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputSoundStatus, setInputSoundStatus] = useState<InputSoundStatus | null>(null)
  const [voiceprintStatus, setVoiceprintStatus] = useState<VoiceprintStatus | null>(null)
  const [otpSignal, setOtpSignal] = useState<OTPSignal | null>(null)

  const clientRef = useRef<PipecatClient | null>(null)
  const isConnectingRef = useRef(false)
  const sessionOfferRetryRef = useRef(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const llmTextBufferRef = useRef<string>('')
  const llmFlushedRef = useRef(false)
  /** True once botLlmText tokens arrive; botTranscript must not push per-chunk. */
  const botTextViaLlmRef = useRef(false)
  const lastUserTranscriptRef = useRef<string>('')
  const pendingUserIntentRef = useRef<string>('')
  const pendingStructuredIntentRef = useRef<PendingStructuredIntent>(null)
  const txnTableHandledThisTurnRef = useRef(false)
  const hasUserSpokenThisSessionRef = useRef(false)
  const hasDetectedUserVoiceRef = useRef(false)
  const voiceprintBlockedRef = useRef(false)
  const noSoundTimerRef = useRef<number | null>(null)
  const isBackgroundPausedRef = useRef(false)
  const wasMutedBeforeBackgroundRef = useRef(false)
  const isMicInputEnabledRef = useRef(false)
  const isBotReadyRef = useRef(false)
  const pendingHoldRequestRef = useRef(false)
  const pendingUserBubbleTextRef = useRef<string>('')
  /** Bumped on each mic release; bot UI events only apply when they match botTurnIdRef. */
  const turnIdRef = useRef(0)
  /** Assistant phase for the current turn; synced on mic release and again when user transcript finalizes. */
  const botTurnIdRef = useRef(0)
  const activeCustomer = getActiveCustomer()
  const activeCustomerId = activeCustomer?.customer_id ?? null
  const activeCustomerName = activeCustomer?.name ?? 'User'

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
    tableTitle?: string,
    totalSpent?: number,
  ) => {
    const normalizedText = role === 'assistant' ? normalizeAssistantMessage(text) : text
    setMessages(prev => [...prev, { role, text: normalizedText, ts: Date.now(), transactions, tableTitle, totalSpent }])
  }, [])

  const applyTransactionListSignal = useCallback((signal: TransactionListSignal) => {
    if (txnTableHandledThisTurnRef.current) return
    const { transactions, tableTitle, totalSpent } = mapTransactionListSignal(signal)
    if (!transactions.length) return
    // Table only in chat — bot audio/TTS continues unchanged.
    pushMsg('assistant', '', transactions, tableTitle, totalSpent)
    txnTableHandledThisTurnRef.current = true
    clearPendingUserIntent(pendingUserIntentRef, lastUserTranscriptRef, pendingStructuredIntentRef)
  }, [pushMsg])

  const pushAssistantMessage = useCallback(
    (text: string) => {
      const normalized = normalizeAssistantMessage(text)
      const userIntentText = (pendingUserIntentRef.current || lastUserTranscriptRef.current || '').trim()

      // Welcome / capability intro: never attach loan or transaction tables.
      if (isAssistantWelcomeMessage(normalized)) {
        clearPendingUserIntent(pendingUserIntentRef, lastUserTranscriptRef, pendingStructuredIntentRef)
        pushMsg('assistant', normalized)
        return
      }

      // Txn table already rendered this turn — skip duplicate plain-text / table bubbles.
      if (txnTableHandledThisTurnRef.current) {
        return
      }

      // Bot is clarifying (e.g. "which account — CURRENT or SAVINGS?") — text only, keep intent for next turn.
      if (isAssistantClarifyingQuestion(normalized)) {
        if (pendingStructuredIntentRef.current === null && userIntentText && isRecentTransactionsQuery(userIntentText)) {
          pendingStructuredIntentRef.current = 'transactions'
        }
        pushMsg('assistant', normalized)
        return
      }

      if (hasUserSpokenThisSessionRef.current && userIntentText) {
        if (isRecentTransactionsQuery(userIntentText)) {
          pendingStructuredIntentRef.current = 'transactions'
        } else if (!isAccountSelectionReply(userIntentText)) {
          pendingStructuredIntentRef.current = null
        }
      }

      const needsLoanStatement = isAssistantLoanStatementProse(normalized)
      const txnFromUserIntent =
        pendingStructuredIntentRef.current === 'transactions' &&
        hasUserSpokenThisSessionRef.current &&
        Boolean(userIntentText) &&
        !needsLoanStatement &&
        (isRecentTransactionsQuery(userIntentText) || isAccountSelectionReply(userIntentText))
      const txnFromAssistantProse = !needsLoanStatement && isAssistantRecentTransactionsProse(normalized)
      const assistantFallback = isAssistantNonTransactionalFallback(normalized)
      // txnFromAssistantProse: if the bot's response clearly contains a transaction list,
      // treat it as structured even when the user's phrase did not match our intent patterns.
      const needsRecentTransactions = !assistantFallback && (txnFromUserIntent || txnFromAssistantProse)
      const needsStructuredTable = needsRecentTransactions || needsLoanStatement

      if (!needsStructuredTable) {
        // Spoken list responses are shown as a formatted table — skip plain-text duplicate.
        if (
          isRecentTransactionsQuery(userIntentText) ||
          isAssistantRecentTransactionsProse(normalized) ||
          isAssistantLoanStatementProse(normalized)
        ) {
          return
        }
        pushMsg('assistant', normalized)
        return
      }

      // List/table UI comes from TRANSACTION_LIST RTVI signal only — swallow spoken list text.
      return
    },
    [pushMsg]
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

  const forceTerminateLocalMedia = useCallback((targetClient?: PipecatClient | null) => {
    const client = targetClient ?? clientRef.current
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
    isConnectingRef.current = true

    if (clientRef.current) {
      const staleClient = clientRef.current
      clientRef.current = null
      globalClientInstance = null
      console.log('[SmallWebRTC] Replacing client for reconnect')
      try {
        forceTerminateLocalMedia(staleClient)
        await staleClient.disconnect()
      } catch (err) {
        console.warn('[SmallWebRTC] Error disconnecting replaced client:', err)
      }
    }

    setState('connecting')
    setSessionId(null)
    setInputSoundStatus(null)
    setVoiceprintStatus(null)
    lastUserTranscriptRef.current = ''
    pendingUserIntentRef.current = ''
    pendingStructuredIntentRef.current = null
    txnTableHandledThisTurnRef.current = false
    hasUserSpokenThisSessionRef.current = false
    hasDetectedUserVoiceRef.current = false
    isMicInputEnabledRef.current = false
    isBotReadyRef.current = false
    pendingHoldRequestRef.current = false
    pendingUserBubbleTextRef.current = ''
    turnIdRef.current = 0
    botTurnIdRef.current = 0
    setIsMicHeld(false)
    clearNoSoundTimer()
    llmTextBufferRef.current = ''
    llmFlushedRef.current = false
    botTextViaLlmRef.current = false

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
        enableMic: false,
        enableCam: false,
      })

      clientRef.current = client
      globalClientInstance = client

      const flushAssistantBubble = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed || llmFlushedRef.current) return
        pushAssistantMessage(trimmed)
        llmTextBufferRef.current = ''
        llmFlushedRef.current = true
      }

      // ── Event Handlers ──────────────────────────────────────────────────────

      client.on('connected', () => {
        console.log('[SmallWebRTC] Connected — muting mic until hold-to-speak')
        isMicInputEnabledRef.current = false
        try {
          void client.enableMic(false)
          const tracks = client.tracks()
          if (tracks?.local?.audio) tracks.local.audio.enabled = false
        } catch (err) {
          console.error('[SmallWebRTC] Failed to mute mic on connected:', err)
        }
        setState('connected')
      })

      client.on('botReady', () => {
        console.log('[SmallWebRTC] Bot ready — mic muted until hold-to-speak')
        isBotReadyRef.current = true
        isMicInputEnabledRef.current = false
        setIsMicHeld(false)
        try {
          void client.enableMic(false)
        } catch (err) {
          console.error('[SmallWebRTC] Failed to mute mic on bot ready:', err)
        }
        setState('listening')

        if (pendingHoldRequestRef.current) {
          console.log('[SmallWebRTC] Executing pending Hold & Speak request now that bot is ready')
          pendingHoldRequestRef.current = false
          setMicrophoneCapture(true)
        }
      })

      client.on('userStartedSpeaking', () => {
        if (!isMicInputEnabledRef.current) {
          console.log('[SmallWebRTC] Ignoring userStartedSpeaking — mic not held (hold-to-speak inactive)')
          return
        }
        console.log('[SmallWebRTC] User started speaking')
        if (!hasDetectedUserVoiceRef.current) {
          hasDetectedUserVoiceRef.current = true
          setInputSoundStatus('voice_detected')
        }
        clearNoSoundTimer()
        voiceprintBlockedRef.current = false  // Reset block flag for new turn
        llmTextBufferRef.current = ''  // Drop stale assistant text from previous turn
        llmFlushedRef.current = false  // Reset flush flag for new turn
        botTextViaLlmRef.current = false
        txnTableHandledThisTurnRef.current = false
        setOtpSignal(null)  // Reset OTP state for new turn
        // Stay in listening while holding — typing bubble only after release (transcribing)
      })

      client.on('userStoppedSpeaking', () => {
        if (!isMicInputEnabledRef.current) {
          console.log('[SmallWebRTC] Ignoring userStoppedSpeaking — mic not held (hold-to-speak inactive)')
          return
        }
        console.log('[SmallWebRTC] User stopped speaking')
        // Bubble deferred to mic release → transcribing
      })

      client.on('botStartedSpeaking', () => {
        if (isMicInputEnabledRef.current) {
          console.log('[SmallWebRTC] Ignoring botStartedSpeaking — user is holding mic (barge-in)')
          return
        }
        if (turnIdRef.current !== botTurnIdRef.current) {
          console.log('[SmallWebRTC] Ignoring botStartedSpeaking — stale turn')
          return
        }
        console.log('[SmallWebRTC] Bot started speaking')
        try {
          const tracks = client.tracks()
          if (tracks?.bot?.audio) tracks.bot.audio.enabled = true
        } catch (e) {
          console.warn('[SmallWebRTC] Could not enable bot audio track:', e)
        }
        if (audioElRef.current && audioElRef.current.paused) {
          audioElRef.current.play().catch(() => {})
        }
        setState('speaking')
      })

      client.on('botStoppedSpeaking', () => {
        console.log('[SmallWebRTC] Bot stopped speaking')
        if (turnIdRef.current !== botTurnIdRef.current) {
          console.log('[SmallWebRTC] Ignoring botStoppedSpeaking state change — stale turn')
          return
        }
        if (voiceprintBlockedRef.current) {
          // Verification failed — discard any bot text for this turn
          llmTextBufferRef.current = ''
          setState('listening')
          return
        }
        // Flush any remaining buffer not yet flushed by botLlmStopped
        if (!llmFlushedRef.current) {
          flushAssistantBubble(llmTextBufferRef.current)
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
        if (isMicInputEnabledRef.current) return

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
          hasUserSpokenThisSessionRef.current = true
          pendingUserIntentRef.current = text
          lastUserTranscriptRef.current = text
          if (isRecentTransactionsQuery(text)) {
            pendingStructuredIntentRef.current = 'transactions'
          }
          // Commit user bubble, then switch to assistant-side typing (left)
          botTurnIdRef.current = turnIdRef.current
          llmTextBufferRef.current = ''
          llmFlushedRef.current = false
          botTextViaLlmRef.current = false
          pushMsg('user', text)
          setState('processing')
        }
      })

      // botLlmText fires per streaming token — accumulate into buffer
      client.on('botLlmText', (data: any) => {
        if (voiceprintBlockedRef.current) return  // Suppress text when verification failed
        if (turnIdRef.current !== botTurnIdRef.current) return  // Stale prior-turn tokens
        botTextViaLlmRef.current = true
        const token = typeof data === 'string' ? data : (data?.text ?? '')
        console.log('[SmallWebRTC] Bot LLM text token:', token)
        llmTextBufferRef.current += token
        if (!isMicInputEnabledRef.current) {
          setState(prev => (prev === 'processing' ? 'speaking' : prev))
        }
      })

      // botLlmStopped fires when the LLM finishes streaming — flush buffer immediately
      client.on('botLlmStopped', () => {
        console.log('[SmallWebRTC] Bot LLM stopped, flushing buffer')
        if (turnIdRef.current !== botTurnIdRef.current) {
          llmTextBufferRef.current = ''
          botTextViaLlmRef.current = false
          return
        }
        if (voiceprintBlockedRef.current) {
          llmTextBufferRef.current = ''
          botTextViaLlmRef.current = false
          return  // Don't flush — verification failed
        }
        flushAssistantBubble(llmTextBufferRef.current)
        botTextViaLlmRef.current = false
      })

      // botTtsText carries the full TTS sentence — use as fallback if no LLM tokens came in
      client.on('botTtsText', (data: any) => {
        console.log('[SmallWebRTC] Bot TTS text:', data)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (turnIdRef.current !== botTurnIdRef.current) return
        if (llmFlushedRef.current) return
        const text = typeof data === 'string' ? data : data?.text
        if (text) flushAssistantBubble(text)
      })

      // botTranscript — accumulate per-chunk; commit on botLlmStopped / botStoppedSpeaking
      client.on('botTranscript', (data: any) => {
        console.log('[SmallWebRTC] Bot transcript:', data)
        if (voiceprintBlockedRef.current) return  // Suppress when verification failed
        if (turnIdRef.current !== botTurnIdRef.current) return
        if (llmFlushedRef.current || botTextViaLlmRef.current) return
        const text = typeof data === 'string' ? data : data?.text
        if (text) llmTextBufferRef.current += text
      })

      // Error handling
      client.on('error', (error: any) => {
        console.error('[SmallWebRTC] Error:', error)
        setState('error')
        pushMsg('status', `Error: ${error.message || 'Connection failed'}`)
      })

      client.on('disconnected', () => {
        if (client !== clientRef.current) {
          console.log('[SmallWebRTC] Ignoring disconnected event from superseded client')
          return
        }
        console.log('[SmallWebRTC] Session disconnected — cleaning up')
        forceTerminateLocalMedia(client)
        clientRef.current = null
        globalClientInstance = null
        isMicInputEnabledRef.current = false
        setIsMicHeld(false)
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
            pushMsg('assistant', t('errorNotAuthorized'))
          }
        } else if (data?.type === 'TRANSACTION_LIST') {
          // Push immediately — do not wait for LLM text flush (signal often arrives first).
          applyTransactionListSignal(data as TransactionListSignal)
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
          // Transfer completed: close OTP panel. The outcome is provided via agent utterance.
          setOtpSignal(null)
          if (signal.message?.trim()) {
            pushMsg('assistant', signal.message.trim())
          }
        } else {
          const directTxnSignal =
            data?.type === 'TRANSACTION_LIST' ? (data as TransactionListSignal) : null
          const nestedTxnSignal = Array.isArray(data?.signals)
            ? (data.signals.find((sig: any) => sig?.type === 'TRANSACTION_LIST') as TransactionListSignal | undefined)
            : undefined
          const txnSignal = directTxnSignal ?? nestedTxnSignal

          if (txnSignal) {
            applyTransactionListSignal(txnSignal)
          }
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

      // Fresh session negotiated successfully — allow a future one-shot retry.
      sessionOfferRetryRef.current = 0

    } catch (err) {
      console.error('[SmallWebRTC] Connect error:', err)
      clearNoSoundTimer()
      clientRef.current = null
      globalClientInstance = null

      const message = err instanceof Error ? err.message : 'Unknown'
      const sessionNotReady =
        /not-yet-ready|invalid or not-yet-ready session_id|negotiation failed \(404\)/i.test(message)

      // Offer retries in CustomTransport cover short races. If the session still
      // isn't usable, start a brand-new /start once before surfacing an error.
      if (sessionNotReady && sessionOfferRetryRef.current < 1) {
        sessionOfferRetryRef.current += 1
        console.warn('[SmallWebRTC] Session not ready after offer retries; restarting /start once')
        isConnectingRef.current = false
        window.setTimeout(() => {
          void connect()
        }, 400)
        return
      }

      sessionOfferRetryRef.current = 0
      pushMsg('status', `Error: ${message}`)
      setState('error')
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
    applyTransactionListSignal,
    pushAssistantMessage,
    pushMsg,
    shouldVerifyVoice,
    startNoSoundTimer,
    userTimezone,
  ])

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    const client = clientRef.current
    if (!client) {
      // Client already torn down (e.g. server-side disconnect). Keep disconnected
      // so the UI still shows Session Ended and offers reconnect.
      isBackgroundPausedRef.current = false
      setState('disconnected')
      return
    }

    console.log('[SmallWebRTC] Disconnecting...')

    // Reset mute state to unmuted on disconnect
    setIsMuted(false)
    if (audioElRef.current) {
      audioElRef.current.muted = false
    }

    // Null out refs immediately to prevent concurrent disconnect/connect races
    clientRef.current = null
    globalClientInstance = null

    try {
      forceTerminateLocalMedia(client)
      await client.disconnect()
      console.log('[SmallWebRTC] Client disconnected')
    } catch (err) {
      console.error('[SmallWebRTC] Disconnect error:', err)
    }

    clearNoSoundTimer()
    isBackgroundPausedRef.current = false
    isMicInputEnabledRef.current = false
    setIsMicHeld(false)
    setVoiceprintStatus(null)
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

      console.log('[SmallWebRTC] App returned to foreground, restoring mic and bot audio')
      isBackgroundPausedRef.current = false

      try {
        void clientRef.current.enableMic(isMicInputEnabledRef.current)
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
      if (isMicInputEnabledRef.current) {
        startNoSoundTimer()
      }
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

  // ── Auth-aware cleanup ─────────────────────────────────────────────────────
  // Disconnect WebRTC session when user logs out to prevent resource leaks

  const prevAuthRef = useRef(isAuthenticated)

  useEffect(() => {
    // Detect logout: previous state was authenticated, now it's not
    if (prevAuthRef.current && !isAuthenticated && clientRef.current) {
      console.log('[SmallWebRTC] Auth state changed to logged out, disconnecting...')
      disconnect()
    }
    
    // Update the previous auth state for next comparison
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated, disconnect])

  // ── Push-to-talk (mic capture) ─────────────────────────────────────────────

  const setMicrophoneCapture = useCallback((enabled: boolean) => {
    const client = clientRef.current
    if (!client) return

    if (enabled) {
      // Requirement 1: Hold & Speak immediately interrupts the bot locally
      if (state === 'speaking' || audioElRef.current?.srcObject) {
        console.log('[SmallWebRTC] Hold & Speak interrupting bot playback locally')
        if (audioElRef.current) {
          audioElRef.current.pause()
          audioElRef.current.currentTime = 0
        }
        try {
          const tracks = client.tracks()
          if (tracks?.bot?.audio) tracks.bot.audio.enabled = false
        } catch (e) {
          console.warn('[SmallWebRTC] Could not disable bot track on interruption:', e)
        }
        if (state === 'speaking') {
          setState('listening')
        }
      }

      // Requirement 2: Beep and mic capture should only activate when ALL conditions are true
      let isReady = isBotReadyRef.current
      try {
        const transport = client.transport as any
        const pc = transport?.pc || transport?._pc
        if (pc && pc.connectionState !== 'connected') isReady = false
        const dc = transport?.dataChannel || transport?._dataChannel || transport?.messageChannel
        if (dc && dc.readyState !== 'open') isReady = false
      } catch {
        // Fallback if transport internals unavailable
      }

      if (!isReady) {
        console.warn('[SmallWebRTC] Hold & Speak requested before readiness conditions met. Waiting...')
        pendingHoldRequestRef.current = true
        return
      }

      pendingHoldRequestRef.current = false
      if (isMicInputEnabledRef.current) return

      hasDetectedUserVoiceRef.current = false
      setInputSoundStatus(null)
      clearNoSoundTimer()
      isMicInputEnabledRef.current = true

      void (async () => {
        try {
          void client.enableMic(true)
          const tracks = client.tracks()
          if (tracks?.local?.audio) tracks.local.audio.enabled = true
        } catch (err) {
          console.error('[SmallWebRTC] Failed to enable mic capture:', err)
        }

        await playBeep()
        if (!isMicInputEnabledRef.current) return

        setIsMicHeld(true)
        startNoSoundTimer()
      })()
    } else {
      pendingHoldRequestRef.current = false
      if (!isMicInputEnabledRef.current) return

      isMicInputEnabledRef.current = false
      setIsMicHeld(false)
      clearNoSoundTimer()
      setInputSoundStatus(null)

      try {
        void client.enableMic(false)
        const tracks = client.tracks()
        if (tracks?.local?.audio) tracks.local.audio.enabled = false
      } catch (err) {
        console.error('[SmallWebRTC] Failed to disable mic capture:', err)
      }

      if (pendingUserBubbleTextRef.current) {
        pushMsg('user', pendingUserBubbleTextRef.current)
        pendingUserBubbleTextRef.current = ''
      }

      // New UI turn: right-side typing while STT runs; always re-enter even if already processing
      turnIdRef.current += 1
      // Anchor the next bot reply to this turn even when STT returns empty (unclear fallback).
      botTurnIdRef.current = turnIdRef.current
      llmTextBufferRef.current = ''
      llmFlushedRef.current = false
      botTextViaLlmRef.current = false
      setState('transcribing')
    }
  }, [clearNoSoundTimer, startNoSoundTimer, state, pushMsg])

  const startPushToTalk = useCallback(() => {
    setMicrophoneCapture(true)
  }, [setMicrophoneCapture])

  const stopPushToTalk = useCallback(() => {
    setMicrophoneCapture(false)
  }, [setMicrophoneCapture])

  // ── Toggle Mute ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted

    // Mute/unmute the bot's audio output element only.
    // The mic and WebRTC connection stay active so the bot can still hear and process.
    if (audioElRef.current) {
      audioElRef.current.muted = newMutedState
    }

    setIsMuted(newMutedState)
    
    // Persist mute preference for current auth session
    const currentAuthSessionId = localStorage.getItem(AUTH_SESSION_ID_KEY)
    saveMuteState(currentAuthSessionId, newMutedState)
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
    stopAudioTracks,
    client: clientRef.current,
  }
}

// Export function to get client for audio component
export function useSmallWebRTCClient() {
  return globalClientInstance
}
