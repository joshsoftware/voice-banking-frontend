import { transactions } from '@/data/transactions'
import type { Transaction } from '@/data/transactions'

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <div className="w-full rounded-2xl border border-[#e1e8ed] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4 px-4 py-4">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: transaction.emojiBg }}
        >
          <div className="text-xl leading-7 text-[#1a1f36]">{transaction.emoji}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-5 text-[#1a476a]">
            {transaction.merchant}
          </div>
          <div className="text-xs leading-4 text-[#334155]">{transaction.date}</div>
        </div>
        <div
          className="shrink-0 text-right text-base font-semibold leading-6"
          style={{ color: transaction.amountColor }}
        >
          {transaction.amount}
        </div>
      </div>
    </div>
  )
}

export function TransactionList() {
  return (
    <section className="bg-[#f5f7fa] px-6 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold leading-7 text-[#1a476a]">Recent Transactions</h2>
        <button
          type="button"
          className="rounded-[14px] px-2.5 py-2 text-sm font-medium leading-5 text-[#2072b2] transition-colors hover:bg-white/50"
        >
          View All
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 pb-6">
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </section>
  )
}
