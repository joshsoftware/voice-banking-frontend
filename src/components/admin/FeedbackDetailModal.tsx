import type { Feedback } from '@/lib/feedbackApi'

interface FeedbackDetailModalProps {
  feedback: Feedback
  onClose: () => void
}

export function FeedbackDetailModal({ feedback, onClose }: FeedbackDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--color-brand-900)]/95 to-[var(--color-brand-800)]/95 backdrop-blur-lg border border-white/20 shadow-2xl themed-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/20">
          <h2 className="text-lg sm:text-xl font-bold text-white">Feedback Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <svg
              className="size-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* User Info Section */}
          <div className="flex items-start gap-3 sm:gap-4 pb-4 border-b border-white/10">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-lg sm:text-2xl font-bold text-white shadow-lg shrink-0">
              {feedback.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{feedback.username}</h3>
              <p className="text-sm text-white/70 mb-1 sm:mb-2 break-all">{feedback.email}</p>
              <p className="text-xs text-white/50">{formatDate(feedback.created_at)}</p>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Description</h4>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
              <p className="text-sm sm:text-base leading-relaxed text-white whitespace-pre-wrap">
                {feedback.description}
              </p>
            </div>
          </div>

          {/* Image Section */}
          {feedback.image_url && (
            <div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Screenshot</h4>
              <div className="rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <img
                  src={feedback.image_url}
                  alt="Feedback screenshot"
                  className="w-full h-auto"
                />
              </div>
              <p className="mt-2 text-xs text-white/50">
                {feedback.image_content_type} • {formatFileSize(feedback.image_size)}
              </p>
            </div>
          )}

          {/* Metadata Section */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Technical Details</h4>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                <span className="text-xs sm:text-sm font-medium text-white/70">Session ID:</span>
                <span className="text-xs sm:text-sm text-white font-mono sm:text-right break-all">
                  {feedback.session_id}
                </span>
              </div>
              {feedback.device_id && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 pt-2 border-t border-white/10">
                  <span className="text-xs sm:text-sm font-medium text-white/70">Device ID:</span>
                  <span className="text-xs sm:text-sm text-white font-mono sm:text-right break-all">
                    {feedback.device_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
