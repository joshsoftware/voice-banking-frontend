import { useState, useEffect } from 'react'
import { EyeIcon } from '@/components/ui/icons'
import { useTranslation } from '@/i18n/LanguageHooks'
import type { DemoAccount } from '@/lib/demoCustomer'
import { API_BASE } from '@/lib/constants'
import { balanceApi } from '@/lib/balanceApi'
import ArrowIcon from '@/assets/arrow.svg?react'

interface BalanceCardProps {
  account?: DemoAccount | null
}

interface TransactionItem {
  transactionId?: string
  amount?: number
  transactionAmount?: number
  date?: string
  transactionDate?: string
  type?: string
  transactionType?: string
  description?: string
  narration?: string
}

interface TransactionsResponse {
  transactions?: TransactionItem[]
  transactionList?: TransactionItem[]
  data?: {
    transactions?: TransactionItem[]
    transactionList?: TransactionItem[]
  } | TransactionItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTransactionDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function getTransactionList(response: TransactionsResponse): TransactionItem[] {
  const nestedData = Array.isArray(response.data) ? undefined : response.data
  const candidate =
    response.transactions ??
    response.transactionList ??
    nestedData?.transactions ??
    nestedData?.transactionList ??
    (Array.isArray(response.data) ? response.data : [])

  return Array.isArray(candidate) ? candidate : []
}

function toTimestamp(tx: TransactionItem) {
  const raw = tx.transactionDate ?? tx.date
  const parsed = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(parsed) ? 0 : parsed
}

function forceLogoutOnUnauthorized() {
  localStorage.removeItem('voicebank.access_token')
  localStorage.removeItem('voicebank.refresh_token')
  localStorage.removeItem('voicebank.auth_session_id')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  Object.keys(localStorage)
    .filter((key) => key.startsWith('voicebank.chatHistory'))
    .forEach((key) => localStorage.removeItem(key))
  window.location.href = '/welcome'
}

export function BalanceCard({ account }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [showTransactions, setShowTransactions] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const { t } = useTranslation()
  const balanceValue = balance ?? account?.balance ?? 45250.75
  const accountTypeLabel = account?.account_type === 'CURRENT' ? 'Current Account' : t('savingsAccount')
  const maskedAccount = account ? `****${account.account_id.slice(-4)}` : '****7890'
  const fetchBalanceData = async () => {
    if (!account?.account_id || !account?.customer_id) {
      setBalanceError('Account information not available')
      return
    }

    setBalanceLoading(true)
    setBalanceError(null)

    try {
      const fetchedBalance = await balanceApi.fetchBalance(account.customer_id, account.account_id)
      setBalance(fetchedBalance)
    } catch (e: any) {
      setBalanceError(e?.message || 'Failed to fetch balance')
      // Keep using fallback balance from account prop
    } finally {
      setBalanceLoading(false)
    }
  }

  // Fetch balance on component mount
  useEffect(() => {
    void fetchBalanceData()
  }, [account?.account_id, account?.customer_id])

  const handleToggleBalance = async () => {
    // If showing balance, fetch fresh data
    if (!showBalance) {
      await fetchBalanceData()
    }
    setShowBalance(!showBalance)
  }
  const handleViewDetails = async () => {
    if (!account?.account_id) {
      setTransactionsError('Account is not available.')
      setShowTransactions(true)
      return
    }

    if (showTransactions) return

    if (transactions.length > 0 && !transactionsError) {
      setShowTransactions(true)
      return
    }

    setLoadingTransactions(true)
    setTransactionsError(null)
    setShowTransactions(true)

    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(toDate.getDate() - 90)

    const payload = {
      accountId: account.account_id,
      fromDate: fromDate.toISOString().slice(0, 10),
      page: 0,
      size: 5,
    }

    try {
      const accessToken = localStorage.getItem('voicebank.access_token')
      const response = await fetch(`${API_BASE}/api/transactions/recent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        forceLogoutOnUnauthorized()
        return
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const detail = (err as { message?: string; detail?: string }).message || (err as { detail?: string }).detail
        throw new Error(detail || `Failed to fetch transactions (${response.status})`)
      }

      const data = (await response.json()) as TransactionsResponse
      const list = getTransactionList(data)
      const latestFive = [...list].sort((a, b) => toTimestamp(b) - toTimestamp(a)).slice(0, 5)
      setTransactions(latestFive)
    } catch (e: any) {
      setTransactions([])
      setTransactionsError(e?.message || 'Could not fetch transactions.')
    } finally {
      setLoadingTransactions(false)
    }
  }

  return (
    <div className="relative mx-auto mt-10 w-full max-w-[345px] overflow-hidden rounded-[32px] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)] md:mt-12">
      {/* Card content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-1)]">{t('availableBalance')}</div>
          <button
            type="button"
            aria-label={showBalance ? t('ariaHideBalance') : t('ariaShowBalance')}
            onClick={() => void handleToggleBalance()}
            disabled={balanceLoading}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <EyeIcon className="size-5 text-[var(--color-brand-900)]/60" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-1.5">
          <div className="text-[30px] font-bold leading-tight tracking-tight text-[var(--color-brand-900)]">
            {balanceLoading ? (
              <span className="text-[var(--color-text-muted-2)]">Loading...</span>
            ) : showBalance ? (
              formatCurrency(balanceValue)
            ) : (
              '₹••••••'
            )}
          </div>
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-2)]">
            {accountTypeLabel}
            {balanceError && showBalance && (
              <span className="ml-2 text-xs text-red-600" title={balanceError}>
                (using cached)
              </span>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="text-sm font-medium leading-5 text-[var(--color-text-muted-3)]">{maskedAccount}</div>
          <button
            type="button"
            onClick={() => void handleViewDetails()}
            className="rounded-xl px-4 py-2 text-sm font-semibold leading-5 text-[var(--color-brand-300)] transition-colors hover:bg-gray-50"
          >
            {t('recentTransactions')}
          </button>
        </div>

        {showTransactions ? (
          <div className="mt-4 rounded-xl bg-[var(--color-surface-app)] p-3">
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                aria-label="Collapse recent transactions"
                onClick={() => setShowTransactions(false)}
                className="rounded-md p-1 text-[var(--color-brand-300)] transition-colors hover:bg-white"
              >
                <ArrowIcon className="size-4" />
              </button>
            </div>
            {loadingTransactions ? (
              <div className="text-xs text-[var(--color-text-muted-2)]">Loading transactions...</div>
            ) : transactionsError ? (
              <div className="text-xs text-red-600">{transactionsError}</div>
            ) : transactions.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted-2)]">No transactions found.</div>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto mobile-scroll pr-1">
                {transactions.map((tx, idx) => {
                  const amount = tx.amount ?? tx.transactionAmount ?? 0
                  const date = formatTransactionDate(tx.date ?? tx.transactionDate)
                  const type = tx.type ?? tx.transactionType ?? 'TXN'
                  const desc = tx.description ?? tx.narration ?? tx.transactionId ?? `Transaction ${idx + 1}`
                  return (
                    <div
                      key={tx.transactionId ?? `${date}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs font-medium text-[var(--color-brand-900)]">{desc}</div>
                        <div className="text-[10px] text-[var(--color-text-muted-2)]">
                          {type} • {date}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-[var(--color-brand-900)]">
                        {formatCurrency(Number(amount))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
