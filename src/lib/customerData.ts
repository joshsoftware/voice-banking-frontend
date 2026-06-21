/**
 * Customer data source switch.
 * Set VITE_CUSTOMER_DATA_SOURCE=esb to use Bandhan ESB fixture customers.
 */
import * as demo from './demoCustomer'
import * as esb from './esbCustomer'

export type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'

const useEsbCustomers = import.meta.env.VITE_CUSTOMER_DATA_SOURCE === 'esb'
const store = useEsbCustomers ? esb : demo

export const findCustomerByPhone = store.findCustomerByPhone
export const setActiveCustomerByPhone = store.setActiveCustomerByPhone
export const getActiveCustomer = store.getActiveCustomer
export const clearActiveCustomer = store.clearActiveCustomer
export const getAccountsForCustomer = store.getAccountsForCustomer
export const getPrimaryAccount = store.getPrimaryAccount
export const getLoanAccountsForCustomer = store.getLoanAccountsForCustomer
export const getPrimaryLoanAccount = store.getPrimaryLoanAccount
export const getLoanAccountForQuery = store.getLoanAccountForQuery
export const isVoiceRegistered = store.isVoiceRegistered
export const markVoiceRegistered = store.markVoiceRegistered
export const markVoiceUnregistered = store.markVoiceUnregistered
export const isVoiceSkipAllowed = store.isVoiceSkipAllowed
export const allowVoiceSkip = store.allowVoiceSkip
export const disallowVoiceSkip = store.disallowVoiceSkip
