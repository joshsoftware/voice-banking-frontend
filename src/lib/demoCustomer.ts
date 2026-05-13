import { getDeviceId } from './device'

export interface DemoCustomer {
  customer_id: string
  email: string
  kyc_status: string
  created_at: string
  date_of_birth: string
  mobile_number: string
  name: string
  status: string
  voice_customer_id?: string // Stable backend identity for voiceprint
  base_customer_id?: string // Base customer ID from backend
  is_voice_registered?: boolean // Registration status flag from backend
}

export interface DemoAccount {
  account_type: 'SAVINGS' | 'CURRENT'
  account_id: string
  balance: number
  status: string
  overdraft_limit: number
  interest_rate: number
  minimum_balance: number
  customer_id: string
}

export interface DemoLoanAccount {
  account_id: string
  account_status: string
  created_at: string
  emi: string
  interest_rate: number
  loan_amount: number
  loan_tenure: string
  loan_type: string
  product_name: string
  sanction_date: string
  sanction_loan_amount: string
  scheme_name: string
  updated_at: string
  customer_id: string
}

const ACTIVE_CUSTOMER_STORAGE_KEY = 'voicebank.activeCustomerId'
const VOICE_REGISTERED_CUSTOMERS_STORAGE_KEY = 'voicebank.voiceRegisteredCustomers'
const VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY = 'voicebank.voiceSkipAllowedCustomers'
const DYNAMIC_PHONE_TO_CUSTOMER_ID_STORAGE_KEY = 'voicebank.dynamicPhoneToCustomerId'
const DYNAMIC_PHONE_ASSIGNMENT_ORDER_STORAGE_KEY = 'voicebank.dynamicPhoneAssignmentOrder'
const PHONE_TO_CUSTOMER_PERSISTENT_STORAGE_KEY = 'voicebank.phoneToCustomerPersistent'

const CUSTOMERS: DemoCustomer[] = [
  { customer_id: 'CIF202602260001', email: 'amit.sharma@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1990-05-21', mobile_number: '9876543213', name: 'Amit Sharma', status: 'ACTIVE' },
  { customer_id: 'CIF202602260002', email: 'priya.singh@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1988-08-15', mobile_number: '9123456780', name: 'Priya Singh', status: 'ACTIVE' },
  { customer_id: 'CIF202602260003', email: 'rahul.verma@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1992-02-10', mobile_number: '9988776655', name: 'Rahul Verma', status: 'ACTIVE' },
  { customer_id: 'CIF202602260004', email: 'neha.gupta@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1995-11-03', mobile_number: '9811122233', name: 'Neha Gupta', status: 'ACTIVE' },
  { customer_id: 'CIF202602260005', email: 'rohit.mehta@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1987-01-19', mobile_number: '9898989898', name: 'Rohit Mehta', status: 'ACTIVE' },
  { customer_id: 'CIF202602260006', email: 'ananya.iyer@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1994-07-12', mobile_number: '9445566778', name: 'Ananya Iyer', status: 'ACTIVE' },
  { customer_id: 'CIF202602260007', email: 'suresh.patel@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1985-03-27', mobile_number: '9723456789', name: 'Suresh Patel', status: 'ACTIVE' },
  { customer_id: 'CIF202602260008', email: 'pooja.nair@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1991-09-09', mobile_number: '9632587410', name: 'Pooja Nair', status: 'ACTIVE' },
  { customer_id: 'CIF202602260009', email: 'karan.malhotra@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1989-12-01', mobile_number: '9911223344', name: 'Karan Malhotra', status: 'ACTIVE' },
  { customer_id: 'CIF202602260010', email: 'sneha.kulkarni@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-02-26T07:15:16.424Z', date_of_birth: '1993-04-18', mobile_number: '9765432109', name: 'Sneha Kulkarni', status: 'ACTIVE' },
  { customer_id: 'CIF202602260011', email: 'pooja.patil@gmail.com', kyc_status: 'VERIFIED', created_at: '2026-03-31T07:15:16.424Z', date_of_birth: '1998-09-11', mobile_number: '9632580810', name: 'Pooja Patil', status: 'ACTIVE' },
]

const ACCOUNTS: DemoAccount[] = [
  { account_type: 'CURRENT', account_id: 'ACC202602260002', balance: 250000, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 7.2, minimum_balance: 0, customer_id: 'CIF202602260001' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260003', balance: 98350.4, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: 'CIF202602260002' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260004', balance: 18200, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3, minimum_balance: 1000, customer_id: 'CIF202602260003' },
  { account_type: 'CURRENT', account_id: 'ACC202602260005', balance: 562340.9, status: 'ACTIVE', overdraft_limit: 100000, interest_rate: 0, minimum_balance: 10000, customer_id: 'CIF202602260003' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260006', balance: 7350.25, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3, minimum_balance: 1000, customer_id: 'CIF202602260004' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260007', balance: 125400, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: 'CIF202602260005' },
  { account_type: 'CURRENT', account_id: 'ACC202602260008', balance: 500000, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 7.5, minimum_balance: 0, customer_id: 'CIF202602260005' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260009', balance: 21450.8, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3, minimum_balance: 1000, customer_id: 'CIF202602260006' },
  { account_type: 'CURRENT', account_id: 'ACC202602260010', balance: 342150.6, status: 'ACTIVE', overdraft_limit: 150000, interest_rate: 0, minimum_balance: 10000, customer_id: 'CIF202602260007' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260011', balance: 44800.1, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: 'CIF202602260008' },
  { account_type: 'CURRENT', account_id: 'ACC202602260012', balance: 150000, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 6.9, minimum_balance: 0, customer_id: 'CIF202602260008' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260013', balance: 65990.55, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3, minimum_balance: 1000, customer_id: 'CIF202602260009' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260014', balance: 30200, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: 'CIF202602260010' },
  { account_type: 'CURRENT', account_id: 'ACC202602260015', balance: 189000.75, status: 'ACTIVE', overdraft_limit: 50000, interest_rate: 0, minimum_balance: 10000, customer_id: 'CIF202602260010' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260016', balance: 550000, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 6.8, minimum_balance: 10000, customer_id: 'CIF202602260011' },
  { account_type: 'SAVINGS', account_id: 'ACC202602260001', balance: 43780.75, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: 'CIF202602260001' },
]

const LOANS: DemoLoanAccount[] = [
  { account_id: 'LN10001', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '15000', interest_rate: 7.5, loan_amount: 500000, loan_tenure: '240', loan_type: 'HOME_LOAN', product_name: 'Dream Home Loan', sanction_date: '2022-01-10', sanction_loan_amount: '500000', scheme_name: 'HOME_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260001' },
  { account_id: 'LN10002', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '8000', interest_rate: 12.5, loan_amount: 200000, loan_tenure: '60', loan_type: 'PERSONAL_LOAN', product_name: 'Quick Cash Loan', sanction_date: '2023-06-15', sanction_loan_amount: '200000', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260001' },
  { account_id: 'LN10003', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '9000', interest_rate: 9, loan_amount: 300000, loan_tenure: '84', loan_type: 'CAR_LOAN', product_name: 'Auto Loan', sanction_date: '2021-09-20', sanction_loan_amount: '300000', scheme_name: 'CAR_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260002' },
  { account_id: 'LN10004', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '22000', interest_rate: 7.2, loan_amount: 800000, loan_tenure: '300', loan_type: 'HOME_LOAN', product_name: 'Premium Home Loan', sanction_date: '2020-05-12', sanction_loan_amount: '800000', scheme_name: 'HOME_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260003' },
  { account_id: 'LN10005', account_status: 'CLOSED', created_at: '2026-03-24T12:22:42.794Z', emi: '7000', interest_rate: 13, loan_amount: 150000, loan_tenure: '48', loan_type: 'PERSONAL_LOAN', product_name: 'Instant Loan', sanction_date: '2022-11-01', sanction_loan_amount: '150000', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260003' },
  { account_id: 'LN10006', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '4000', interest_rate: 10.5, loan_amount: 100000, loan_tenure: '36', loan_type: 'EDUCATION_LOAN', product_name: 'Study Loan', sanction_date: '2023-02-18', sanction_loan_amount: '100000', scheme_name: 'EDUCATION_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260004' },
  { account_id: 'LN10007', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '18000', interest_rate: 7.8, loan_amount: 600000, loan_tenure: '240', loan_type: 'HOME_LOAN', product_name: 'Home Advantage Loan', sanction_date: '2019-07-25', sanction_loan_amount: '600000', scheme_name: 'HOME_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260005' },
  { account_id: 'LN10008', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '10000', interest_rate: 8.9, loan_amount: 250000, loan_tenure: '72', loan_type: 'CAR_LOAN', product_name: 'Car Loan Plus', sanction_date: '2021-03-14', sanction_loan_amount: '250000', scheme_name: 'CAR_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260005' },
  { account_id: 'LN10009', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '6000', interest_rate: 12, loan_amount: 120000, loan_tenure: '36', loan_type: 'PERSONAL_LOAN', product_name: 'Flexi Loan', sanction_date: '2024-01-01', sanction_loan_amount: '120000', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260005' },
  { account_id: 'LN10010', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '14000', interest_rate: 7.6, loan_amount: 400000, loan_tenure: '180', loan_type: 'HOME_LOAN', product_name: 'Smart Home Loan', sanction_date: '2022-08-30', sanction_loan_amount: '400000', scheme_name: 'HOME_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260006' },
  { account_id: 'LN10011', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '12000', interest_rate: 11, loan_amount: 350000, loan_tenure: '120', loan_type: 'BUSINESS_LOAN', product_name: 'SME Loan', sanction_date: '2020-12-05', sanction_loan_amount: '350000', scheme_name: 'BUSINESS_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260007' },
  { account_id: 'LN10012', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '4500', interest_rate: 13.5, loan_amount: 100000, loan_tenure: '24', loan_type: 'PERSONAL_LOAN', product_name: 'Express Loan', sanction_date: '2023-04-10', sanction_loan_amount: '100000', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260007' },
  { account_id: 'LN10013', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '8500', interest_rate: 9.5, loan_amount: 200000, loan_tenure: '60', loan_type: 'CAR_LOAN', product_name: 'Auto Loan Basic', sanction_date: '2021-01-11', sanction_loan_amount: '200000', scheme_name: 'CAR_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260008' },
  { account_id: 'LN10014', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '25000', interest_rate: 7.1, loan_amount: 900000, loan_tenure: '300', loan_type: 'HOME_LOAN', product_name: 'Elite Home Loan', sanction_date: '2018-10-22', sanction_loan_amount: '900000', scheme_name: 'HOME_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260009' },
  { account_id: 'LN10015', account_status: 'CLOSED', created_at: '2026-03-24T12:22:42.794Z', emi: '7500', interest_rate: 12.8, loan_amount: 180000, loan_tenure: '48', loan_type: 'PERSONAL_LOAN', product_name: 'Quick Personal Loan', sanction_date: '2022-02-14', sanction_loan_amount: '180000', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260009' },
  { account_id: 'LN10016', account_status: 'ACTIVE', created_at: '2026-03-24T12:22:42.794Z', emi: '9000', interest_rate: 10, loan_amount: 220000, loan_tenure: '48', loan_type: 'EDUCATION_LOAN', product_name: 'Higher Study Loan', sanction_date: '2023-09-01', sanction_loan_amount: '220000', scheme_name: 'EDUCATION_LOAN_SCHEME', updated_at: '2026-03-24T12:22:42.794Z', customer_id: 'CIF202602260010' },
]

function getTopCustomersByRelationships(limit = 3): string[] {
  const counts = new Map<string, number>()
  for (const account of ACCOUNTS) {
    counts.set(account.customer_id, (counts.get(account.customer_id) ?? 0) + 1)
  }
  for (const loan of LOANS) {
    counts.set(loan.customer_id, (counts.get(loan.customer_id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([customerId]) => customerId)
}

const TOP_3_CUSTOMER_IDS = getTopCustomersByRelationships(3)

// Explicit demo mapping only for top-3 account-rich customers.
const PHONE_TO_CUSTOMER_ID: Record<string, string> = {
  '9000000001': TOP_3_CUSTOMER_IDS[0] ?? 'CIF202602260005',
  '9000000002': TOP_3_CUSTOMER_IDS[1] ?? 'CIF202602260001',
  '9000000003': TOP_3_CUSTOMER_IDS[2] ?? 'CIF202602260003',
  '9000000005': 'CIF202602260005',
  // Exact table numbers for top-3 customers
  '9898989898': 'CIF202602260005',
  '9876543213': 'CIF202602260001',
  '9988776655': 'CIF202602260003',
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function getPersistentPhoneToCustomerMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PHONE_TO_CUSTOMER_PERSISTENT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [phone, customerId]) => {
      if (typeof phone === 'string' && typeof customerId === 'string') acc[phone] = customerId
      return acc
    }, {})
  } catch {
    return {}
  }
}

function setPersistentPhoneToCustomerMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(PHONE_TO_CUSTOMER_PERSISTENT_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage issues
  }
}

function buildDynamicMapKey(phone: string, deviceId?: string): string {
  const normalizedPhone = normalizePhone(phone)
  return `${normalizedPhone}:${deviceId ?? ''}`
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getDeterministicCustomerId(phone: string, deviceId: string | undefined, eligibleIds: string[]) {
  if (!eligibleIds.length) return null
  const key = buildDynamicMapKey(phone, deviceId)
  const idx = hashString(key) % eligibleIds.length
  return eligibleIds[idx] ?? null
}

function getDynamicPhoneToCustomerMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DYNAMIC_PHONE_TO_CUSTOMER_ID_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [phone, customerId]) => {
      if (typeof phone === 'string' && typeof customerId === 'string') acc[phone] = customerId
      return acc
    }, {})
  } catch {
    return {}
  }
}

function setDynamicPhoneToCustomerMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(DYNAMIC_PHONE_TO_CUSTOMER_ID_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage issues
  }
}

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getOrBuildDynamicAssignmentOrder(eligibleIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(DYNAMIC_PHONE_ASSIGNMENT_ORDER_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const validParsed = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && eligibleIds.includes(id))
      : []
    if (validParsed.length) return validParsed
  } catch {
    // ignore parse/storage issues and rebuild below
  }

  const shuffled = shuffleIds(eligibleIds)
  try {
    localStorage.setItem(DYNAMIC_PHONE_ASSIGNMENT_ORDER_STORAGE_KEY, JSON.stringify(shuffled))
  } catch {
    // ignore storage issues
  }
  return shuffled
}

function setDynamicAssignmentOrder(ids: string[]): void {
  try {
    localStorage.setItem(DYNAMIC_PHONE_ASSIGNMENT_ORDER_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage issues
  }
}

function getCustomerById(customerId: string): DemoCustomer | null {
  return CUSTOMERS.find((c) => c.customer_id === customerId) ?? null
}

export function findCustomerByPhone(phone: string, deviceId?: string): DemoCustomer | null {
  const normalized = normalizePhone(phone)
  const mappedCustomerId = PHONE_TO_CUSTOMER_ID[normalized]
  if (mappedCustomerId) {
    return getCustomerById(mappedCustomerId)
  }

  // Highest-priority persisted mapping: once a phone gets a customer, keep it.
  const persistentMap = getPersistentPhoneToCustomerMap()
  const persistentCustomerId = persistentMap[normalized]
  if (persistentCustomerId) {
    return getCustomerById(persistentCustomerId)
  }

  // For any other phone number, dynamically assign customers in shuffled order
  // (excluding the top-3 explicitly mapped customers).
  const eligibleCustomers = CUSTOMERS.filter((c) => !TOP_3_CUSTOMER_IDS.includes(c.customer_id))
  if (!eligibleCustomers.length) return CUSTOMERS[0] ?? null

  const dynamicMap = getDynamicPhoneToCustomerMap()
  const compositeKey = buildDynamicMapKey(phone, deviceId)
  const existingDynamicCustomerId = dynamicMap[compositeKey] ?? dynamicMap[normalized]
  if (existingDynamicCustomerId) {
    // Backfill composite key for older phone-only entries.
    if (!dynamicMap[compositeKey]) {
      dynamicMap[compositeKey] = existingDynamicCustomerId
      setDynamicPhoneToCustomerMap(dynamicMap)
    }
    return getCustomerById(existingDynamicCustomerId)
  }

  const eligibleIds = eligibleCustomers.map((c) => c.customer_id)
  const assignedCustomerId =
    getDeterministicCustomerId(phone, deviceId, eligibleIds) ??
    getOrBuildDynamicAssignmentOrder(eligibleIds)[0] ??
    eligibleCustomers[0]?.customer_id
  if (!assignedCustomerId) return eligibleCustomers[0] ?? null
  dynamicMap[compositeKey] = assignedCustomerId
  dynamicMap[normalized] = assignedCustomerId
  setDynamicPhoneToCustomerMap(dynamicMap)

  const persistentUpdated = getPersistentPhoneToCustomerMap()
  persistentUpdated[normalized] = assignedCustomerId
  setPersistentPhoneToCustomerMap(persistentUpdated)

  const assignmentOrder = getOrBuildDynamicAssignmentOrder(eligibleIds)
  if (assignmentOrder.length) {
    const remaining = assignmentOrder.filter((id) => id !== assignedCustomerId)
    const nextOrder = [...remaining, assignedCustomerId]
    setDynamicAssignmentOrder(nextOrder)
  }

  return getCustomerById(assignedCustomerId)
}

export function getAccountsForCustomer(customerId: string): DemoAccount[] {
  return ACCOUNTS.filter((a) => a.customer_id === customerId)
}

export function getPrimaryAccount(customerId: string): DemoAccount | null {
  const accounts = getAccountsForCustomer(customerId)
  return accounts.find((a) => a.account_type === 'SAVINGS') ?? accounts[0] ?? null
}

export function getLoanAccountsForCustomer(customerId: string): DemoLoanAccount[] {
  return LOANS.filter((loan) => loan.customer_id === customerId)
}

export function getPrimaryLoanAccount(customerId: string): DemoLoanAccount | null {
  const loans = getLoanAccountsForCustomer(customerId)
  return loans.find((loan) => loan.account_status === 'ACTIVE') ?? loans[0] ?? null
}

export function setActiveCustomerByPhone(
  phone: string, 
  voice_customer_id?: string, 
  is_voice_registered?: boolean,
  base_customer_id?: string
): DemoCustomer | null {
  const deviceId = getDeviceId()
  const normalized = normalizePhone(phone)
  let customer: DemoCustomer | null = null

  if (base_customer_id) {
    // Respect existing persisted mapping for this phone.
    const persistentMap = getPersistentPhoneToCustomerMap()
    const persistedForPhone = persistentMap[normalized]
    customer = getCustomerById(persistedForPhone || base_customer_id)
    if (customer) {
      // Persist strict mapping for this phone+device combination.
      const dynamicMap = getDynamicPhoneToCustomerMap()
      dynamicMap[buildDynamicMapKey(phone, deviceId)] = customer.customer_id
      dynamicMap[normalized] = customer.customer_id
      setDynamicPhoneToCustomerMap(dynamicMap)

      const persistentUpdated = getPersistentPhoneToCustomerMap()
      persistentUpdated[normalized] = customer.customer_id
      setPersistentPhoneToCustomerMap(persistentUpdated)
    }
  }

  if (!customer) {
    customer = findCustomerByPhone(phone, deviceId)
  }
  if (!customer) return null
  
  if (voice_customer_id) customer.voice_customer_id = voice_customer_id
  if (is_voice_registered !== undefined) customer.is_voice_registered = is_voice_registered
  if (base_customer_id) customer.base_customer_id = base_customer_id

  try {
    localStorage.setItem(ACTIVE_CUSTOMER_STORAGE_KEY, customer.customer_id)
    if (voice_customer_id) {
        localStorage.setItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.voice_customer_id`, voice_customer_id)
    }
    if (is_voice_registered !== undefined) {
        localStorage.setItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.is_voice_registered`, String(is_voice_registered))
    }
    if (base_customer_id) {
        localStorage.setItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.base_customer_id`, base_customer_id)
    }
  } catch {
    // ignore storage issues
  }
  return customer
}

export function getActiveCustomer(): DemoCustomer | null {
  try {
    const id = localStorage.getItem(ACTIVE_CUSTOMER_STORAGE_KEY)
    if (!id) return null
    const customer = CUSTOMERS.find((c) => c.customer_id === id) ?? null
    if (customer) {
        customer.voice_customer_id = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.voice_customer_id`) ?? undefined
        customer.base_customer_id = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.base_customer_id`) ?? undefined
        const storedVoiceStatus = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.is_voice_registered`)
        customer.is_voice_registered = storedVoiceStatus === null ? undefined : storedVoiceStatus === 'true'
    }
    return customer
  } catch {
    return null
  }
}

export function clearActiveCustomer(): void {
  try {
    localStorage.removeItem(ACTIVE_CUSTOMER_STORAGE_KEY)
    localStorage.removeItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.voice_customer_id`)
    localStorage.removeItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.is_voice_registered`)
    localStorage.removeItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.base_customer_id`)
    localStorage.removeItem(VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY)
  } catch {
    // ignore storage issues
  }
}

function getRegisteredVoiceCustomerIds(): string[] {
  try {
    const raw = localStorage.getItem(VOICE_REGISTERED_CUSTOMERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function setRegisteredVoiceCustomerIds(customerIds: string[]): void {
  try {
    localStorage.setItem(VOICE_REGISTERED_CUSTOMERS_STORAGE_KEY, JSON.stringify(customerIds))
  } catch {
    // ignore storage issues
  }
}

function setActiveCustomerVoiceRegistrationStatus(isRegistered: boolean): void {
  try {
    const activeCustomerId = localStorage.getItem(ACTIVE_CUSTOMER_STORAGE_KEY)
    if (!activeCustomerId) return
    const activeCustomer = CUSTOMERS.find((c) => c.customer_id === activeCustomerId)
    if (activeCustomer) {
      activeCustomer.is_voice_registered = isRegistered
    }
    localStorage.setItem(
      `${ACTIVE_CUSTOMER_STORAGE_KEY}.is_voice_registered`,
      String(isRegistered)
    )
  } catch {
    // ignore storage issues
  }
}

function getVoiceSkipAllowedCustomerIds(): string[] {
  try {
    const raw = localStorage.getItem(VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function setVoiceSkipAllowedCustomerIds(customerIds: string[]): void {
  try {
    localStorage.setItem(VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY, JSON.stringify(customerIds))
  } catch {
    // ignore storage issues
  }
}

export function isVoiceRegistered(customerId: string): boolean {
  const activeCustomer = getActiveCustomer()
  if (
    activeCustomer &&
    activeCustomer.customer_id === customerId &&
    typeof activeCustomer.is_voice_registered === 'boolean'
  ) {
    return activeCustomer.is_voice_registered
  }
  return getRegisteredVoiceCustomerIds().includes(customerId)
}

export function markVoiceRegistered(customerId: string): void {
  const ids = new Set(getRegisteredVoiceCustomerIds())
  ids.add(customerId)
  setRegisteredVoiceCustomerIds([...ids])
  setActiveCustomerVoiceRegistrationStatus(true)
  disallowVoiceSkip(customerId)
}

export function markVoiceUnregistered(customerId: string): void {
  const ids = getRegisteredVoiceCustomerIds().filter((id) => id !== customerId)
  setRegisteredVoiceCustomerIds(ids)
  setActiveCustomerVoiceRegistrationStatus(false)
  disallowVoiceSkip(customerId)
}

export function isVoiceSkipAllowed(customerId: string): boolean {
  return getVoiceSkipAllowedCustomerIds().includes(customerId)
}

export function allowVoiceSkip(customerId: string): void {
  const ids = new Set(getVoiceSkipAllowedCustomerIds())
  ids.add(customerId)
  setVoiceSkipAllowedCustomerIds([...ids])
}

export function disallowVoiceSkip(customerId: string): void {
  const ids = getVoiceSkipAllowedCustomerIds().filter((id) => id !== customerId)
  setVoiceSkipAllowedCustomerIds(ids)
}
