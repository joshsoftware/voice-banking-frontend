import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '@/contexts/AdminContext'
import { feedbackApi } from '@/lib/feedbackApi'
import type { Feedback } from '@/lib/feedbackApi'
import { Button } from '@/components/ui/button'

export default function AdminFeedback() {
  const { isAdminAuthenticated, logout } = useAdmin()
  const navigate = useNavigate()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login')
    }
  }, [isAdminAuthenticated, navigate])

  useEffect(() => {
    fetchFeedback()
  }, [currentPage])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      setError('')
      const skip = (currentPage - 1) * itemsPerPage
      const data = await feedbackApi.getFeedback(skip, itemsPerPage)
      setFeedbacks(data)
    } catch (err) {
      setError('Failed to fetch feedback. Please try again.')
      console.error('Error fetching feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-bg)] flex items-center justify-center">
        <div className="text-lg text-white">Loading feedback...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)]">
      {/* Header Bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-[var(--color-brand-500)] via-[var(--color-brand-700)] to-[var(--color-brand-800)] px-4 py-4 shadow-lg backdrop-blur-lg sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Feedback Dashboard</h1>
            <p className="text-xs text-white/70 sm:text-sm">Customer feedback management</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/30 p-4 text-center font-medium text-red-200">
            {error}
          </div>
        )}

        {/* Feedback Grid */}
        {feedbacks.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand-900)]/50 to-[var(--color-brand-800)]/50 p-12 text-center backdrop-blur-sm">
            <p className="text-lg text-white/70">No feedback available</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-xl bg-gradient-to-br from-[var(--color-brand-900)]/40 to-[var(--color-brand-800)]/40 p-6 backdrop-blur-sm transition-all hover:from-[var(--color-brand-900)]/60 hover:to-[var(--color-brand-800)]/60 border border-white/10"
              >
                {/* User Info */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-base font-bold text-white shadow-md">
                      {feedback.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{feedback.username}</h3>
                      <p className="text-sm text-white/60">{feedback.email}</p>
                    </div>
                  </div>
                  <div className="text-sm text-white/60 whitespace-nowrap">
                    {formatDate(feedback.created_at)}
                  </div>
                </div>

                {/* Feedback Description */}
                <div className="mb-4">
                  <p className="text-base leading-relaxed text-white/90">{feedback.description}</p>
                </div>

                {/* Image Section */}
                {feedback.image_url && (
                  <div className="mb-4">
                    <button
                      onClick={() => setSelectedImage(feedback.image_url)}
                      className="group relative cursor-pointer block w-full"
                      type="button"
                    >
                      <img
                        src={feedback.image_url}
                        alt="Feedback screenshot"
                        className="h-auto max-w-full rounded-lg border-2 border-white/20 transition-all hover:border-[var(--color-brand-400)] shadow-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-all group-hover:bg-black/50">
                        <span className="text-sm font-semibold text-white opacity-0 transition-all group-hover:opacity-100">
                          Click to view full size
                        </span>
                      </div>
                    </button>
                    <p className="mt-2 text-xs text-white/50">
                      {feedback.image_content_type} • {formatFileSize(feedback.image_size)}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-sm text-white/50">
                  <div>
                    <span className="font-medium text-white/70">Session:</span>{' '}
                    <span className="font-mono text-xs">{feedback.session_id}</span>
                  </div>
                  {feedback.device_id && (
                    <div>
                      <span className="font-medium text-white/70">Device:</span>{' '}
                      <span className="font-mono text-xs">{feedback.device_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {feedbacks.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-6">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white hover:from-[var(--color-brand-600)] hover:to-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              ← Previous
            </Button>
            <div className="rounded-lg bg-gradient-to-br from-[var(--color-brand-900)]/60 to-[var(--color-brand-800)]/60 px-6 py-2 backdrop-blur-sm border border-white/20">
              <span className="text-base font-semibold text-white">
                Page {currentPage}
              </span>
            </div>
            <Button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={feedbacks.length < itemsPerPage}
              className="bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white hover:from-[var(--color-brand-600)] hover:to-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              Next →
            </Button>
          </div>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-6xl">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-14 right-0 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-2xl font-bold text-white shadow-lg transition-all hover:from-red-600 hover:to-red-700 hover:scale-110"
              type="button"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Feedback screenshot enlarged"
              className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl border-4 border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
