/**
 * Reusable modern chat-style typing indicator (animated three dots).
 */
export function TypingIndicator() {
  return (
    <div className="my-1 flex animate-fade-in justify-start" aria-label="Assistant typing">
      <div className="flex items-center gap-1.5 rounded-2xl border border-gray-100/10 bg-[var(--color-surface-app)] px-4 py-3.5 shadow-sm">
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70 [animation-delay:-0.3s]" />
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70 [animation-delay:-0.15s]" />
        <span className="inline-block size-2 animate-bounce rounded-full bg-[var(--color-brand-500)]/70" />
      </div>
    </div>
  )
}
