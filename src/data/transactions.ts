export interface Transaction {
  id: string
  emojiBg: string
  emoji: string
  merchant: string
  date: string
  amount: string
  amountColor: string
  type: 'debit' | 'credit'
}

export const transactions: Transaction[] = [
  {
    id: '1',
    emojiBg: '#d4ecff',
    emoji: '🛒',
    merchant: 'Amazon India',
    date: '17 Feb',
    amount: '-₹1,299',
    amountColor: '#ff6b6b',
    type: 'debit',
  },
  {
    id: '2',
    emojiBg: '#ffedd4',
    emoji: '💰',
    merchant: 'Salary Credit',
    date: '15 Feb',
    amount: '+₹45,000',
    amountColor: '#22c55e',
    type: 'credit',
  },
  {
    id: '3',
    emojiBg: '#d4ecff',
    emoji: '🛒',
    merchant: 'Swiggy',
    date: '16 Feb',
    amount: '-₹450.5',
    amountColor: '#ff6b6b',
    type: 'debit',
  },
  {
    id: '4',
    emojiBg: '#f0e7ff',
    emoji: '🎬',
    merchant: 'Netflix',
    date: '14 Feb',
    amount: '-₹649',
    amountColor: '#ff6b6b',
    type: 'debit',
  },
  {
    id: '5',
    emojiBg: '#d4fff4',
    emoji: '⚡',
    merchant: 'Electricity Bill',
    date: '13 Feb',
    amount: '-₹2,150',
    amountColor: '#ff6b6b',
    type: 'debit',
  },
]
