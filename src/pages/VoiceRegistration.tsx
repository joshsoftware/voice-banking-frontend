import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { MicIcon, VolumeIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Waveform } from '@/components/ui/waveform'
import { ImageDescribeSheet, type ImageDescribeSheetState } from '@/components/voice-registration/ImageDescribeSheet'
import { VoiceRegistrationSuccess } from '@/components/voice-registration/VoiceRegistrationSuccess'
import { useMicLevel } from '@/hooks/useMicLevel'
import { stopSpeech, speakText } from '@/lib/speech'
import { VOICE_REGISTRATION_IMAGES } from '@/data/voiceRegistrationImages'
import {
  completeVoiceRegistration,
  startVoiceRegistration,
  submitVoiceConsent,
} from '@/services/voiceRegistration'

type Phase = 'consent' | 'initialRecording' | 'imageChallenge' | 'success'

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

export default function VoiceRegistration() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('consent')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registrationId, setRegistrationId] = useState<string | null>(null)

  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  const [imageIndex, setImageIndex] = useState(0)
  const [sheetState, setSheetState] = useState<ImageDescribeSheetState>('micIdle')
  const [countdown, setCountdown] = useState(3)
  const [recordProgress, setRecordProgress] = useState(0)
  const [imageRecStream, setImageRecStream] = useState<MediaStream | null>(null)
  const imageRecStreamRef = useRef<MediaStream | null>(null)
  const countdownToRecordingRef = useRef(false)

  const micActiveInitial = useMicLevel(phase === 'initialRecording' ? micStream : null)
  const micActiveImage = useMicLevel(
    phase === 'imageChallenge' && sheetState === 'recording' ? imageRecStream : null
  )

  const canStart = useMemo(() => consent && !loading, [consent, loading])

  const stopInitialMic = useCallback(() => {
    stopMediaStream(micStreamRef.current)
    micStreamRef.current = null
    setMicStream(null)
  }, [])

  const stopImageMic = useCallback(() => {
    stopMediaStream(imageRecStreamRef.current)
    imageRecStreamRef.current = null
    setImageRecStream(null)
  }, [])

  useEffect(() => {
    micStreamRef.current = micStream
  }, [micStream])

  useEffect(() => {
    imageRecStreamRef.current = imageRecStream
  }, [imageRecStream])

  useEffect(() => {
    return () => {
      stopMediaStream(micStreamRef.current)
      stopMediaStream(imageRecStreamRef.current)
      stopSpeech()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'imageChallenge') return
    stopImageMic()
    setSheetState('micIdle')
    setCountdown(3)
    setRecordProgress(0)
    countdownToRecordingRef.current = false
  }, [imageIndex, phase, stopImageMic])

  useEffect(() => {
    if (sheetState !== 'countdown' || countdown > 0) return
    if (countdownToRecordingRef.current) return
    countdownToRecordingRef.current = true
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        imageRecStreamRef.current = stream
        setImageRecStream(stream)
        setRecordProgress(0)
        setSheetState('recording')
      } catch {
        setSheetState('micIdle')
        setCountdown(3)
        countdownToRecordingRef.current = false
      }
    })()
  }, [sheetState, countdown])

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
        if (n >= 100) {
          window.setTimeout(() => {
            stopMediaStream(imageRecStreamRef.current)
            imageRecStreamRef.current = null
            setImageRecStream(null)
            setSheetState('review')
          }, 0)
        }
        return n
      })
    }, 110)
    return () => clearInterval(id)
  }, [sheetState])

  const skipForNow = () => {
    stopInitialMic()
    stopImageMic()
    stopSpeech()
    navigate('/home')
  }

  const goToImageChallenge = () => {
    stopInitialMic()
    stopSpeech()
    setImageIndex(0)
    setSheetState('micIdle')
    setCountdown(3)
    setRecordProgress(0)
    countdownToRecordingRef.current = false
    setPhase('imageChallenge')
  }

  async function handleStartRegistration() {
    if (!canStart) return
    setLoading(true)
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      setMicStream(stream)
      try {
        const start = await startVoiceRegistration('isha-kulkarni')
        setRegistrationId(start.registrationId)
        await submitVoiceConsent(start.registrationId, true)
      } catch {
        // Backend optional until wired.
      }
      setPhase('initialRecording')
    } catch (e) {
      stopInitialMic()
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
    countdownToRecordingRef.current = false
    setCountdown(3)
    setSheetState('countdown')
  }

  const handleRerecord = () => {
    stopImageMic()
    setRecordProgress(0)
    countdownToRecordingRef.current = false
    setSheetState('micIdle')
    setCountdown(3)
  }

  const handleImageSubmit = () => {
    stopImageMic()
    stopSpeech()
    if (imageIndex < VOICE_REGISTRATION_IMAGES.length - 1) {
      setImageIndex((i) => i + 1)
    } else {
      setPhase('success')
    }
  }

  async function handleStartBanking() {
    stopSpeech()
    if (registrationId) {
      try {
        await completeVoiceRegistration(registrationId)
      } catch {
        // non-blocking
      }
    }
    navigate('/home')
  }

  async function finishRegistrationEarly() {
    stopInitialMic()
    stopImageMic()
    if (!registrationId) {
      navigate('/home')
      return
    }
    try {
      await completeVoiceRegistration(registrationId)
    } catch {}
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
            <VoiceRegistrationSuccess onStartBanking={handleStartBanking} />
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
              onSubmit={handleImageSubmit}
            />
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
                      Bars reflect your microphone input.
                    </p>
                    <Waveform active={micActiveInitial} className="origin-center scale-90" />
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
                onClick={phase === 'initialRecording' ? finishRegistrationEarly : skipForNow}
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
