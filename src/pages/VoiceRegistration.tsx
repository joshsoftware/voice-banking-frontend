import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { MicIcon, VolumeIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import { ImageDescribeSheet, type ImageDescribeSheetState } from '@/components/voice-registration/ImageDescribeSheet'
import { VoiceRegistrationSuccess } from '@/components/voice-registration/VoiceRegistrationSuccess'
import { useMicLevel } from '@/hooks/useMicLevel'
import { API_BASE, VOICEPRINT_API_BASE, VOICE_ENROLL_USER_ID } from '@/lib/constants'
import { stopSpeech, speakText } from '@/lib/speech'
import { VOICE_REGISTRATION_IMAGES } from '@/data/voiceRegistrationImages'

type Phase = 'consent' | 'imageChallenge' | 'success'
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
const normalizeBase = (url: string) => url.replace(/\/+$/, '')
// Voice registration must keep enrollment + WebRTC on the SAME backend host.
// If VOICEPRINT_API_BASE is configured, use it as primary to avoid cross-host session mismatch.
const getRegistrationBackendBase = () => normalizeBase(VOICEPRINT_API_BASE || API_BASE)

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

export default function VoiceRegistration() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('consent')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enrollmentSessionId, setEnrollmentSessionId] = useState<string | null>(null)
  const [rtcSessionId, setRtcSessionId] = useState<string | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [isRtcReady, setIsRtcReady] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pcIdRef = useRef<string | null>(null)
  const enrollmentSessionIdRef = useRef<string | null>(null)
  const rtcSessionIdRef = useRef<string | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const connectingRtcRef = useRef(false)
  const imageFinalizeLockRef = useRef(false)

  const [imageIndex, setImageIndex] = useState(0)
  const [sheetState, setSheetState] = useState<ImageDescribeSheetState>('micIdle')
  const [countdown, setCountdown] = useState(3)
  const [recordProgress, setRecordProgress] = useState(0)
  const countdownToRecordingRef = useRef(false)

  const micActiveImage = useMicLevel(
    phase === 'imageChallenge' && sheetState === 'recording' ? micStream : null
  )

  const canStart = useMemo(() => consent && !loading, [consent, loading])

  useEffect(() => {
    micStreamRef.current = micStream
  }, [micStream])

  useEffect(() => {
    enrollmentSessionIdRef.current = enrollmentSessionId
  }, [enrollmentSessionId])

  useEffect(() => {
    rtcSessionIdRef.current = rtcSessionId
  }, [rtcSessionId])

  const disconnectRtc = useCallback(() => {
    stopMediaStream(micStreamRef.current)
    micStreamRef.current = null
    setMicStream(null)
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    pcIdRef.current = null
    setIsRtcReady(false)
  }, [])

  useEffect(() => {
    return () => {
      disconnectRtc()
      stopSpeech()
    }
  }, [disconnectRtc])

  const negotiate = useCallback(async () => {
    const pc = pcRef.current
    const sid = rtcSessionIdRef.current
    const enrollmentSid = enrollmentSessionIdRef.current
    const backendBase = getRegistrationBackendBase()
    if (!pc || !sid) return
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    const offerRes = await fetch(`${backendBase}/sessions/${sid}/api/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: pc.localDescription?.sdp,
        type: pc.localDescription?.type,
        pc_id: pcIdRef.current,
        config: { data_channel_enabled: true },
        request_data: enrollmentSid
          ? {
              enrollment_session_id: enrollmentSid,
              session_id: enrollmentSid,
            }
          : undefined,
      }),
    })
    if (!offerRes.ok) throw new Error(`Offer failed: ${offerRes.status}`)
    const answer = await offerRes.json()
    if (answer.pc_id || answer.pcId) {
      pcIdRef.current = answer.pc_id || answer.pcId
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const startEnrollmentRealtime = useCallback(async () => {
    if (connectingRtcRef.current) return
    if (pcRef.current && enrollmentSessionIdRef.current && rtcSessionIdRef.current) return
    connectingRtcRef.current = true
    setMicError(null)
    try {
      const backendBase = getRegistrationBackendBase()
      const startPayload = {
        customer_id: VOICE_ENROLL_USER_ID,
        device_id: 'web',
        total_steps: VOICE_REGISTRATION_IMAGES.length,
      }
      // Support both backend mounting styles:
      // 1) <base>/start
      // 2) <base>/enrollment/start
      const startCandidates = [`${backendBase}/start`, `${backendBase}/enrollment/start`]
      let startEnrollmentPayload: { session_id?: string; status?: string; [k: string]: unknown } | null = null
      let startEnrollmentError: string | null = null
      for (const url of startCandidates) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(startPayload),
        })
        if (res.ok) {
          const payload = (await res.json().catch(() => ({}))) as {
            session_id?: string
            status?: string
            sessionId?: string
            iceConfig?: unknown
          }
          // Avoid accidentally accepting WebRTC `/start` response.
          const looksLikeEnrollmentStart =
            payload.status === 'started' ||
            (typeof payload.session_id === 'string' && !payload.sessionId && !payload.iceConfig)

          if (looksLikeEnrollmentStart) {
            startEnrollmentPayload = payload
            break
          }

          startEnrollmentError =
            'Received WebRTC /start response while expecting enrollment session start.'
          continue
        }
        const err = await res.json().catch(() => ({}))
        const detail = (err as { detail?: string }).detail
        if (res.status !== 404) {
          throw new Error(detail || `Enrollment start failed (${res.status})`)
        }
        // Keep last 404 detail so user sees whether it is path-missing vs session issue.
        if (detail) {
          startEnrollmentError = detail
        }
      }
      if (!startEnrollmentPayload) {
        const hint =
          startEnrollmentError ?? 'Enrollment start endpoint not found. Checked /start and /enrollment/start.'
        throw new Error(hint)
      }
      const enrollmentId = startEnrollmentPayload.session_id
      if (!enrollmentId) {
        throw new Error('Enrollment start succeeded but no session_id was returned.')
      }
      setEnrollmentSessionId(enrollmentId)
      enrollmentSessionIdRef.current = enrollmentId

      const startRtc = await fetch(`${backendBase}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!startRtc.ok) throw new Error(`/start failed: ${startRtc.status}`)
      const rtc = await startRtc.json()
      const sid: string = rtc.sessionId
      const iceServers: RTCIceServer[] = rtc.iceConfig?.iceServers?.length
        ? rtc.iceConfig.iceServers
        : FALLBACK_ICE_SERVERS
      setRtcSessionId(sid)
      rtcSessionIdRef.current = sid

      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      setMicStream(stream)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !pcIdRef.current || !rtcSessionIdRef.current) return
        fetch(`${backendBase}/sessions/${rtcSessionIdRef.current}/api/offer`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pc_id: pcIdRef.current,
            candidates: [
              {
                candidate: ev.candidate.candidate,
                sdpMid: ev.candidate.sdpMid,
                sdpMLineIndex:
                  ev.candidate.sdpMLineIndex !== null ? Number(ev.candidate.sdpMLineIndex) : null,
              },
            ],
          }),
        }).catch(() => {})
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setIsRtcReady(true)
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          setIsRtcReady(false)
        }
      }

      pc.onnegotiationneeded = () => {
        void negotiate().catch((e) => setMicError(e instanceof Error ? e.message : 'Negotiation failed'))
      }
      await negotiate()
      setIsRtcReady(true)
    } catch (e) {
      disconnectRtc()
      setMicError(e instanceof Error ? e.message : 'Could not initialize voice enrollment.')
      throw e
    } finally {
      connectingRtcRef.current = false
    }
  }, [disconnectRtc, negotiate])

  useEffect(() => {
    if (phase !== 'imageChallenge') return
    setSheetState('micIdle')
    setCountdown(3)
    setRecordProgress(0)
    imageFinalizeLockRef.current = false
    countdownToRecordingRef.current = false
  }, [imageIndex, phase])

  useEffect(() => {
    if (sheetState !== 'countdown' || countdown > 0) return
    if (countdownToRecordingRef.current) return
    countdownToRecordingRef.current = true
    void (async () => {
      try {
        if (!pcRef.current || !micStreamRef.current) {
          await startEnrollmentRealtime()
        }
        setRecordProgress(0)
        imageFinalizeLockRef.current = false
        setSheetState('recording')
      } catch {
        setSheetState('micIdle')
        setCountdown(3)
        countdownToRecordingRef.current = false
      }
    })()
  }, [sheetState, countdown, startEnrollmentRealtime])

  useEffect(() => {
    if (sheetState !== 'countdown' || countdown <= 0) return
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [sheetState, countdown])

  useEffect(() => {
    if (sheetState !== 'recording') return
    const id = window.setInterval(() => {
      setRecordProgress((p) => {
        if (p >= 100) return 100
        const n = p + 1
        if (n >= 100 && !imageFinalizeLockRef.current) {
          imageFinalizeLockRef.current = true
          setSheetState('review')
        }
        return n
      })
    }, 110)
    return () => clearInterval(id)
  }, [sheetState])

  const skipForNow = () => {
    disconnectRtc()
    stopSpeech()
    navigate('/home')
  }

  const goToImageChallenge = () => {
    stopSpeech()
    setImageIndex(0)
    setSheetState('micIdle')
    setCountdown(3)
    setRecordProgress(0)
    countdownToRecordingRef.current = false
    setEnrollError(null)
    setPhase('imageChallenge')
  }

  async function handleStartRegistration() {
    if (!canStart) return
    setLoading(true)
    setMicError(null)
    try {
      setPhase('imageChallenge')
    } catch (e) {
      if (e instanceof DOMException) {
        if (e.name === 'NotAllowedError') {
          setMicError('Microphone access was denied. Allow the mic to register your voice.')
        } else if (e.name === 'NotFoundError') {
          setMicError('No microphone was found on this device.')
        } else {
          setMicError('Could not access the microphone.')
        }
      } else {
        setMicError('Could not access the microphone.')
      }
    } finally {
      setLoading(false)
    }
  }

  const playImageDescription = () => {
    const item = VOICE_REGISTRATION_IMAGES[imageIndex]
    if (!item) return
    speakText(item.spokenDescription)
  }

  const handleTapImageMic = () => {
    stopSpeech()
    setEnrollError(null)
    countdownToRecordingRef.current = false
    setCountdown(3)
    setSheetState('countdown')
  }

  const handleRerecord = () => {
    imageFinalizeLockRef.current = false
    setRecordProgress(0)
    countdownToRecordingRef.current = false
    setSheetState('micIdle')
    setCountdown(3)
  }

  const handleImageSubmit = async () => {
    if (!enrollmentSessionIdRef.current) {
      setEnrollError('Enrollment session is not active. Tap mic again to start.')
      return
    }
    stopSpeech()
    setSubmitLoading(true)
    setEnrollError(null)
    try {
      const backendBase = getRegistrationBackendBase()
      const sid = encodeURIComponent(enrollmentSessionIdRef.current)
      const res = await fetch(`${backendBase}/enrollment/${sid}/submit-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_index: imageIndex + 1 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = (err as { detail?: string }).detail
        throw new Error(detail || `Step submit failed (${res.status})`)
      }
      const data = await res.json()
      if (data.status === 'enrolled' || imageIndex >= VOICE_REGISTRATION_IMAGES.length - 1) {
        setPhase('success')
      } else {
        setImageIndex((i) => i + 1)
      }
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : 'Could not submit this step.')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleStartBanking() {
    disconnectRtc()
    stopSpeech()
    navigate('/home')
  }

  const currentImage = VOICE_REGISTRATION_IMAGES[imageIndex]

  return (
    <MobileContainer gradient={false}>
      <div
        className={`relative flex h-full min-h-screen flex-col overflow-hidden bg-[var(--color-surface-app)] text-[var(--color-brand-900)] md:h-[var(--device-height)] md:min-h-[var(--device-height)] ${
          phase === 'imageChallenge' ? 'pb-0' : 'px-5 pb-2 pt-4'
        }`}
      >
        {phase === 'success' ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-6 pt-6">
            <VoiceRegistrationSuccess
              onStartBanking={handleStartBanking}
              isSubmitting={submitLoading}
              error={enrollError}
            />
          </div>
        ) : phase === 'imageChallenge' ? (
          <div className="relative flex min-h-0 flex-1 flex-col px-5 pt-4">
            <div className="shrink-0 text-center">
              <h1 className="text-xl font-bold leading-snug text-[var(--color-brand-900)]">
                Set up your voice by{' '}
              </h1>
              <h1 className="text-xl font-bold leading-snug text-[var(--color-brand-900)]">
                <span className="text-[var(--color-brand-500)]">describing the image.</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted-2)]">Takes under 30 seconds.</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted-3)]">
                Image {imageIndex + 1} of {VOICE_REGISTRATION_IMAGES.length}
              </p>
            </div>

            <div className="relative mx-auto mt-4 flex min-h-0 w-full max-w-[320px] flex-1 flex-col pb-[220px]">
              <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
                {currentImage ? (
                  <img
                    src={currentImage.src}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : null}
                <button
                  type="button"
                  aria-label="Play image description"
                  onClick={playImageDescription}
                  className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white text-[var(--color-brand-500)] shadow-[var(--shadow-mute)] transition-transform active:scale-95"
                >
                  <VolumeIcon className="size-5" />
                </button>
              </div>
            </div>

            <ImageDescribeSheet
              state={sheetState}
              countdown={countdown}
              recordProgress={recordProgress}
              micActive={micActiveImage}
              onTapMic={handleTapImageMic}
              onRerecord={handleRerecord}
              onSubmit={() => void handleImageSubmit()}
            />
            {micError ? (
              <p className="mx-auto mt-2 max-w-[320px] text-center text-xs leading-snug text-red-600">{micError}</p>
            ) : null}
            {!isRtcReady && enrollmentSessionId ? (
              <p className="mx-auto mt-1 max-w-[320px] text-center text-[11px] text-[var(--color-text-muted-2)]">
                Connecting voice session…
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-1 flex shrink-0 flex-col items-center px-1">
              <div className="grid size-[68px] place-items-center rounded-full bg-[rgba(32,114,178,0.12)] text-[var(--color-brand-500)]">
                <MicIcon className="h-10 w-10" />
              </div>
              <h1 className="mt-3 text-center text-2xl font-bold leading-snug tracking-tight text-[var(--color-brand-900)] text-balance">
                Enable Voice Banking
              </h1>
              <p className="mt-1.5 max-w-[340px] text-center text-sm font-medium leading-snug text-[var(--color-text-muted-1)] text-balance">
                Secure your account with voice biometrics
              </p>
            </div>

            {phase === 'consent' ? (
              <div className="mx-auto mt-4 flex min-h-0 w-full max-w-[320px] flex-1 flex-col px-5">
                <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white px-4 py-5 shadow-[var(--shadow-card)]">
                  <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-4 text-[var(--color-brand-900)]">
                    <div className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm leading-none text-[var(--color-brand-500)]">
                        🛡
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug text-[var(--color-brand-900)]">
                          Enhanced Security
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          Your unique voice pattern adds an extra layer of protection
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm leading-none text-[var(--color-brand-500)]">
                        ⚡
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug text-[var(--color-brand-900)]">
                          Quick Commands
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          Perform banking tasks instantly with voice commands
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm leading-none text-[var(--color-brand-500)]">
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug text-[var(--color-brand-900)]">
                          3 Simple Steps
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          Record your voice 3 times to create your unique profile
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto mt-4 flex min-h-0 w-full max-w-[320px] flex-1 flex-col px-5">
                <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white px-4 py-5 shadow-[var(--shadow-card)]">
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
                    <div className="h-0.5 w-10 rounded-full bg-black/25" />
                    <p className="text-center text-sm font-semibold text-[var(--color-brand-500)]">Speaking...</p>
                    <p className="max-w-[260px] text-center text-[10px] leading-tight text-[var(--color-text-muted-2)]">
                      Live voice session is active for enrollment.
                    </p>
                    <Waveform active={false} className="origin-center scale-90" />
                  </div>
                </div>
              </div>
            )}

            {phase === 'consent' ? (
              <label className="mx-auto mt-5 flex w-full max-w-[320px] shrink-0 items-start gap-3 px-5 text-xs leading-snug text-[var(--color-brand-900)]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-[#9bb0c7]"
                />
                <span className="text-pretty">
                  I consent to <strong>voice data collection</strong> for <strong>authentication</strong>. Recordings will be{' '}
                  <strong>securely stored</strong> for verification only.
                </span>
              </label>
            ) : null}

            <div className="mx-auto mt-5 w-full max-w-[320px] shrink-0 space-y-3 px-5 pb-1">
              {phase === 'consent' ? (
                <Button
                  type="button"
                  onClick={handleStartRegistration}
                  disabled={!canStart}
                  className="h-14 w-full rounded-full text-base font-semibold disabled:bg-[#c8d4e2] disabled:text-white"
                >
                  {loading ? 'Starting...' : 'Start Registration'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goToImageChallenge}
                  variant="primary"
                  className="h-14 w-full rounded-full text-base font-semibold"
                >
                  Continue — describe images
                </Button>
              )}
              {phase === 'consent' && micError ? (
                <p className="text-center text-xs leading-snug text-red-600">{micError}</p>
              ) : null}

              <button
                type="button"
                onClick={skipForNow}
                className="w-full pb-0.5 text-center text-base font-medium text-[var(--color-text-muted-1)]"
              >
                Skip for Now
              </button>
            </div>
          </>
        )}
      </div>
    </MobileContainer>
  )
}
