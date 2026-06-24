/**
 * Unified customer router: Bandhan ESB fixtures for mapped phones,
 * mock-bank demo customers for all other numbers.
 */
import type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'
import * as demo from './demoCustomer'
import * as esb from './esbCustomer'

export type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'
export { isEsbPhone, isEsbCustomerId, ESB_PHONE_TO_CUSTOMER_ID } from './esbCustomer'

function routeByCustomerId<T>(customerId: string, esbFn: () => T, demoFn: () => T): T {
  return esb.isEsbCustomerId(customerId) ? esbFn() : demoFn()
}

export function findCustomerByPhone(phone: string, deviceId?: string): DemoCustomer | null {
  if (esb.isEsbPhone(phone)) {
    return esb.findCustomerByPhone(phone, deviceId)
  }
  return demo.findCustomerByPhone(phone, deviceId)
}

export function setActiveCustomerByPhone(
  phone: string,
  voice_customer_id?: string,
  is_voice_registered?: boolean,
  base_customer_id?: string,
): DemoCustomer | null {
  if (esb.isEsbPhone(phone)) {
    demo.clearActiveCustomer()
    return esb.setActiveCustomerByPhone(phone, voice_customer_id, is_voice_registered, base_customer_id)
  }

  esb.clearActiveCustomer()
  return demo.setActiveCustomerByPhone(phone, voice_customer_id, is_voice_registered, base_customer_id)
}

export function getActiveCustomer(): DemoCustomer | null {
  return esb.getActiveCustomer() ?? demo.getActiveCustomer()
}

export function clearActiveCustomer(): void {
  esb.clearActiveCustomer()
  demo.clearActiveCustomer()
}

export function getAccountsForCustomer(customerId: string): DemoAccount[] {
  return routeByCustomerId(
    customerId,
    () => esb.getAccountsForCustomer(customerId),
    () => demo.getAccountsForCustomer(customerId),
  )
}

export function getPrimaryAccount(customerId: string): DemoAccount | null {
  return routeByCustomerId(
    customerId,
    () => esb.getPrimaryAccount(customerId),
    () => demo.getPrimaryAccount(customerId),
  )
}

export function getLoanAccountsForCustomer(customerId: string): DemoLoanAccount[] {
  return routeByCustomerId(
    customerId,
    () => esb.getLoanAccountsForCustomer(customerId),
    () => demo.getLoanAccountsForCustomer(customerId),
  )
}

export function getPrimaryLoanAccount(customerId: string): DemoLoanAccount | null {
  return routeByCustomerId(
    customerId,
    () => esb.getPrimaryLoanAccount(customerId),
    () => demo.getPrimaryLoanAccount(customerId),
  )
}

export function getLoanAccountForQuery(customerId: string, queryText: string): DemoLoanAccount | null {
  return routeByCustomerId(
    customerId,
    () => esb.getLoanAccountForQuery(customerId, queryText),
    () => demo.getLoanAccountForQuery(customerId, queryText),
  )
}

export function isVoiceRegistered(customerId: string): boolean {
  return routeByCustomerId(
    customerId,
    () => esb.isVoiceRegistered(customerId),
    () => demo.isVoiceRegistered(customerId),
  )
}

export function markVoiceRegistered(customerId: string): void {
  routeByCustomerId(
    customerId,
    () => esb.markVoiceRegistered(customerId),
    () => demo.markVoiceRegistered(customerId),
  )
}

export function markVoiceUnregistered(customerId: string): void {
  routeByCustomerId(
    customerId,
    () => esb.markVoiceUnregistered(customerId),
    () => demo.markVoiceUnregistered(customerId),
  )
}

export function isVoiceSkipAllowed(customerId: string): boolean {
  return routeByCustomerId(
    customerId,
    () => esb.isVoiceSkipAllowed(customerId),
    () => demo.isVoiceSkipAllowed(customerId),
  )
}

export function allowVoiceSkip(customerId: string): void {
  routeByCustomerId(
    customerId,
    () => esb.allowVoiceSkip(customerId),
    () => demo.allowVoiceSkip(customerId),
  )
}

export function disallowVoiceSkip(customerId: string): void {
  routeByCustomerId(
    customerId,
    () => esb.disallowVoiceSkip(customerId),
    () => demo.disallowVoiceSkip(customerId),
  )
}
