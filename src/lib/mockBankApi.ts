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
