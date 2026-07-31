import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMicLevel } from '../useMicLevel'

type AnimationFrameCallback = FrameRequestCallback

describe('useMicLevel', () => {
  let animationCallback: AnimationFrameCallback | null
  let disconnect: ReturnType<typeof vi.fn>
  let close: ReturnType<typeof vi.fn>
  let resume: ReturnType<typeof vi.fn>
  let getByteFrequencyData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    animationCallback = null
    disconnect = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
    resume = vi.fn().mockResolvedValue(undefined)
    getByteFrequencyData = vi.fn((data: Uint8Array) => data.fill(255))

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: AnimationFrameCallback) => {
        animationCallback = callback
        return 1
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContextMock() {
        return {
          createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect })),
          createAnalyser: vi.fn(() => ({
            fftSize: 0,
            frequencyBinCount: 4,
            getByteFrequencyData,
          })),
          resume,
          close,
        }
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is inactive when no stream is present', () => {
    const { result } = renderHook(() => useMicLevel(null))

    expect(result.current).toBe(false)
    expect(AudioContext).not.toHaveBeenCalled()
  })

  it('becomes active when sampled microphone level is above threshold', () => {
    const stream = {} as MediaStream
    const { result } = renderHook(() => useMicLevel(stream))

    act(() => {
      animationCallback?.(performance.now())
    })

    expect(result.current).toBe(true)
    expect(getByteFrequencyData).toHaveBeenCalled()
  })

  it('disconnects audio resources when the stream changes', () => {
    const stream = {} as MediaStream
    const { rerender } = renderHook(({ value }) => useMicLevel(value), {
      initialProps: { value: stream as MediaStream | null },
    })

    rerender({ value: null })

    expect(disconnect).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})

