import { JAVA_API_BASE } from './constants'
import type { DemoCustomer } from './demoCustomer'

export interface MockBankCustomerInfo {
  createdDate: string
  customerId: string
  dateOfBirth: string
  email: string
  kycStatus: string
  mobileNumber: string
  name: string
  status: string
  updatedDate: string
}

export interface MockBankCustomerInfoResponse {
  data: MockBankCustomerInfo
  message: string
  status: string
  statusCode: number
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

export function mapMockBankCustomer(info: MockBankCustomerInfo): DemoCustomer {
  return {
    customer_id: info.customerId,
    email: info.email,
    kyc_status: info.kycStatus,
    created_at: info.createdDate,
    date_of_birth: info.dateOfBirth,
    mobile_number: normalizePhone(info.mobileNumber),
    name: info.name,
    status: info.status,
  }
}

export interface BankAccount {
  account_type: 'SAVINGS' | 'CURRENT'
  account_id: string
  balance?: number
  customer_id: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  }
  return undefined
}

function mapBankAccount(raw: unknown, customerId: string): BankAccount | null {
  const record = asRecord(raw)
  if (!record) return null
  const accountId = readString(record, 'accountId', 'account_id', 'accountNumber', 'account_number')
  if (!accountId) return null
  const typeRaw = (readString(record, 'accountType', 'account_type', 'type') ?? 'SAVINGS').toUpperCase()
  return {
    account_id: accountId,
    account_type: typeRaw.includes('CURRENT') ? 'CURRENT' : 'SAVINGS',
    balance: readNumber(record, 'balance', 'availableBalance', 'available_balance'),
    customer_id: readString(record, 'customerId', 'customer_id') ?? customerId,
  }
}

function extractAccountList(payload: unknown): unknown[] {
  const root = asRecord(payload)
  const data = root?.data
  if (Array.isArray(data)) return data
  const dataRecord = asRecord(data)
  const nested =
    dataRecord?.accounts ??
    dataRecord?.accountList ??
    dataRecord?.account_list ??
    root?.accounts ??
    root?.accountList
  return Array.isArray(nested) ? nested : []
}

export function pickPrimaryAccount(accounts: BankAccount[]): BankAccount | null {
  return accounts.find((account) => account.account_type === 'SAVINGS') ?? accounts[0] ?? null
}

/** Account ids from mock-bank Java. Balance/transactions still use the Python APIs. */
export async function fetchAccountsForCustomer(customerId: string): Promise<BankAccount[]> {
  const response = await fetch(`${JAVA_API_BASE}/accounts/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      deviceId: 'false',
    },
    body: JSON.stringify({ customerId }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const record = asRecord(payload)
    const message =
      (typeof record?.message === 'string' && record.message) ||
      (typeof record?.detail === 'string' && record.detail) ||
      'Accounts not found for this customer'
    throw new Error(message)
  }

  return extractAccountList(payload)
    .map((item) => mapBankAccount(item, customerId))
    .filter((item): item is BankAccount => item !== null)
}

export async function fetchCustomerByPhone(phone: string): Promise<DemoCustomer> {
  const mobileNumber = normalizePhone(phone)
  const response = await fetch(`${JAVA_API_BASE}/customers/info/phone-number`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      deviceId: 'false',
    },
    body: JSON.stringify({ mobileNumber }),
  })

  const payload = (await response.json().catch(() => null)) as MockBankCustomerInfoResponse | { message?: string; detail?: string } | null

  if (!response.ok) {
    const message =
      (payload && 'message' in payload && payload.message) ||
      (payload && 'detail' in payload && payload.detail) ||
      'Customer not found for this mobile number'
    throw new Error(message)
  }

  if (!payload || !('data' in payload) || !payload.data?.customerId) {
    throw new Error(
      (payload && 'message' in payload && payload.message) ||
        'Customer not found for this mobile number',
    )
  }

  return mapMockBankCustomer(payload.data)
}
