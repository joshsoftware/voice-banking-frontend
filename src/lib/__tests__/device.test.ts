// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import { computeDeviceId, getDeviceId } from '../device'

describe('device helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('computes a deterministic SHA-256 device id and caches it', async () => {
    const first = await computeDeviceId('919876543210')
    const second = await computeDeviceId('919876543210')

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(getDeviceId()).toBe(first)
  })

  it('returns an empty string before login has cached a device id', () => {
    expect(getDeviceId()).toBe('')
  })
})

