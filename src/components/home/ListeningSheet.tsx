import { useEffect, useRef } from 'react'
import { VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import type { WebRTCState, ChatMessage } from '@/hooks/useWebRTC'

// ─── Waveform ─────────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [4, 6, 9, 13, 18, 24, 30, 36, 42, 46, 44, 40, 34, 28, 22, 18, 14, 10, 8, 6, 4]

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[5px]">
      {BAR_HEIGHTS.map((height, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-[var(--color-brand-400)] transition-all duration-300"
          style={{
            height: `${height}px`,
            animationName: active ? 'waveBar' : 'none',
            animationDuration: '1.2s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
    </div>
  )
}


// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<WebRTCState, string> = {
  idle: '',
  connecting: 'Connecting…',
  connected: 'Ready',
  listening: 'Listening…',
  processing: 'Processing…',
  speaking: 'Speaking…',
  error: 'Connection error',
  disconnected: 'Disconnected',
}

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
  onToggleMute: () => void
  onStop: () => void
}

export function ListeningSheet({
  state,
  isMuted,
  messages,
  onToggleMute,
  onStop,
}: ListeningSheetProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const isActive = state === 'listening' || state === 'speaking'
  const isError = state === 'error'

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show last 5 messages
  const visibleMessages = messages.slice(-5)

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-5 py-2 shadow-[var(--shadow-sheet)]">
        <div className="mx-auto w-full max-w-[356px] px-3">
          <div className="flex flex-col items-center gap-4 pb-2">
            {/* Handle */}
            <div className="h-0.5 w-10 rounded-full bg-black/40" />

            {/* Status label */}
            <div
              className={`text-sm font-medium leading-5 transition-colors duration-300 ${STATUS_COLORS[state]}`}
            >
              {STATUS_LABELS[state]}
            </div>

            {/* Waveform */}
            <Waveform active={isActive} />

            {/* Chat area */}
            {visibleMessages.length > 0 && (
              <div className="w-full flex flex-col gap-2 max-h-32 overflow-y-auto px-1">
                {visibleMessages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Stop button */}
            <Button
              type="button"
              onClick={onStop}
              variant={isError ? 'success' : 'primary'}
              className={`mt-2 h-14 w-44 rounded-full font-semibold transition-all ${
                isError ? 'bg-red-500 hover:bg-red-600' : ''
              }`}
            >
              {isError ? 'Dismiss' : 'Stop'}
            </Button>

            {/* Mute button */}
            <div className="flex w-full items-center justify-end gap-2 pb-1">
              <div className="text-center text-[10px] font-medium leading-normal text-[var(--color-brand-600)]/50">
                Tap to {isMuted ? 'unmute' : 'mute'}
              </div>
              <button
                type="button"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                onClick={onToggleMute}
                className="grid size-10 place-items-center rounded-full bg-[var(--color-surface-app)] shadow-[var(--shadow-mute)] transition-colors hover:bg-gray-200"
              >
                {isMuted ? (
                  <VolumeMutedIcon className="text-[var(--color-brand-500)]" />
                ) : (
                  <VolumeIcon className="text-[var(--color-brand-500)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
