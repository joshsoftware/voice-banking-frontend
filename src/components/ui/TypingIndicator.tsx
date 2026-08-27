/**
 * Reusable modern chat-style typing indicator (animated three dots).
 * align="end" = user/STT side (right); align="start" = assistant (left).
 */
export function TypingIndicator({ align = 'start' }: { align?: 'start' | 'end' }) {
  const isUser = align === 'end'
  return (
    <div
      className={`my-1 flex animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
      aria-label={isUser ? 'Transcribing' : 'Assistant typing'}
    >
      <div
        className={`flex items-center gap-1.5 rounded-2xl px-4 py-3.5 shadow-sm ${
          isUser
            ? 'bg-[var(--color-surface-app)]'
            : 'border border-gray-100/10 bg-[var(--color-surface-app)]'
        }`}
      >
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70 [animation-delay:-0.3s]" />
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70 [animation-delay:-0.15s]" />
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70" />
      </div>
    </div>
  )
}
