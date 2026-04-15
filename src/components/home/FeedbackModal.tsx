import { useRef, useState } from 'react'
import { API_BASE } from '@/lib/constants'

interface FeedbackModalProps {
  username: string
  email: string
  sessionId: string | null
  deviceId: string
  onClose: () => void
}

export function FeedbackModal({ username, email, sessionId, deviceId, onClose }: FeedbackModalProps) {
  const [form, setForm] = useState({
    username,
    email,
    description: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImage(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }
    if (!sessionId) {
      setError('No active session found. Please start a session and try again.')
      return
    }
    if (!image) {
      setError('A screenshot is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const base = (API_BASE || '').replace(/\/+$/, '')
      const fd = new FormData()
      fd.append('username', form.username)
      fd.append('email', form.email)
      fd.append('session_id', sessionId)
      fd.append('device_id', deviceId)
      fd.append('description', form.description)
      fd.append('image', image)

      const res = await fetch(`${base}/api/feedback`, { method: 'POST', body: fd })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg =
          (body as { detail?: string; message?: string }).detail ||
          (body as { message?: string }).message ||
          `Request failed (${res.status})`
        throw new Error(msg)
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-green-100">
              <svg
                className="size-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Feedback submitted!</p>
            <p className="text-sm text-gray-500">Thank you for helping us improve.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-xl bg-[var(--color-brand-900,#1a237e)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Submit Feedback</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600" htmlFor="fb-username">
                  Name
                </label>
                <input
                  id="fb-username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  required
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-[var(--color-brand-900,#1a237e)] focus:ring-1 focus:ring-[var(--color-brand-900,#1a237e)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600" htmlFor="fb-email">
                  Email
                </label>
                <input
                  id="fb-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-[var(--color-brand-900,#1a237e)] focus:ring-1 focus:ring-[var(--color-brand-900,#1a237e)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600" htmlFor="fb-description">
                  Description
                </label>
                <textarea
                  id="fb-description"
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                  required
                  placeholder="Describe your feedback…"
                  className="resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-[var(--color-brand-900,#1a237e)] focus:ring-1 focus:ring-[var(--color-brand-900,#1a237e)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Screenshot <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50"
                >
                  <svg
                    className="size-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="truncate">
                    {image ? image.name : 'Attach an image'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full rounded-xl bg-[var(--color-brand-900,#1a237e)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
