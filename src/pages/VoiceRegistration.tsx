import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { MicIcon, VolumeIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import { ImageDescribeSheet, type ImageDescribeSheetState } from '@/components/voice-registration/ImageDescribeSheet'
import { VoiceRegistrationSuccess } from '@/components/voice-registration/VoiceRegistrationSuccess'
import { useMicLevel } from '@/hooks/useMicLevel'
import { API_BASE, VOICEPRINT_API_BASE } from '@/lib/constants'
import { stopSpeech, speakText } from '@/lib/speech'
import {
  pickRandomRegistrationImages,
  VOICE_REGISTRATION_STEP_COUNT,
  type VoiceRegistrationImageItem,
} from '@/data/voiceRegistrationImages'
import { useLanguage, useTranslation } from '@/i18n/LanguageHooks'
import { allowVoiceSkip, disallowVoiceSkip, getActiveCustomer, markVoiceRegistered } from '@/lib/demoCustomer'
import { useAuth } from '@/contexts/AuthContext'
import { getDeviceId } from '@/lib/device'

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
  const { refreshActiveCustomer } = useAuth()
  const { language } = useLanguage()
  const { t } = useTranslation()
  const activeCustomer = getActiveCustomer()
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
  const negotiatingRef = useRef(false)
  const hasNegotiatedRef = useRef(false)
  const imageFinalizeLockRef = useRef(false)
  const sessionImagesRef = useRef<VoiceRegistrationImageItem[]>([])

  const [sessionImages, setSessionImages] = useState<VoiceRegistrationImageItem[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [sheetState, setSheetState] = useState<ImageDescribeSheetState>('micIdle')
  const [countdown, setCountdown] = useState(3)
  const [recordProgress, setRecordProgress] = useState(0)
  const countdownToRecordingRef = useRef(false)
  const speechDetectedDuringRecordingRef = useRef(false)

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
    hasNegotiatedRef.current = false
    negotiatingRef.current = false
    setIsRtcReady(false)
  }, [])

  useEffect(() => {
    return () => {
      disconnectRtc()
      stopSpeech()
    }
  }, [disconnectRtc])

  const waitForIceGathering = useCallback((pc: RTCPeerConnection) => {
    if (pc.iceGatheringState === 'complete') return Promise.resolve()
    return new Promise<void>((resolve) => {
      let tid: ReturnType<typeof setTimeout>
      const cleanup = () => {
        clearTimeout(tid)
        pc.removeEventListener('icegatheringstatechange', onStateChange)
      }
      const onStateChange = () => {
        if (pc.iceGatheringState === 'complete') {
          cleanup()
          resolve()
        }
      }
      pc.addEventListener('icegatheringstatechange', onStateChange)
      tid = window.setTimeout(() => {
        cleanup()
        resolve()
      }, 8000)
      if (pc.iceGatheringState === 'complete') {
        cleanup()
        resolve()
      }
    })
  }, [])

  const negotiate = useCallback(async () => {
    const pc = pcRef.current
    const sid = rtcSessionIdRef.current
    const enrollmentSid = enrollmentSessionIdRef.current
    const backendBase = getRegistrationBackendBase()
    if (!pc || !sid) return

    if (hasNegotiatedRef.current) return
    if (negotiatingRef.current) return
    if (pc.signalingState !== 'stable') return

    negotiatingRef.current = true
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)
      const accessToken = localStorage.getItem('voicebank.access_token')
      const offerRes = await fetch(`${backendBase}/sessions/${sid}/api/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
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
      if ((pc.signalingState as string) === 'closed') return
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      hasNegotiatedRef.current = true
    } finally {
      negotiatingRef.current = false
    }
  }, [waitForIceGathering])

  const startEnrollmentRealtime = useCallback(async () => {
    if (connectingRtcRef.current) return
    if (pcRef.current && enrollmentSessionIdRef.current && rtcSessionIdRef.current) return
    connectingRtcRef.current = true
    setMicError(null)
    try {
      const backendBase = getRegistrationBackendBase()
      const startPayload = {
        customer_id: activeCustomer?.voice_customer_id ?? activeCustomer?.customer_id ?? 'test-user',
        device_id: getDeviceId(),
        total_steps: sessionImagesRef.current.length || VOICE_REGISTRATION_STEP_COUNT,
      }
      // Support both backend mounting styles:
      // 1) <base>/start
      // 2) <base>/enrollment/start
      const startCandidates = [`${backendBase}/start`, `${backendBase}/enrollment/start`]
      let startEnrollmentPayload: { session_id?: string; status?: string; [k: string]: unknown } | null = null
      let startEnrollmentError: string | null = null
      const registrationToken = localStorage.getItem('voicebank.access_token')
      for (const url of startCandidates) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(registrationToken ? { 'Authorization': `Bearer ${registrationToken}` } : {})
          },
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

      const rtcAccessToken = localStorage.getItem('voicebank.access_token')
      const startRtc = await fetch(`${backendBase}/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(rtcAccessToken ? { 'Authorization': `Bearer ${rtcAccessToken}` } : {})
        },
        body: JSON.stringify({ session_id: enrollmentId }),
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

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (mediaError) {
        // Handle getUserMedia specific errors
        if (mediaError instanceof DOMException) {
          if (mediaError.name === 'NotAllowedError') {
            throw new Error(t('micPermissionDenied') + '. ' + t('micPermissionInstructions'))
          } else if (mediaError.name === 'NotFoundError') {
            throw new Error(t('micNotFound'))
          } else {
            throw new Error(t('micAccessError'))
          }
        }
        throw new Error(t('micAccessError'))
      }
      micStreamRef.current = stream
      setMicStream(stream)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setIsRtcReady(true)
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          setIsRtcReady(false)
        }
      }

      pc.onnegotiationneeded = () => {
        void negotiate().catch((e) => setMicError(e instanceof Error ? e.message : 'Negotiation failed'))
      }
      // negotiate() runs from onnegotiationneeded after addTrack — do not call manually.
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
    speechDetectedDuringRecordingRef.current = false
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
        speechDetectedDuringRecordingRef.current = false
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
    if (micActiveImage) {
      speechDetectedDuringRecordingRef.current = true
    }
  }, [sheetState, micActiveImage])

  useEffect(() => {
    if (sheetState !== 'recording') return
    const id = window.setInterval(() => {
      setRecordProgress((p) => {
        if (p >= 100) return 100
        const n = p + 1
        if (n >= 100 && !imageFinalizeLockRef.current) {
          imageFinalizeLockRef.current = true
          if (!speechDetectedDuringRecordingRef.current) {
            setEnrollError('No voice detected. Try again.')
            setSheetState('micIdle')
            setCountdown(3)
            countdownToRecordingRef.current = false
            return 0
          }
          setSheetState('review')
        }
        return n
      })
    }, 110)
    return () => clearInterval(id)
  }, [sheetState])

  const skipForNow = () => {
    if (activeCustomer?.customer_id) {
      allowVoiceSkip(activeCustomer.customer_id)
    }
    disconnectRtc()
    stopSpeech()
    refreshActiveCustomer()
    navigate('/home')
  }

  const beginImageChallenge = useCallback(() => {
    const picked = pickRandomRegistrationImages(VOICE_REGISTRATION_STEP_COUNT)
    sessionImagesRef.current = picked
    setSessionImages(picked)
    stopSpeech()
    setImageIndex(0)
    setSheetState('micIdle')
    setCountdown(3)
    setRecordProgress(0)
    countdownToRecordingRef.current = false
    setEnrollError(null)
    setPhase('imageChallenge')
  }, [])

  const goToImageChallenge = () => {
    beginImageChallenge()
  }

  async function handleStartRegistration() {
    if (!canStart) return
    setLoading(true)
    setMicError(null)
    try {
      // Test microphone access early to provide immediate feedback
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the test stream immediately since we just wanted to check permission
      stopMediaStream(testStream)
      beginImageChallenge()
    } catch (e) {
      if (e instanceof DOMException) {
        if (e.name === 'NotAllowedError') {
          setMicError(t('micPermissionDenied') + '. ' + t('micPermissionInstructions'))
        } else if (e.name === 'NotFoundError') {
          setMicError(t('micNotFound'))
        } else {
          setMicError(t('micAccessError'))
        }
      } else {
        setMicError(t('micAccessError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const playImageDescription = () => {
    const item = sessionImages[imageIndex]
    if (!item) return
    const localizedDescription = item.spokenDescriptions[language] || item.spokenDescriptions.en
    speakText(localizedDescription, language)
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
    if (submitLoading) return
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
      const accessToken = localStorage.getItem('voicebank.access_token')
      const res = await fetch(`${backendBase}/enrollment/${sid}/submit-step`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ step_index: imageIndex + 1 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = (err as { detail?: string }).detail
        throw new Error(detail || `Step submit failed (${res.status})`)
      }
      const data = await res.json()
      if (data.status === 'enrolled' || imageIndex >= sessionImages.length - 1) {
        setEnrollError(null)  // Clear any previous errors on success
        setPhase('success')
      } else {
        setEnrollError(null)  // Clear errors when moving to next image
        setImageIndex((i) => i + 1)
      }
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : 'Could not submit this step.')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleStartBanking() {
    if (activeCustomer?.customer_id) {
      markVoiceRegistered(activeCustomer.customer_id)
      disallowVoiceSkip(activeCustomer.customer_id)
    }
    disconnectRtc()
    stopSpeech()
    refreshActiveCustomer()
    navigate('/home')
  }

  const currentImage = sessionImages[imageIndex]

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
                {t('voiceRegistrationSetupPrefix')}{' '}
              </h1>
              <h1 className="text-xl font-bold leading-snug text-[var(--color-brand-900)]">
                <span className="text-[var(--color-brand-500)]">{t('voiceRegistrationSetupHighlight')}</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted-2)]">{t('voiceRegistrationTakesUnder30s')}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted-3)]">
                {t('voiceRegistrationImageXOfY', {
                  current: imageIndex + 1,
                  total: sessionImages.length,
                })}
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
                  data-testid="voice-registration-play-audio-btn"
                  aria-label={t('voiceRegistrationPlayImageDescription')}
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
              isSubmitting={submitLoading}
            />
            {micError ? (
              <div className="mx-auto mt-3 max-w-[320px] rounded-xl bg-red-50 px-4 py-3 text-center">
                <p className="text-sm font-semibold leading-snug text-red-700">{micError}</p>
              </div>
            ) : null}
            {!isRtcReady && enrollmentSessionId ? (
              <p className="mx-auto mt-1 max-w-[320px] text-center text-[11px] text-[var(--color-text-muted-2)]">
                {t('voiceRegistrationConnectingSession')}
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
                {t('voiceRegistrationEnableTitle')}
              </h1>
              <p className="mt-1.5 max-w-[340px] text-center text-sm font-medium leading-snug text-[var(--color-text-muted-1)] text-balance">
                {t('voiceRegistrationEnableSubtitle')}
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
                          {t('voiceRegistrationBenefitSecurityTitle')}
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          {t('voiceRegistrationBenefitSecurityDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm leading-none text-[var(--color-brand-500)]">
                        ⚡
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug text-[var(--color-brand-900)]">
                          {t('voiceRegistrationBenefitQuickTitle')}
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          {t('voiceRegistrationBenefitQuickDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(32,114,178,0.1)] text-sm leading-none text-[var(--color-brand-500)]">
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug text-[var(--color-brand-900)]">
                          {t('voiceRegistrationBenefitStepsTitle')}
                        </div>
                        <p className="mt-0.5 text-xs leading-[1.35] text-[var(--color-text-muted-1)]">
                          {t('voiceRegistrationBenefitStepsDesc')}
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
                    <p className="text-center text-sm font-semibold text-[var(--color-brand-500)]">{t('voiceRegistrationSpeaking')}</p>
                    <p className="max-w-[260px] text-center text-[10px] leading-tight text-[var(--color-text-muted-2)]">
                      {t('voiceRegistrationSpeakingHint')}
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
                  data-testid="voice-registration-consent-checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-[#9bb0c7]"
                />
                <span className="text-pretty">
                  {t('voiceRegistrationConsentPrefix')} <strong>{t('voiceRegistrationConsentVoiceData')}</strong>{' '}
                  {t('voiceRegistrationConsentFor')} <strong>{t('voiceRegistrationConsentAuthentication')}</strong>.{' '}
                  {t('voiceRegistrationConsentRecordings')} <strong>{t('voiceRegistrationConsentSecurelyStored')}</strong>{' '}
                  {t('voiceRegistrationConsentVerificationOnly')}
                </span>
              </label>
            ) : null}

            <div className="mx-auto mt-5 w-full max-w-[320px] shrink-0 space-y-3 px-5 pb-1">
              {phase === 'consent' ? (
                <Button
                  type="button"
                  data-testid="voice-registration-start-btn"
                  onClick={handleStartRegistration}
                  disabled={!canStart}
                  className="h-14 w-full rounded-full text-base font-semibold disabled:bg-[#c8d4e2] disabled:text-white"
                >
                  {loading ? t('voiceRegistrationStarting') : t('voiceRegistrationStartCta')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goToImageChallenge}
                  variant="primary"
                  className="h-14 w-full rounded-full text-base font-semibold"
                >
                  {t('voiceRegistrationContinueDescribe')}
                </Button>
              )}
              {phase === 'consent' && micError ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                  <p className="text-sm font-semibold leading-snug text-red-700">{micError}</p>
                </div>
              ) : null}

              <button
                type="button"
                data-testid="voice-registration-skip-btn"
                onClick={skipForNow}
                className="w-full pb-0.5 text-center text-base font-medium text-[var(--color-text-muted-1)]"
              >
                {t('voiceRegistrationSkipForNow')}
              </button>
            </div>
          </>
        )}
      </div>
    </MobileContainer>
  )
}
