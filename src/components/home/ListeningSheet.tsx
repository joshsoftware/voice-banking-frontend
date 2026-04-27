import { useEffect, useRef, useState, useCallback } from 'react'
import { VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import type { WebRTCState, ChatMessage, VoiceprintStatus, OTPSignal } from '@/hooks/useSmallWebRTC'
import { useTranslation } from '@/i18n/LanguageHooks'

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<WebRTCState, string> = {
  idle: 'text-[var(--color-brand-500)]',
  connecting: 'text-amber-500',
  connected: 'text-[var(--color-brand-500)]',
  listening: 'text-[var(--color-brand-500)]',
  processing: 'text-amber-500',
  speaking: 'text-emerald-600',
  error: 'text-red-500',
  disconnected: 'text-[var(--color-text-muted-1)]',
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'status') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-[var(--color-text-muted-3)] italic">{msg.text}</span>
      </div>
    )
  }
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-snug shadow-sm ${
          msg.role === 'assistant'
            ? 'bg-[var(--color-brand-500)] text-white'
            : 'bg-[var(--color-surface-app)] text-[var(--color-brand-900)]'
        }`}
      >
        {msg.text}
      </div>
    </div>
  )
}

// ─── ListeningSheet ───────────────────────────────────────────────────────────

interface ListeningSheetProps {
  state: WebRTCState
  isMuted: boolean
  messages: ChatMessage[]
  voiceprintStatus: VoiceprintStatus | null
  otpSignal: OTPSignal | null
  onToggleMute: () => void
  onSubmitOtp?: (code: string) => Promise<any>
  onStop: () => void
  onFeedback?: () => void
  showMuteControl?: boolean
}

export function ListeningSheet({
  state,
  isMuted,
  messages,
  voiceprintStatus,
  otpSignal,
  onToggleMute,
  onSubmitOtp,
  onStop,
  onFeedback,
  showMuteControl = true,
}: ListeningSheetProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const isActive = state === 'listening' || state === 'speaking'
  const isError = state === 'error'
  const { t } = useTranslation()

  // ── Drag-to-resize ─────────────────────────────────────────────────────────
  const MIN_VH = 28
  const MAX_VH = 72
  const DEFAULT_VH = 40
  const [sheetVh, setSheetVh] = useState(DEFAULT_VH)
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
    disconnected: t('statusDisconnected'),
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
        className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-2 shadow-[var(--shadow-sheet)] flex flex-col"
        style={{ height: `${sheetVh}vh`, maxHeight: 'calc(100% - 220px)' }}
      >
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
              className={`text-sm font-medium leading-5 transition-colors duration-300 ${STATUS_COLORS[state]}`}
            >
              {statusLabels[state]}
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
            <Waveform active={isActive} />

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
            {visibleMessages.length > 0 && (
              <div className="w-full flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto mobile-scroll px-1">
                {visibleMessages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          {/* Pinned bottom actions */}
          <div className="flex flex-col items-center gap-2 pt-3 pb-3 border-t border-black/5 mt-2">
            {/* Stop button */}
            <Button
              type="button"
              onClick={onStop}
              variant={isError ? 'success' : 'primary'}
              className={`h-14 w-44 rounded-full font-semibold transition-all ${
                isError ? 'bg-red-500 hover:bg-red-600' : ''
              }`}
            >
              {isError ? t('dismiss') : t('stop')}
            </Button>

            {showMuteControl && (
              <div className="flex w-full items-center justify-end gap-2">
                {onFeedback && (
                  <button
                    type="button"
                    onClick={onFeedback}
                    className="mr-auto flex items-center gap-1.5 text-xs text-[var(--color-brand-600)]/60 transition-colors hover:text-[var(--color-brand-600)]"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18M9.75 12h.008v.008H9.75V12zm4.5 0h.008v.008h-.008V12zm4.5 0h.008v.008h-.008V12z" />
                    </svg>
                    Send Feedback
                  </button>
                )}
                <button
                  type="button"
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
    </div>
  )
}
