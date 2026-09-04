import { API_BASE } from './constants';

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
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, accountId }),
      });
    } catch {
      throw new Error('Unable to connect to the banking server. Please check your connection and try again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const msg =
        error.error?.message ||
        error.detail ||
        (response.status >= 500
          ? "We're unable to retrieve your account balance right now. Please try again in a moment."
          : 'Failed to fetch balance');
      throw new Error(msg);
    }

    const data: BalanceResponse = await response.json();
    return data.balance;
  },
};
