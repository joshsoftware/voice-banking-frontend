import { useEffect, useRef, useState, useCallback } from 'react'
import { VolumeIcon, VolumeMutedIcon, MicIcon, CloseIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import type { WebRTCState, ChatMessage, VoiceprintStatus, OTPSignal } from '@/hooks/useSmallWebRTC'
import { useTranslation } from '@/i18n/LanguageHooks'
import { TypingIndicator } from '@/components/ui/TypingIndicator'

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<WebRTCState, string> = {
  idle: 'text-[var(--color-brand-500)]',
  connecting: 'text-amber-500',
  connected: 'text-[var(--color-brand-500)]',
  listening: 'text-[var(--color-brand-500)]',
  processing: 'text-amber-500',
  speaking: 'text-emerald-600',
  error: 'text-red-500',
  disconnected: 'text-red-500 font-semibold',
}

function formatTransactionDate(value?: string) {
  if (!value) return '-'
  const parsed = new Date(value.includes('T') ? value : `${value.split('T')[0]}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed)
}

function formatTransactionAmount(amount: number, type?: string) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  return type?.toUpperCase() === 'CREDIT' ? `+${formatted}` : `-${formatted}`
}

function isCreditTransaction(type?: string) {
  return type?.toUpperCase() === 'CREDIT'
}

function formatMessageTime(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

function parseMarkdownLinks(text: string | undefined, isAssistant: boolean) {
  if (!text) return ''
  
  const parts = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  let lastIndex = 0
  let match

  const linkClass = isAssistant 
    ? 'text-white underline font-semibold hover:text-white/80 transition-colors' 
    : 'text-[var(--color-brand-500)] underline font-semibold hover:text-[var(--color-brand-300)] transition-colors'

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index
    
    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex))
    }

    // Add the link
    const linkText = match[1]
    const linkUrl = match[2]
    parts.push(
      <a
        key={matchIndex}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {linkText}
      </a>
    )

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function getLocalizedTableHeading(tableTitle: string | undefined, t: ReturnType<typeof useTranslation>['t']) {
  const normalized = (tableTitle ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!normalized) return t('recentTransactions')
  if (normalized.includes('loan') && normalized.includes('statement')) return t('loanStatement')
  if (normalized.includes('upi') && normalized.includes('transaction')) return t('upiTransactions')
  if (normalized.includes('recent') && normalized.includes('transaction')) return t('recentTransactions')
  if (normalized === 'transaction' || normalized === 'transactions') return t('transactions')

  return tableTitle
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function RecentTransactionsBubble({ msg }: { msg: ChatMessage }) {
  const { t } = useTranslation()
  const items = msg.transactions ?? []
  const heading = getLocalizedTableHeading(msg.tableTitle, t)

  if (items.length === 0) {
    return (
      <div className="max-w-[80%] rounded-2xl bg-[var(--color-brand-500)] px-4 py-2 text-sm leading-snug text-white shadow-sm">
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 whitespace-pre-line">{parseMarkdownLinks(msg.text, true)}</div>
          <div className="shrink-0 self-end text-[10px] text-white/60 leading-none">
            {formatMessageTime(msg.ts)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[85%] rounded-2xl bg-[var(--color-brand-500)] px-2.5 py-2 text-white shadow-sm">
      {msg.text ? (
        <div className="mb-1.5 whitespace-pre-line text-xs leading-snug text-white">
          {parseMarkdownLinks(msg.text, true)}
        </div>
      ) : null}
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
        {heading}
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => {
          const credit = isCreditTransaction(item.type)
          return (
            <div
              key={item.transactionId || `${item.transactionDate}-${idx}`}
              className="rounded-md bg-white px-2 py-1.5 text-[var(--color-brand-900)]"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1 text-xs font-medium leading-snug">{item.description}</div>
                <div
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    credit ? 'text-emerald-700' : 'text-[var(--color-brand-900)]'
                  }`}
                >
                  {formatTransactionAmount(item.amount, item.type)}
                </div>
              </div>
              <div className="mt-0.5 text-[9px] leading-tight text-[var(--color-text-muted-2)]">
                {(item.type ?? 'DEBIT').toUpperCase()} • {formatTransactionDate(item.transactionDate)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-end">
        <div className="text-[9px] text-white/60">
          {formatMessageTime(msg.ts)}
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'status') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-[var(--color-text-muted-3)] italic">{msg.text}</span>
      </div>
    )
  }
  const showTransactionCards =
    msg.role === 'assistant' &&
    ((msg.transactions?.length ?? 0) > 0 || Boolean(msg.tableTitle))
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {showTransactionCards ? (
        <RecentTransactionsBubble msg={msg} />
      ) : msg.role === 'assistant' ? (
        <div className="max-w-[80%] rounded-2xl bg-[var(--color-brand-500)] px-4 py-2 text-sm leading-snug text-white shadow-sm">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 whitespace-pre-line">{parseMarkdownLinks(msg.text, true)}</div>
            <div className="shrink-0 self-end text-[10px] text-white/60 leading-none">
              {formatMessageTime(msg.ts)}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-[80%] rounded-2xl bg-[var(--color-surface-app)] px-4 py-2 text-sm leading-snug text-[var(--color-brand-900)] shadow-sm">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 whitespace-pre-line">{parseMarkdownLinks(msg.text, false)}</div>
            <div className="shrink-0 self-end text-[10px] text-gray-500/70 leading-none">
              {formatMessageTime(msg.ts)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ListeningSheet ───────────────────────────────────────────────────────────

interface ListeningSheetProps {
  state: WebRTCState
  isMuted: boolean
  isMicHeld: boolean
  messages: ChatMessage[]
  voiceprintStatus: VoiceprintStatus | null
  otpSignal: OTPSignal | null
  onToggleMute: () => void
  onPushToTalkStart: () => void
  onPushToTalkEnd: () => void
  onSubmitOtp?: (code: string) => Promise<any>
  onReconnect?: () => void
  onClose?: () => void
  onFeedback?: () => void
  showMuteControl?: boolean
}

export function ListeningSheet({
  state,
  isMuted,
  isMicHeld,
  messages,
  voiceprintStatus,
  otpSignal,
  onToggleMute,
  onPushToTalkStart,
  onPushToTalkEnd,
  onSubmitOtp,
  onReconnect,
  onClose,
  onFeedback,
  showMuteControl = true,
}: ListeningSheetProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const isActive = state === 'listening' || state === 'speaking'
  const isError = state === 'error'
  const isDisconnected = state === 'disconnected'
  const isConnecting = state === 'connecting'
  const showPushToTalk = !isDisconnected && !isError
  const isPushToTalkDisabled = state === 'idle' || isConnecting
  const showHoldHint = showPushToTalk && state !== 'processing' && !isMicHeld && !isPushToTalkDisabled
  const { t } = useTranslation()

  const handlePushToTalkPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onPushToTalkStart()
  }, [onPushToTalkStart])

  const handlePushToTalkPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    onPushToTalkEnd()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // capture may already be released
    }
  }, [onPushToTalkEnd])

  // ── Drag-to-resize ─────────────────────────────────────────────────────────
  const MIN_VH = 28
  const MAX_VH = 72
  const DEFAULT_VH = 65
  const [sheetVh, setSheetVh] = useState(DEFAULT_VH)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const dragStartVh = useRef<number>(DEFAULT_VH)

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
    dragStartVh.current = sheetVh
  }, [sheetVh])

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const deltaY = dragStartY.current - e.clientY          // drag up → positive
    const deltaVh = (deltaY / window.innerHeight) * 100
    const next = Math.min(MAX_VH, Math.max(MIN_VH, dragStartVh.current + deltaVh))
    setSheetVh(next)
  }, [])

  const onHandlePointerUp = useCallback(() => {
    dragStartY.current = null
  }, [])

  const statusLabels: Record<WebRTCState, string> = {
    idle: '',
    connecting: t('statusConnecting'),
    connected: t('statusReady'),
    listening: t('statusListening'),
    processing: t('statusProcessing'),
    speaking: t('statusSpeaking'),
    error: t('statusConnectionError'),
    disconnected: t('statusSessionEnded'),
  }

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Voiceprint badge visibility with auto-fade
  const [showVpBadge, setShowVpBadge] = useState(false)
  const [vpFading, setVpFading] = useState(false)

  useEffect(() => {
    if (!voiceprintStatus) return
    setShowVpBadge(true)
    setVpFading(false)
    const fadeTimer = setTimeout(() => setVpFading(true), 3000)
    const hideTimer = setTimeout(() => setShowVpBadge(false), 3800)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [voiceprintStatus])

  // ── OTP Input logic ────────────────────────────────────────────────────────
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(-1)
    const newOtp = [...otpValue]
    newOtp[index] = cleaned
    setOtpValue(newOtp)
    if (otpError) setOtpError('')

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = async () => {
    const code = otpValue.join('')
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits')
      return
    }

    if (onSubmitOtp) {
      setIsVerifying(true)
      try {
        const res = await onSubmitOtp(code)
        const transferSucceeded = res?.status === 'success' || res?.transfer_ok === true
        if (!transferSucceeded) {
          setOtpError(res.message || 'Verification failed')
        } else {
          setOtpError('')
          setOtpValue(['', '', '', '', '', ''])
        }
      } catch (err) {
        setOtpError('An error occurred')
      } finally {
        setIsVerifying(false)
      }
    }
  }

  // Clear OTP when signal disappears or changes
  useEffect(() => {
    if (!otpSignal) {
      setOtpValue(['', '', '', '', '', ''])
      setOtpError('')
    }
  }, [otpSignal])

  // Show all messages
  const visibleMessages = messages

  return (
    <div className="absolute bottom-0 left-0 w-full z-50" onClick={e => e.stopPropagation()}>
      <div
        className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-2 shadow-[var(--shadow-sheet)] flex flex-col relative"
        style={{ height: `${sheetVh}vh`, maxHeight: 'calc(100% - 220px)' }}
      >
        {/* Close button - top right corner */}
        {onClose && (
          <button
            type="button"
            data-testid="listening-close-btn"
            onClick={() => {
              if (isDisconnected) {
                onClose()
                return
              }
              setShowCloseConfirm(true)
            }}
            className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-black/5 hover:bg-black/10 active:bg-black/15 transition-colors"
            aria-label={t('close')}
          >
            <CloseIcon className="text-[var(--color-text-muted-2)]" />
          </button>
        )}
        <div className="mx-auto w-full max-w-[356px] px-3 flex flex-col flex-1 min-h-0">
          {/* Drag handle area — entire top border is draggable */}
          <div 
            className="group flex justify-center py-3 cursor-ns-resize touch-none select-none -mx-3 px-3 hover:bg-black/5 active:bg-black/10 transition-colors rounded-t-3xl"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <div className="h-1 w-10 rounded-full bg-black/30 transition-colors group-hover:bg-black/50 group-active:bg-black/60" />
          </div>

          {/* Scrollable top section */}
          <div className="flex flex-col flex-1 min-h-0 items-center gap-4 overflow-hidden">
            {/* Status label */}
            <div
              className={`leading-5 transition-colors duration-300 ${isDisconnected ? 'text-base' : 'text-sm font-medium'} ${STATUS_COLORS[state]}`}
            >
              {showHoldHint ? t('statusHoldToSpeak') : statusLabels[state]}
            </div>

            {/* Voiceprint verification badge */}
            {showVpBadge && voiceprintStatus && (
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm transition-opacity duration-700 ${
                  vpFading ? 'opacity-0' : 'opacity-100'
                } ${
                  voiceprintStatus.verified
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <span className={`inline-block size-2 rounded-full ${
                  voiceprintStatus.verified ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                {voiceprintStatus.verified
                  ? `Voice Matched (${(voiceprintStatus.score * 100).toFixed(0)}%)`
                  : `Voice Not Matched (${(voiceprintStatus.score * 100).toFixed(0)}%)`}
              </div>
            )}

            {/* Waveform */}
            <Waveform active={isActive && isMicHeld} />

            {/* OTP Section (Overlay-like within sheet) */}
            {/* TODO: OTP verification is temporarily disabled. Actual verification must be restored before production rollout. */}
            {otpSignal && false && (
              <div className="w-full rounded-2xl bg-[var(--color-brand-900)]/5 p-4 border border-[var(--color-brand-900)]/10 shadow-lg transition-all duration-500 transform translate-y-0 opacity-100 mb-4">
                <div className="text-center space-y-2 mb-4">
                  <h3 className="text-sm font-bold text-[var(--color-brand-900)] uppercase tracking-wider">Transaction Verification</h3>
                  <p className="text-xs text-[var(--color-brand-600)]">Your 6-digit OTP is:</p>
                  <div className="inline-block bg-[var(--color-brand-500)] text-white px-4 py-1.5 rounded-lg text-xl font-mono font-bold tracking-[0.3em] shadow-md">
                    {otpSignal?.otp_code}
                  </div>
                </div>

                <div className="flex justify-between gap-1 mb-3">
                  {otpValue.map((val, i) => (
                    <input
                      key={i}
                      ref={el => { otpInputRefs.current[i] = el }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-10 h-12 bg-white border-2 border-[var(--color-brand-900)]/20 rounded-lg text-center text-xl font-bold text-[var(--color-brand-900)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-all shadow-sm"
                    />
                  ))}
                </div>

                {otpError && <p className="text-[10px] text-red-400 text-center mb-3 font-medium">{otpError}</p>}

                <Button
                  onClick={handleOtpSubmit}
                  className="w-full h-12 rounded-xl text-md font-bold bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50 shadow-lg active:scale-[0.98] transition-all"
                  disabled={isVerifying || otpValue.some(v => !v)}
                >
                  {isVerifying ? 'Verifying...' : 'Confirm Transfer'}
                </Button>
              </div>
            )}

            {/* Chat area */}
            {(visibleMessages.length > 0 || state === 'processing') && (
              <div className="w-full flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto mobile-scroll px-1">
                {visibleMessages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}
                {state === 'processing' && <TypingIndicator />}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          {/* Pinned bottom actions */}
          <div className="flex flex-col items-center gap-2 pt-3 pb-3 border-t border-black/5 mt-2">
            {isDisconnected ? (
              onReconnect && (
                <button
                  type="button"
                  data-testid="listening-reconnect-btn"
                  aria-label={t('ariaStartVoiceConversation')}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    void onReconnect()
                  }}
                  onPointerUp={(e) => {
                    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
                  }}
                  onPointerCancel={() => {}}
                  className="h-16 w-full max-w-[280px] touch-none select-none rounded-full bg-[var(--color-surface-card)] font-semibold text-[var(--color-brand-900)] ring-2 ring-[var(--color-brand-500)]/30 shadow-[var(--shadow-voice-btn)] transition-all active:scale-[0.98]"
                >
                  {t('holdToSpeak')}
                </button>
              )
            ) : (
              showPushToTalk && (
                <button
                  type="button"
                  data-testid="listening-hold-to-speak-btn"
                  aria-label={t('ariaHoldToSpeak')}
                  disabled={isPushToTalkDisabled}
                  onPointerDown={isPushToTalkDisabled ? undefined : handlePushToTalkPointerDown}
                  onPointerUp={isPushToTalkDisabled ? undefined : handlePushToTalkPointerUp}
                  onPointerCancel={isPushToTalkDisabled ? undefined : onPushToTalkEnd}
                  className={`h-16 w-full max-w-[280px] touch-none select-none rounded-full font-semibold shadow-[var(--shadow-voice-btn)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 px-6 ${
                    isPushToTalkDisabled
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-muted-2)] ring-2 ring-[var(--color-brand-500)]/10 opacity-60 cursor-not-allowed'
                      : isMicHeld
                        ? '[background:var(--gradient-mic)] text-white shadow-[var(--shadow-mic)]'
                        : 'bg-[var(--color-surface-card)] text-[var(--color-brand-900)] ring-2 ring-[var(--color-brand-500)]/30'
                  }`}
                >
                  <MicIcon width="20" height="20" className="shrink-0" />
                  <span>{isPushToTalkDisabled ? t('statusConnecting') : isMicHeld ? t('releaseToMute') : t('holdToSpeak')}</span>
                </button>
              )
            )}

            {showMuteControl && (
              <div className="flex w-full items-center justify-end gap-2">
                {onFeedback && (
                  <button
                    type="button"
                    data-testid="listening-feedback-btn"
                    onClick={onFeedback}
                    className="mr-auto flex items-center gap-1.5 text-xs text-[var(--color-brand-600)]/60 transition-colors hover:text-[var(--color-brand-600)]"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18M9.75 12h.008v.008H9.75V12zm4.5 0h.008v.008h-.008V12zm4.5 0h.008v.008h-.008V12z" />
                    </svg>
                    {t('feedbackSendButton')}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="listening-mute-toggle-btn"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={onToggleMute}
                  className={`grid size-10 place-items-center rounded-full shadow-[var(--shadow-mute)] transition-colors ${
                    isMuted
                      ? 'bg-red-100 hover:bg-red-200'
                      : 'bg-[var(--color-surface-app)] hover:bg-gray-200'
                  }`}
                >
                  {isMuted ? (
                    <VolumeMutedIcon className="text-red-500" />
                  ) : (
                    <VolumeIcon className="text-[var(--color-brand-500)]" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCloseConfirm(false)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center transform scale-100 transition-all duration-300">
            {/* Warning icon container */}
            <div className="grid size-14 place-items-center rounded-full bg-red-50 text-red-500 mb-4">
              <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('confirmEndSessionTitle')}</h3>
            <p className="text-sm text-[var(--color-text-muted-1)] mb-6 leading-relaxed">
              {t('confirmEndSessionMessage')}
            </p>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[var(--color-surface-app)] text-[var(--color-brand-900)] hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                {t('confirmEndSessionCancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false)
                  onClose?.()
                }}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] transition-all shadow-md shadow-red-600/20"
              >
                {t('confirmEndSessionConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
