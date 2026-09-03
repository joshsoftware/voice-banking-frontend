import { JAVA_API_BASE } from './constants'
import type { DemoCustomer } from './demoCustomer'

export class CustomerNotFoundError extends Error {
  constructor(message = 'Customer not found for this mobile number') {
    super(message)
    this.name = 'CustomerNotFoundError'
  }
}

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

function isNotFoundStatus(status: number): boolean {
  return status === 404 || status === 400
}

function looksLikeNotFoundMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('not found') || lower.includes('does not exist')
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload)
  if (!record) return fallback
  const nested = asRecord(record.error)
  const candidates = [nested?.code, record.message, record.detail, nested?.message, nested?.detail]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function isCustomerMissingResponse(payload: unknown, httpStatus: number): boolean {
  if (isNotFoundStatus(httpStatus)) return true
  const record = asRecord(payload)
  if (!record) return false
  const statusCode = typeof record.statusCode === 'number' ? record.statusCode : Number(record.statusCode)
  if (isNotFoundStatus(statusCode)) return true
  const nested = asRecord(record.error)
  const code = typeof nested?.code === 'string' ? nested.code : ''
  const message = extractErrorMessage(payload, '')
  return looksLikeNotFoundMessage(code) || looksLikeNotFoundMessage(message)
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

  const payload = (await response.json().catch(() => null)) as MockBankCustomerInfoResponse | Record<string, unknown> | null
  const message = extractErrorMessage(payload, 'Customer not found for this mobile number')

  if (!response.ok || isCustomerMissingResponse(payload, response.status)) {
    if (isCustomerMissingResponse(payload, response.status) || looksLikeNotFoundMessage(message)) {
      throw new CustomerNotFoundError(message)
    }
    throw new Error(message)
  }

  const data = asRecord(payload)?.data
  const customer = asRecord(data)
  if (!customer || !readString(customer, 'customerId', 'customer_id')) {
    throw new CustomerNotFoundError(message)
  }

  return mapMockBankCustomer(customer as unknown as MockBankCustomerInfo)
}

type ApiPayload = Record<string, unknown> | null

function readResponseMessage(payload: ApiPayload, fallback: string): string {
  if (!payload) return fallback
  const message = payload.message
  if (typeof message === 'string' && message.trim()) return message
  const detail = payload.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  return fallback
}

function unwrapData(payload: ApiPayload): unknown {
  return payload?.data ?? payload
}

function readId(payload: ApiPayload, ...keys: string[]): string | undefined {
  const root = asRecord(payload)
  const data = asRecord(unwrapData(payload))
  for (const key of keys) {
    const rootValue = root?.[key]
    if (typeof rootValue === 'string' && rootValue.trim()) return rootValue
    const dataValue = data?.[key]
    if (typeof dataValue === 'string' && dataValue.trim()) return dataValue
  }
  return undefined
}

async function postSeed<T extends Record<string, unknown>>(
  endpoint: string,
  body: T,
  fallbackError: string,
): Promise<ApiPayload> {
  const response = await fetch(`${JAVA_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      deviceId: 'false',
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as ApiPayload
  if (!response.ok) {
    throw new Error(readResponseMessage(payload, fallbackError))
  }
  return payload
}

export interface RegistrationResult {
  customerId: string
  accountId: string
}

export async function createCustomerWithDefaultProducts(name: string, phone: string): Promise<RegistrationResult> {
  const mobileNumber = normalizePhone(phone)
  const customerPayload = await postSeed(
    '/customers/create',
    { name: name.trim(), mobileNumber },
    'Failed to create customer',
  )
  const customerId =
    readId(customerPayload, 'customerId', 'customer_id', 'id', 'cif') ??
    readId(asRecord(unwrapData(customerPayload))?.customer as ApiPayload, 'customerId', 'customer_id', 'id', 'cif')

  if (!customerId) {
    throw new Error('Customer created but customerId was not returned')
  }

  const accountPayload = await postSeed(
    '/accounts/create-savings',
    { customerId },
    'Failed to create savings account',
  )
  const accountId = readId(accountPayload, 'accountId', 'account_id', 'id', 'accountNumber')
  if (!accountId) {
    throw new Error('Savings account created but accountId was not returned')
  }

  await postSeed('/transactions/create-month', { accountId }, 'Failed to seed transactions')
  await createDefaultBeneficiary(customerId)
  await postSeed('/loans/create', { customerId }, 'Failed to create loan details')
  await postSeed('/fixed-deposits/create', { customerId }, 'Failed to create FD details')
  await postSeed('/recurring-deposits/create', { customerId }, 'Failed to create RD details')

  return { customerId, accountId }
}

async function createDefaultBeneficiary(customerId: string): Promise<void> {
  const endpoints = ['/beneficiaries/add-random', '/beneficiaries/create']
  for (const endpoint of endpoints) {
    try {
      await postSeed(endpoint, { customerId }, 'Failed to add beneficiary')
      return
    } catch (error) {
      if (endpoint === endpoints[endpoints.length - 1]) {
        console.warn('Beneficiary creation skipped:', error)
      }
    }
  }
}
