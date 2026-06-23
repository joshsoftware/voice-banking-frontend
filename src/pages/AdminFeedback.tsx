import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '@/contexts/AdminContext'
import { feedbackApi } from '@/lib/feedbackApi'
import type { Feedback } from '@/lib/feedbackApi'
import { Button } from '@/components/ui/button'
import { FeedbackDetailModal } from '@/components/admin/FeedbackDetailModal'

export default function AdminFeedback() {
  const { isAdminAuthenticated, logout } = useAdmin()
  const navigate = useNavigate()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
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

  // Filter feedbacks based on search query
  const filteredFeedbacks = useMemo(() => {
    if (!searchQuery.trim()) return feedbacks
    
    const query = searchQuery.toLowerCase()
    return feedbacks.filter(
      (feedback) =>
        feedback.username.toLowerCase().includes(query) ||
        feedback.email.toLowerCase().includes(query)
    )
  }, [feedbacks, searchQuery])

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
            data-testid="admin-logout-btn"
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-gradient-to-br from-[var(--color-brand-900)]/40 to-[var(--color-brand-800)]/40 backdrop-blur-sm border border-white/20 px-3 py-2.5 pl-10 sm:px-4 sm:py-3 sm:pl-11 text-sm sm:text-base text-white placeholder:text-white/50 outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/20 transition-all"
            />
            <svg
              className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {/* Results count */}
          {searchQuery && (
            <p className="mt-2 text-sm text-white/60">
              Showing {filteredFeedbacks.length} of {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/30 p-4 text-center font-medium text-red-200">
            {error}
          </div>
        )}

        {/* Feedback List */}
        {filteredFeedbacks.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand-900)]/50 to-[var(--color-brand-800)]/50 p-12 text-center backdrop-blur-sm">
            <p className="text-lg text-white/70">
              {searchQuery ? 'No feedback found matching your search' : 'No feedback available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className="group rounded-xl bg-gradient-to-br from-[var(--color-brand-900)]/40 to-[var(--color-brand-800)]/40 p-3 sm:p-5 backdrop-blur-sm transition-all hover:from-[var(--color-brand-900)]/60 hover:to-[var(--color-brand-800)]/60 border border-white/10 hover:border-white/30 cursor-pointer hover:shadow-lg hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-xs sm:text-sm font-bold text-white shadow-md shrink-0">
                    {feedback.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm sm:text-base mb-0.5">
                          {feedback.username}
                        </h3>
                        <p className="text-xs sm:text-sm text-white/60 break-all">{feedback.email}</p>
                      </div>
                      <div className="text-xs text-white/50 whitespace-nowrap sm:mt-0">
                        {formatDate(feedback.created_at)}
                      </div>
                    </div>

                    {/* Description preview */}
                    <p className="text-xs sm:text-sm leading-relaxed text-white/80 mt-1.5 sm:mt-2 line-clamp-2 min-h-[2.5rem]">
                      {feedback.description}
                    </p>

                    {/* Image indicator */}
                    {feedback.image_url && (
                      <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
                        <svg
                          className="size-3 sm:size-4 text-white/50"
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
                        <span className="text-xs text-white/50"><span className="hidden sm:inline">Has </span>Screenshot</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="shrink-0 self-center hidden sm:block">
                    <svg
                      className="size-5 text-white/40 group-hover:text-white/70 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {feedbacks.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              data-testid="admin-feedback-prev-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white hover:from-[var(--color-brand-600)] hover:to-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium transition-all"
            >
              ← Previous
            </button>
            <div className="rounded-lg bg-gradient-to-br from-[var(--color-brand-900)]/60 to-[var(--color-brand-800)]/60 px-4 py-2 backdrop-blur-sm border border-white/20 min-w-[50px] flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {currentPage}
              </span>
            </div>
            <button
              data-testid="admin-feedback-next-btn"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={feedbacks.length < itemsPerPage}
              className="rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white hover:from-[var(--color-brand-600)] hover:to-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
        />
      )}
    </div>
  )
}
