/**
 * Customer access layer: identity comes from the mock-bank phone lookup API.
 */
import type { DemoCustomer } from './demoCustomer'
import * as demo from './demoCustomer'
import { createCustomerWithDefaultProducts, CustomerNotFoundError, fetchCustomerByPhone } from './mockBankApi'

export type { DemoCustomer } from './demoCustomer'

export function findCustomerByPhone(phone: string): DemoCustomer | null {
  return demo.findCustomerByPhone(phone)
}

export async function resolveCustomerByPhone(phone: string): Promise<DemoCustomer> {
  const customer = await fetchCustomerByPhone(phone)
  demo.setActiveCustomer(customer)
  return customer
}

export async function registerCustomerByPhone(name: string, phone: string): Promise<DemoCustomer> {
  await createCustomerWithDefaultProducts(name, phone)
  return resolveCustomerByPhone(phone)
}

export function isCustomerNotFoundError(error: unknown): boolean {
  if (error instanceof CustomerNotFoundError) return true
  if (!(error instanceof Error)) return false
  return error.name === 'CustomerNotFoundError' || /customer not found/i.test(error.message)
}

export function setActiveCustomer(
  customer: DemoCustomer,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer {
  return demo.setActiveCustomer(customer, voice_customer_id, is_voice_registered, base_customer_id)
}

export function setActiveCustomerByPhone(
  phone: string,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer | null {
  return demo.setActiveCustomerByPhone(phone, voice_customer_id, is_voice_registered, base_customer_id)
}

export function getActiveCustomer(): DemoCustomer | null {
  return demo.getActiveCustomer()
}

export function clearActiveCustomer(): void {
  demo.clearActiveCustomer()
}

export function isVoiceRegistered(customerId: string): boolean {
  return demo.isVoiceRegistered(customerId)
}

export function markVoiceRegistered(customerId: string): void {
  demo.markVoiceRegistered(customerId)
}

export function markVoiceUnregistered(customerId: string): void {
  demo.markVoiceUnregistered(customerId)
}

export function isVoiceSkipAllowed(customerId: string): boolean {
  return demo.isVoiceSkipAllowed(customerId)
}

export function allowVoiceSkip(customerId: string): void {
  demo.allowVoiceSkip(customerId)
}

export function disallowVoiceSkip(customerId: string): void {
  demo.disallowVoiceSkip(customerId)
}
