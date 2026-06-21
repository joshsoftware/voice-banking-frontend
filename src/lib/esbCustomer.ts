import { getDeviceId } from './device'
import type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'

export type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'

const ACTIVE_CUSTOMER_STORAGE_KEY = 'voicebank.esb.activeCustomerId'
const VOICE_REGISTERED_CUSTOMERS_STORAGE_KEY = 'voicebank.esb.voiceRegisteredCustomers'
const VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY = 'voicebank.esb.voiceSkipAllowedCustomers'
const DYNAMIC_PHONE_TO_CUSTOMER_ID_STORAGE_KEY = 'voicebank.esb.dynamicPhoneToCustomerId'
const PHONE_TO_CUSTOMER_PERSISTENT_STORAGE_KEY = 'voicebank.esb.phoneToCustomerPersistent'

const ESB_PLACEHOLDER_TS = '2026-06-19T00:00:00.000Z'

const CUSTOMERS: DemoCustomer[] = [
  { customer_id: '329446538', email: 'sabir8994@gmail.com', kyc_status: 'VERIFIED', created_at: ESB_PLACEHOLDER_TS, date_of_birth: '', mobile_number: '6372559128', name: 'RAVINDRA KUMAR CHHAJ', status: 'ACTIVE' },
  { customer_id: '325396985', email: 'archana.sonsurkar@bandhanbank.com', kyc_status: 'VERIFIED', created_at: ESB_PLACEHOLDER_TS, date_of_birth: '1990-08-19', mobile_number: '', name: 'SHAHEEN AFRIDI', status: 'ACTIVE' },
]

const ACCOUNTS: DemoAccount[] = [
  { account_type: 'CURRENT', account_id: '10160002669966', balance: 0, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 0, minimum_balance: 0, customer_id: '329446538' },
  { account_type: 'SAVINGS', account_id: '20200034161610', balance: 0, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: '329446538' },
  { account_type: 'SAVINGS', account_id: '50150075922296', balance: 0, status: 'ACTIVE', overdraft_limit: 0, interest_rate: 3.5, minimum_balance: 1000, customer_id: '325396985' },
]

const LOANS: DemoLoanAccount[] = [
  { account_id: '90001021152274', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6702-Personal Loan', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001021818661', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'GOLD_LOAN', product_name: '7303-Bandhan Gold Loan - EMI', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'GOLD_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001021812452', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'GOLD_LOAN', product_name: '7302-Bandhan Gold Loan - MI', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'GOLD_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001022238422', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6702-Personal Loan', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001021554332', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6702-Personal Loan', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001021824397', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6702-Personal Loan', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001021872425', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6702-Personal Loan', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
  { account_id: '90001022088399', account_status: 'ACTIVE', created_at: ESB_PLACEHOLDER_TS, emi: '0', interest_rate: 0, loan_amount: 0, loan_tenure: '0', loan_type: 'PERSONAL_LOAN', product_name: '6715-Personal Loan Non Salarie', sanction_date: '2020-01-01', sanction_loan_amount: '0', scheme_name: 'PERSONAL_LOAN_SCHEME', updated_at: ESB_PLACEHOLDER_TS, customer_id: '325396985' },
]

const ELIGIBLE_CUSTOMER_IDS = CUSTOMERS.map((c) => c.customer_id)

const PHONE_TO_CUSTOMER_ID: Record<string, string> = {
  '6372559128': '329446538',
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

function getCustomerById(customerId: string): DemoCustomer | null {
  return CUSTOMERS.find((c) => c.customer_id === customerId) ?? null
}

export function findCustomerByPhone(phone: string, deviceId?: string): DemoCustomer | null {
  const normalized = normalizePhone(phone)
  const mappedCustomerId = PHONE_TO_CUSTOMER_ID[normalized]
  if (mappedCustomerId) {
    return getCustomerById(mappedCustomerId)
  }

  const persistentMap = getPersistentPhoneToCustomerMap()
  const persistentCustomerId = persistentMap[normalized]
  if (persistentCustomerId) {
    return getCustomerById(persistentCustomerId)
  }

  const dynamicMap = getDynamicPhoneToCustomerMap()
  const compositeKey = buildDynamicMapKey(phone, deviceId)
  const existingDynamicCustomerId = dynamicMap[compositeKey] ?? dynamicMap[normalized]
  if (existingDynamicCustomerId) {
    if (!dynamicMap[compositeKey]) {
      dynamicMap[compositeKey] = existingDynamicCustomerId
      setDynamicPhoneToCustomerMap(dynamicMap)
    }
    return getCustomerById(existingDynamicCustomerId)
  }

  const assignedCustomerId =
    getDeterministicCustomerId(phone, deviceId, ELIGIBLE_CUSTOMER_IDS) ?? ELIGIBLE_CUSTOMER_IDS[0]
  if (!assignedCustomerId) return CUSTOMERS[0] ?? null

  dynamicMap[compositeKey] = assignedCustomerId
  dynamicMap[normalized] = assignedCustomerId
  setDynamicPhoneToCustomerMap(dynamicMap)

  const persistentUpdated = getPersistentPhoneToCustomerMap()
  persistentUpdated[normalized] = assignedCustomerId
  setPersistentPhoneToCustomerMap(persistentUpdated)

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

const LOAN_TYPE_KEYWORDS: Record<string, RegExp> = {
  HOME_LOAN: /\bhome\b/,
  PERSONAL_LOAN: /\bpersonal\b/,
  CAR_LOAN: /\bcar\b|\bauto\b|\bvehicle\b/,
  EDUCATION_LOAN: /\beducation\b|\bstudy\b|\bstudent\b/,
  BUSINESS_LOAN: /\bbusiness\b|\bsme\b/,
  GOLD_LOAN: /\bgold\b/,
}

export function getLoanAccountForQuery(customerId: string, queryText: string): DemoLoanAccount | null {
  const loans = getLoanAccountsForCustomer(customerId)
  if (!loans.length) return null

  const normalized = queryText.toLowerCase()
  for (const [loanType, pattern] of Object.entries(LOAN_TYPE_KEYWORDS)) {
    if (!pattern.test(normalized)) continue
    const match = loans.find((loan) => loan.loan_type === loanType && loan.account_status === 'ACTIVE')
      ?? loans.find((loan) => loan.loan_type === loanType)
    if (match) return match
  }

  return getPrimaryLoanAccount(customerId)
}

export function setActiveCustomerByPhone(
  phone: string,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer | null {
  const deviceId = getDeviceId()
  const normalized = normalizePhone(phone)
  let customer: DemoCustomer | null = null

  if (base_customer_id) {
    const persistentMap = getPersistentPhoneToCustomerMap()
    const persistedForPhone = persistentMap[normalized]
    customer = getCustomerById(persistedForPhone || base_customer_id)
    if (customer) {
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
      String(isRegistered),
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
