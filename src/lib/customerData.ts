/** Re-exports Bandhan ESB fixture customers for this branch. */
export type { DemoAccount, DemoCustomer, DemoLoanAccount } from './demoCustomer'
export {
  findCustomerByPhone,
  setActiveCustomerByPhone,
  getActiveCustomer,
  clearActiveCustomer,
  getAccountsForCustomer,
  getPrimaryAccount,
  getLoanAccountsForCustomer,
  getPrimaryLoanAccount,
  getLoanAccountForQuery,
  isVoiceRegistered,
  markVoiceRegistered,
  markVoiceUnregistered,
  isVoiceSkipAllowed,
  allowVoiceSkip,
  disallowVoiceSkip,
} from './esbCustomer'
