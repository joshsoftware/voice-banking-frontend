import { describe, expect, it } from 'vitest'
import type { PipecatClient } from '@pipecat-ai/client-js'

import { isConnectionDead } from '../useSmallWebRTC'

/**
 * Regression coverage for the background → foreground reconnect guard
 * (resumeSessionFromBackground in useSmallWebRTC's visibilitychange effect).
 * On mobile, the peer connection is frequently killed while the tab is
 * backgrounded with no event the app observes — isConnectionDead is the
 * sole check that decides whether returning to the foreground triggers a
 * fresh connect() or just resumes mic/audio on the existing session.
 */
function clientWithPeerState(partial: {
  connectionState?: string
  signalingState?: string
  key?: 'pc' | '_pc'
}): PipecatClient {
  const key = partial.key ?? 'pc'
  return {
    transport: {
      [key]: {
        connectionState: partial.connectionState,
        signalingState: partial.signalingState,
      },
    },
  } as unknown as PipecatClient
}

describe('isConnectionDead', () => {
  it('is dead when there is no client at all', () => {
    expect(isConnectionDead(null)).toBe(true)
  })

  it.each(['closed', 'failed', 'disconnected'])(
    'is dead when the peer connection state is %s',
    (connectionState) => {
      expect(isConnectionDead(clientWithPeerState({ connectionState }))).toBe(true)
    },
  )

  it('is dead when the signaling state is closed even if connectionState looks fine', () => {
    expect(
      isConnectionDead(
        clientWithPeerState({ connectionState: 'connected', signalingState: 'closed' }),
      ),
    ).toBe(true)
  })

  it('is alive for a healthy connection', () => {
    expect(
      isConnectionDead(
        clientWithPeerState({ connectionState: 'connected', signalingState: 'stable' }),
      ),
    ).toBe(false)
  })

  it('checks the underscore-prefixed transport field some transports use', () => {
    expect(
      isConnectionDead(clientWithPeerState({ connectionState: 'failed', key: '_pc' })),
    ).toBe(true)
  })

  it('assumes alive (does not force a reconnect) when transport internals are unreadable', () => {
    const client = { transport: null } as unknown as PipecatClient
    expect(isConnectionDead(client)).toBe(false)
  })
})
