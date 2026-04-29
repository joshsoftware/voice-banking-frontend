import { AUTH_API_BASE } from './constants';

export interface BalanceResponse {
  balance: number;
}

export const balanceApi = {
  /**
   * Fetch account balance for a customer
   * @param customerId - Customer ID (e.g., CIF202602260001)
   * @param accountId - Account ID (e.g., ACC202602260001)
   * @returns Promise with balance amount
   */
  async fetchBalance(customerId: string, accountId: string): Promise<number> {
    const response = await fetch(`${AUTH_API_BASE}/api/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, accountId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch balance' }));
      throw new Error(error.detail || `Failed to fetch balance (${response.status})`);
    }

    const data: BalanceResponse = await response.json();
    return data.balance;
  },
};
