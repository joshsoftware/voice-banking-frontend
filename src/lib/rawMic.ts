/**
 * Optional "raw microphone" capture for anti-spoofing experiments.
 *
 * Browsers turn echo cancellation, noise suppression and automatic gain control on by
 * default for `getUserMedia({ audio: true })`. Those steps erase the acoustic traces
 * (room, loudspeaker, noise floor) that replay/clone detection relies on.
 *
 * On by default so every call and enrollment can be saved as browser-raw / raw / denoised clips.
 * Disable with `?rawmic=0` (remembered in localStorage) and re-enable with `?rawmic=1`.
 *
 * While on, the page also copies the microphone to the backend as 16 kHz mono PCM, taken before
 * WebRTC/Opus ever sees it. The backend saves it next to the server-side clips as the "browser-raw" recording.
 *
 * Calls (turn mode, setRawTurnTarget) work like the server's RawAudioTap: while the mic button is not held only the
 * last 1 s is kept; pressing starts a clip seeded with that 1 s; releasing ends it (plus a short tail) and the clip
 * is uploaded as one numbered piece. Enrollment (setRawCaptureTarget) still streams continuously.
 */
const STORAGE_KEY = 'rawMic'
const TARGET_RATE = 16000
const FLUSH_MS = 500
const PREROLL_SAMPLES = TARGET_RATE // 1 s, same as the server's RawAudioTap pre-roll
const TAIL_MS = 400
const MAX_TURN_SAMPLES = TARGET_RATE * 60

let flagOn = false
let targetUrl: string | null = null
let micSettings = ''
// Each chunk remembers the session it was captured for, so late audio never lands in the next session.
let pending: { url: string; pcm: Int16Array }[] = []
let sending = false
// Streaming mode only: give up on a session after many 404s in a row (a single 404 must not end the capture).
const deadUrls = new Set<string>()
let misses = 0

// Turn mode state.
let turnUrl: string | null = null
let turnSeq = 0
let preroll: Int16Array[] = []
let prerollLen = 0
let turnChunks: Int16Array[] | null = null
let tailTimer = 0

function readFlag(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('rawmic')
    if (q === '1' || q === '0') localStorage.setItem(STORAGE_KEY, q)
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function isRawMicEnabled(): boolean {
  return flagOn
}

/** Streaming mode (enrollment): where to post the pre-Opus PCM (`<base>/sessions/<id>/raw-capture`); null stops. */
export function setRawCaptureTarget(url: string | null): void {
  targetUrl = url
  if (url) resetTurnState(null)
}

/** Turn mode (calls): where to post each pressed-to-released clip (`<base>/sessions/<id>/raw-turn`); null stops. */
export function setRawTurnTarget(url: string | null): void {
  resetTurnState(url)
  if (url) targetUrl = null
}

function resetTurnState(url: string | null): void {
  window.clearTimeout(tailTimer)
  turnUrl = url
  turnSeq = 0
  preroll = []
  prerollLen = 0
  turnChunks = null
}

/** The mic button was pressed: start a clip seeded with the last second heard. */
export function beginRawTurn(): void {
  if (!turnUrl) return
  if (turnChunks) finalizeTurn() // a previous release is still in its tail: close that clip first
  window.clearTimeout(tailTimer)
  turnChunks = [...preroll]
  preroll = []
  prerollLen = 0
}

/** The mic button was released: end the clip after a short tail and upload it. */
export function endRawTurn(): void {
  if (!turnUrl || !turnChunks) return
  window.clearTimeout(tailTimer)
  tailTimer = window.setTimeout(finalizeTurn, TAIL_MS)
}

function feedTurn(chunk: Int16Array): void {
  if (turnChunks) {
    turnChunks.push(chunk)
    return
  }
  preroll.push(chunk)
  prerollLen += chunk.length
  while (preroll.length > 1 && prerollLen - preroll[0].length >= PREROLL_SAMPLES) {
    prerollLen -= preroll[0].length
    preroll.shift()
  }
}

function finalizeTurn(): void {
  window.clearTimeout(tailTimer)
  const url = turnUrl
  const chunks = turnChunks
  turnChunks = null
  if (!url || !chunks || chunks.length === 0) return
  let all = new Int16Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.length
  }
  if (all.length > MAX_TURN_SAMPLES) all = all.slice(all.length - MAX_TURN_SAMPLES)
  void uploadTurn(url, all, ++turnSeq)
}

async function uploadTurn(url: string, pcm: Int16Array, seq: number): Promise<void> {
  const token = localStorage.getItem('voicebank.access_token')
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController()
    const timer = window.setTimeout(() => ctl.abort(), 10000)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-mic-settings': micSettings,
          'x-turn-seq': String(seq),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: pcm.slice().buffer,
        signal: ctl.signal,
      })
      if (res.ok) return
      console.warn(`[rawMic] turn #${seq} upload got HTTP ${res.status} (attempt ${attempt + 1}/3)`)
    } catch (e) {
      console.warn(`[rawMic] turn #${seq} upload failed (attempt ${attempt + 1}/3):`, e)
    } finally {
      window.clearTimeout(timer)
    }
    await new Promise((r) => window.setTimeout(r, 500 * (attempt + 1)))
  }
  console.warn(`[rawMic] turn #${seq} could not be uploaded; the server will treat that turn as having no browser audio`)
}

function downsampleTo16k(input: Float32Array, inputRate: number): Int16Array {
  const ratio = inputRate / TARGET_RATE
  const n = Math.floor(input.length / ratio)
  const out = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    // Average the input samples that fall inside this output sample (a cheap low-pass).
    const from = i * ratio
    const to = from + ratio
    let sum = 0
    let weight = 0
    for (let j = Math.floor(from); j < Math.min(Math.ceil(to), input.length); j++) {
      const w = Math.min(j + 1, to) - Math.max(j, from)
      sum += input[j] * w
      weight += w
    }
    const v = weight ? sum / weight : 0
    out[i] = Math.max(-1, Math.min(1, v)) * 0x7fff
  }
  return out
}

async function postPart(url: string, part: Int16Array, token: string | null): Promise<boolean> {
  if (deadUrls.has(url)) return false
  // A hung request must not hold up every later upload, so give up on it after a few seconds.
  const ctl = new AbortController()
  const timer = window.setTimeout(() => ctl.abort(), 5000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-mic-settings': micSettings,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: part.slice().buffer,
      signal: ctl.signal,
    })
    if (res.status === 404) {
      if (++misses >= 20) {
        deadUrls.add(url)
        console.warn('[rawMic] the server keeps saying it does not know this session. Reload the page to start a new one.')
      }
    } else if (res.ok) {
      misses = 0
    }
    return res.ok
  } catch (e) {
    console.debug('[rawMic] capture upload failed:', e)
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

async function flushPending(): Promise<void> {
  if (sending || pending.length === 0) return
  sending = true
  const batch = pending
  pending = []
  try {
    const token = localStorage.getItem('voicebank.access_token')
    // The server accepts at most 2 s per request. Chunks are grouped by session, in order.
    const maxSamples = TARGET_RATE * 2
    let i = 0
    while (i < batch.length) {
      const url = batch[i].url
      const group: Int16Array[] = []
      for (; i < batch.length && batch[i].url === url; i++) group.push(batch[i].pcm)
      const all = new Int16Array(group.reduce((n, c) => n + c.length, 0))
      let at = 0
      for (const c of group) {
        all.set(c, at)
        at += c.length
      }
      for (let from = 0; from < all.length; from += maxSamples) {
        // A 404 means the session is gone; skip the rest of this group.
        if (!(await postPart(url, all.subarray(from, from + maxSamples), token))) break
      }
    }
  } finally {
    sending = false
  }
}

function startCapture(stream: MediaStream): void {
  const track = stream.getAudioTracks()[0]
  if (!track) return
  try {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    // ScriptProcessor is deprecated but needs no extra file, which is fine for a test-only tap.
    const node = ctx.createScriptProcessor(4096, 1, 1)
    const mute = ctx.createGain()
    mute.gain.value = 0
    let timer = 0
    const stop = () => {
      window.clearInterval(timer)
      node.onaudioprocess = null
      void flushPending()
      void ctx.close()
    }
    node.onaudioprocess = (ev) => {
      // track.stop() does not fire 'ended', so check the state here and shut the tap down.
      if (track.readyState !== 'live') {
        stop()
        return
      }
      const chunk = downsampleTo16k(ev.inputBuffer.getChannelData(0), ctx.sampleRate)
      if (turnUrl) {
        feedTurn(chunk)
        return
      }
      if (!targetUrl || deadUrls.has(targetUrl)) return
      pending.push({ url: targetUrl, pcm: chunk })
    }
    source.connect(node)
    node.connect(mute)
    mute.connect(ctx.destination)
    timer = window.setInterval(() => void flushPending(), FLUSH_MS)
    track.addEventListener('ended', stop)
  } catch (e) {
    console.warn('[rawMic] could not start the pre-Opus capture:', e)
  }
}

export function installRawMic(): void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
  flagOn = readFlag()
  if (!flagOn) return

  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
  const processingOff = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  }

  navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    if (!constraints || !constraints.audio) return original(constraints)
    const audio: MediaTrackConstraints =
      constraints.audio === true ? { ...processingOff } : { ...(constraints.audio as MediaTrackConstraints), ...processingOff }
    const stream = await original({ ...constraints, audio })
    stream.getAudioTracks().forEach((t) => {
      const s = t.getSettings()
      micSettings = `echoCancellation=${s.echoCancellation} noiseSuppression=${s.noiseSuppression} autoGainControl=${s.autoGainControl} sampleRate=${s.sampleRate}`
      console.log(
        `[rawMic] mic opened: echoCancellation=${s.echoCancellation} noiseSuppression=${s.noiseSuppression} autoGainControl=${s.autoGainControl} sampleRate=${s.sampleRate}`,
      )
    })
    startCapture(stream)
    return stream
  }
  console.log('[rawMic] raw microphone capture ENABLED (browser AEC/NS/AGC off)')
}
