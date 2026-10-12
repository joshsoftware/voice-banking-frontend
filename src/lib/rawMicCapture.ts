/**
 * Test-only mic path. Open the app with ?rawmic=1.
 *
 * Turns off browser echo cancellation, noise suppression, and auto gain,
 * then posts 16 kHz PCM taken from the mic track before it is Opus-encoded
 * for WebRTC. The server stores that next to the post-Opus and post-RNNoise turns.
 */

const RAW_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

let workletUrl: string | null = null

function rawTapWorkletUrl(): string {
  if (workletUrl) return workletUrl
  const src = `
    class RawTap extends AudioWorkletProcessor {
      process(inputs) {
        const ch = inputs[0] && inputs[0][0]
        if (ch) this.port.postMessage(ch)
        return true
      }
    }
    registerProcessor('raw-tap', RawTap)
  `
  workletUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
  return workletUrl
}

export function rawMicTestEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('rawmic') === '1'
}

type RawMicClient = {
  transport: unknown
  tracks: () => { local?: { audio?: MediaStreamTrack } }
}

export async function disarmBrowserProcessing(client: RawMicClient): Promise<MediaTrackSettings | null> {
  const daily = (client.transport as {
    mediaManager?: { _daily?: { updateInputSettings?: (settings: unknown) => Promise<unknown> } }
  })?.mediaManager?._daily
  if (daily?.updateInputSettings) {
    try {
      await daily.updateInputSettings({
        audio: { settings: { ...RAW_CONSTRAINTS } },
      })
    } catch (err) {
      console.warn('[rawmic] could not update Daily mic settings', err)
    }
  }
  const track = client.tracks().local?.audio
  if (!track) return null
  try {
    await track.applyConstraints(RAW_CONSTRAINTS)
  } catch (err) {
    console.warn('[rawmic] applyConstraints failed', err)
  }
  const settings = track.getSettings()
  const off =
    settings.echoCancellation === false &&
    settings.noiseSuppression === false &&
    settings.autoGainControl === false
  if (off) {
    console.log('[rawmic] browser mic processing is off', settings)
  } else {
    console.error('[rawmic] browser is still processing the mic — do not record yet', settings)
  }
  return settings
}

function to16kInt16(input: Float32Array, sampleRate: number): Int16Array {
  if (sampleRate === 16000) {
    const out = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return out
  }
  const ratio = sampleRate / 16000
  const outLen = Math.floor(input.length / ratio)
  const out = new Int16Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    const s = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function concatInt16(a: Int16Array, b: Int16Array): Int16Array {
  const out = new Int16Array(a.length + b.length)
  if (a.length) out.set(a, 0)
  out.set(b, a.length)
  return out
}

export function attachBrowserRawCapture(opts: {
  track: MediaStreamTrack
  apiBase: string
  getSessionId: () => string | null
}): { stop: () => void; flush: () => void } {
  let stopped = false
  let ctx: AudioContext | null = null
  let pending: Int16Array<ArrayBufferLike> = new Int16Array(0)
  const settingsJson = JSON.stringify(opts.track.getSettings())

  const flush = () => {
    if (pending.length === 0) return
    const sid = opts.getSessionId()
    const copy = pending
    pending = new Int16Array(0)
    if (!sid) return
    const body = new Uint8Array(copy.buffer, copy.byteOffset, copy.byteLength).slice()
    void fetch(`${opts.apiBase}/sessions/${sid}/raw-capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Mic-Settings': settingsJson,
      },
      body,
    }).catch((err) => console.warn('[rawmic] upload failed', err))
  }

  void (async () => {
    ctx = new AudioContext({ sampleRate: 16000 })
    const rate = ctx.sampleRate
    await ctx.audioWorklet.addModule(rawTapWorkletUrl())
    if (stopped) {
      await ctx.close()
      return
    }
    const source = ctx.createMediaStreamSource(new MediaStream([opts.track]))
    const node = new AudioWorkletNode(ctx, 'raw-tap')
    const silent = ctx.createGain()
    silent.gain.value = 0
    node.port.onmessage = (ev: MessageEvent<Float32Array>) => {
      if (stopped || !opts.track.enabled) return
      pending = concatInt16(pending, to16kInt16(ev.data, rate))
      if (pending.length >= 3200) flush()
    }
    source.connect(node)
    node.connect(silent)
    silent.connect(ctx.destination)
    console.log('[rawmic] capturing browser pcm before Opus', { sampleRate: rate })
  })().catch((err) => console.error('[rawmic] capture failed', err))

  return {
    flush,
    stop: () => {
      stopped = true
      flush()
      void ctx?.close()
    },
  }
}
