import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SVGProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DemoAccount } from '@/lib/customerData'

vi.mock('@/assets/arrow.svg?react', () => ({
  default: (props: SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />,
}))

vi.mock('@/i18n/LanguageHooks', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        availableBalance: 'Available Balance',
        savingsAccount: 'Savings Account',
        recentTransactions: 'Recent Transactions',
        ariaHideBalance: 'Hide balance',
        ariaShowBalance: 'Show balance',
      })[key] ?? key,
  }),
}))

vi.mock('@/lib/balanceApi', () => ({
  balanceApi: {
    fetchBalance: vi.fn(),
  },
}))

import { balanceApi } from '@/lib/balanceApi'
import { BalanceCard } from '../BalanceCard'

const account: DemoAccount = {
  account_type: 'SAVINGS',
  account_id: 'ACC1234567890',
  balance: 45250.75,
  status: 'ACTIVE',
  overdraft_limit: 0,
  interest_rate: 3.5,
  minimum_balance: 1000,
  customer_id: 'CUSTOMER-1',
}

describe('BalanceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(balanceApi.fetchBalance).mockResolvedValue(98765.43)
  })

  it('masks account number and balance by default', async () => {
    render(<BalanceCard account={account} />)

    expect(screen.getByText('****7890')).toBeInTheDocument()
    expect(screen.queryByText(account.account_id)).not.toBeInTheDocument()
    expect(await screen.findByText('₹••••••')).toBeInTheDocument()
    expect(screen.queryByText(/45,250\.75/)).not.toBeInTheDocument()
  })

  it('reveals balance only after the user requests it', async () => {
    const user = userEvent.setup()

    render(<BalanceCard account={account} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show balance/i })).toBeEnabled()
    })
    await user.click(screen.getByRole('button', { name: /show balance/i }))

    await waitFor(() => {
      expect(screen.getByText(/98,765\.43/)).toBeInTheDocument()
    })
    expect(balanceApi.fetchBalance).toHaveBeenCalledWith('CUSTOMER-1', 'ACC1234567890')
  })
})

