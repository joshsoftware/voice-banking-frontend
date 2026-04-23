import { useEffect, useRef, useState, useCallback } from 'react'
import { VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import type { WebRTCState, ChatMessage, VoiceprintStatus } from '@/hooks/useSmallWebRTC'
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
  onToggleMute: () => void
  onStop: () => void
  onFeedback?: () => void
  showMuteControl?: boolean
}

export function ListeningSheet({
  state,
  isMuted,
  messages,
  voiceprintStatus,
  onToggleMute,
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

  // Show all messages
  const visibleMessages = messages

  return (
    <div className="absolute bottom-0 left-0 w-full z-50" onClick={e => e.stopPropagation()}>
      <div
        className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-2 shadow-[var(--shadow-sheet)] flex flex-col"
        style={{ height: `${sheetVh}vh`, maxHeight: 'calc(100% - 220px)' }}
      >
        <div className="mx-auto w-full max-w-[356px] px-3 flex flex-col flex-1 min-h-0">
          {/* Handle — drag to resize */}
          <div className="flex justify-center py-2">
            <div
              className="h-1 w-10 rounded-full bg-black/30 cursor-ns-resize touch-none select-none hover:bg-black/50 transition-colors"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            />
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

            {/* Chat area */}
            {visibleMessages.length > 0 && (
              <div className="w-full flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto px-1">
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
