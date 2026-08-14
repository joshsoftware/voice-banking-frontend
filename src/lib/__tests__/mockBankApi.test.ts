import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAccountsForCustomer, fetchCustomerByPhone, mapMockBankCustomer } from '../mockBankApi'

describe('mockBankApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('maps mock-bank customer info onto the app customer shape', () => {
    expect(
      mapMockBankCustomer({
        createdDate: '2026-08-13T22:26:26.828579',
        customerId: 'CIF202602260038',
        dateOfBirth: '1995-01-14',
        email: 'sobiya.shaikh@gmail.com',
        kycStatus: 'VERIFIED',
        mobileNumber: '9322616376',
        name: 'Sobiya Shaikh',
        status: 'ACTIVE',
        updatedDate: '2026-08-13T22:26:26.828579',
      }),
    ).toEqual({
      customer_id: 'CIF202602260038',
      email: 'sobiya.shaikh@gmail.com',
      kyc_status: 'VERIFIED',
      created_at: '2026-08-13T22:26:26.828579',
      date_of_birth: '1995-01-14',
      mobile_number: '9322616376',
      name: 'Sobiya Shaikh',
      status: 'ACTIVE',
    })
  })

  it('looks up a customer by the last 10 digits of the phone number', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            createdDate: '2026-08-13T22:26:26.828579',
            customerId: 'CIF202602260038',
            dateOfBirth: '1995-01-14',
            email: 'sobiya.shaikh@gmail.com',
            kycStatus: 'VERIFIED',
            mobileNumber: '9322616376',
            name: 'Sobiya Shaikh',
            status: 'ACTIVE',
            updatedDate: '2026-08-13T22:26:26.828579',
          },
          message: 'Customer info fetched successfully',
          status: 'success',
          statusCode: 200,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(fetchCustomerByPhone('919322616376')).resolves.toMatchObject({
      customer_id: 'CIF202602260038',
      name: 'Sobiya Shaikh',
      mobile_number: '9322616376',
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/customers/info/phone-number'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          deviceId: 'false',
        },
        body: JSON.stringify({ mobileNumber: '9322616376' }),
      }),
    )
  })

  it('throws the backend message when the customer is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Customer not found', status: 'error', statusCode: 404 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(fetchCustomerByPhone('9000000001')).rejects.toThrow('Customer not found')
  })

  it('loads account ids from mock-bank so Python balance/transactions can be called', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            accountList: [
              { accountId: 'ACC202602260007', accountType: 'SAVINGS', status: 'ACTIVE' },
              { accountId: 'ACC202602260008', accountType: 'CURRENT', status: 'ACTIVE' },
            ],
          },
          message: 'Account list fetched successfully',
          status: 'success',
          statusCode: 200,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(fetchAccountsForCustomer('CIF202602260005')).resolves.toEqual([
      { account_id: 'ACC202602260007', account_type: 'SAVINGS', customer_id: 'CIF202602260005' },
      { account_id: 'ACC202602260008', account_type: 'CURRENT', customer_id: 'CIF202602260005' },
    ])

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/list'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ customerId: 'CIF202602260005' }),
      }),
    )
  })
})
