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

const ACTIVE_CUSTOMER_STORAGE_KEY = 'voicebank.activeCustomerId'
const ACTIVE_CUSTOMER_PROFILE_KEY = 'voicebank.activeCustomerProfile'
const VOICE_REGISTERED_CUSTOMERS_STORAGE_KEY = 'voicebank.voiceRegisteredCustomers'
const VOICE_SKIP_ALLOWED_CUSTOMERS_STORAGE_KEY = 'voicebank.voiceSkipAllowedCustomers'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function readStoredCustomerProfile(): DemoCustomer | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CUSTOMER_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoCustomer
    if (!parsed || typeof parsed.customer_id !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredCustomerProfile(customer: DemoCustomer): void {
  try {
    localStorage.setItem(ACTIVE_CUSTOMER_STORAGE_KEY, customer.customer_id)
    localStorage.setItem(ACTIVE_CUSTOMER_PROFILE_KEY, JSON.stringify(customer))
  } catch {
    // ignore storage issues
  }
}

export function findCustomerByPhone(phone: string): DemoCustomer | null {
  const stored = readStoredCustomerProfile()
  if (stored && normalizePhone(stored.mobile_number) === normalizePhone(phone)) {
    return stored
  }
  return null
}

function applyVoiceFields(
  customer: DemoCustomer,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer {
  if (voice_customer_id) customer.voice_customer_id = voice_customer_id
  if (is_voice_registered !== undefined) customer.is_voice_registered = is_voice_registered
  if (base_customer_id) customer.base_customer_id = base_customer_id
  return customer
}

function persistVoiceFields(
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): void {
  try {
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
}

export function setActiveCustomer(
  customer: DemoCustomer,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer {
  const next = applyVoiceFields({ ...customer }, voice_customer_id, is_voice_registered, base_customer_id)
  writeStoredCustomerProfile(next)
  persistVoiceFields(voice_customer_id, is_voice_registered, base_customer_id)
  return next
}

export function setActiveCustomerByPhone(
  phone: string,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer | null {
  const customer = findCustomerByPhone(phone)
  if (!customer) return null
  return setActiveCustomer(customer, voice_customer_id, is_voice_registered, base_customer_id)
}

export function getActiveCustomer(): DemoCustomer | null {
  try {
    const stored = readStoredCustomerProfile()
    const id = stored?.customer_id ?? localStorage.getItem(ACTIVE_CUSTOMER_STORAGE_KEY)
    if (!id) return null
    const customer = stored
    if (customer) {
      customer.voice_customer_id = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.voice_customer_id`) ?? customer.voice_customer_id
      customer.base_customer_id = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.base_customer_id`) ?? customer.base_customer_id
      const storedVoiceStatus = localStorage.getItem(`${ACTIVE_CUSTOMER_STORAGE_KEY}.is_voice_registered`)
      if (storedVoiceStatus !== null) {
        customer.is_voice_registered = storedVoiceStatus === 'true'
      }
    }
    return customer
  } catch {
    return null
  }
}

export function clearActiveCustomer(): void {
  try {
    localStorage.removeItem(ACTIVE_CUSTOMER_STORAGE_KEY)
    localStorage.removeItem(ACTIVE_CUSTOMER_PROFILE_KEY)
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
    const stored = readStoredCustomerProfile()
    const activeCustomer = stored?.customer_id === activeCustomerId ? stored : null
    if (activeCustomer) {
      activeCustomer.is_voice_registered = isRegistered
      writeStoredCustomerProfile(activeCustomer)
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
