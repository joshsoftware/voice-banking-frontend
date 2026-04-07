import { useEffect, useRef, useState } from 'react'

/** Above this normalized level we treat the mic as “active” (drives waveform like the listening screen). */
const SPEAKING_THRESHOLD = 0.018

/**
 * Analyses microphone audio levels from a live {@link MediaStream} (same source as `getUserMedia`).
 * Used so the UI can reflect real input instead of a fake animation.
 */
export function useMicLevel(stream: MediaStream | null) {
  const [active, setActive] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream) {
      setActive(false)
      return
    }

    let cancelled = false
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    void ctx.resume().catch(() => {})

    const tick = () => {
      if (cancelled) return
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((s, v) => s + v, 0) / data.length / 255
      setActive(avg > SPEAKING_THRESHOLD)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      source.disconnect()
      void ctx.close()
    }
  }, [stream])

  return active
}
