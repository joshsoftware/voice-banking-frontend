/**
 * Reusable modern chat-style typing indicator (animated three dots).
 * Replaces generic static 'Processing...' text to mimic messaging apps (iMessage, WhatsApp).
 */
export function TypingIndicator() {
  return (
    <div className="flex justify-start my-1 animate-fade-in" aria-label="Assistant typing">
      <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--color-surface-app)] px-4 py-3.5 shadow-sm border border-gray-100/10">
        <span className="inline-block size-2 rounded-full bg-[var(--color-brand-500)]/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="inline-block size-2 rounded-full bg-[var(--color-brand-500)]/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="inline-block size-2 rounded-full bg-[var(--color-brand-500)]/70 animate-bounce" />
      </div>
    </div>
  );
}
