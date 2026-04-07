import { MicIcon } from '@/components/ui/icons'
import { Waveform } from '@/components/ui/waveform'

export type ImageDescribeSheetState = 'micIdle' | 'countdown' | 'recording' | 'review'

interface ImageDescribeSheetProps {
  state: ImageDescribeSheetState
  countdown: number
  recordProgress: number
  micActive: boolean
  onTapMic: () => void
  onRerecord: () => void
  onSubmit: () => void
}

export function ImageDescribeSheet({
  state,
  countdown,
  recordProgress,
  micActive,
  onTapMic,
  onRerecord,
  onSubmit,
}: ImageDescribeSheetProps) {
  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-[var(--color-surface-card)] px-4 pb-6 pt-2 shadow-[var(--shadow-sheet)]">
        <div className="mx-auto flex w-full max-w-[356px] flex-col items-center gap-4 px-1">
          <div className="h-0.5 w-10 rounded-full bg-black/35" />

          {state === 'micIdle' && (
            <>
              <div className="w-full rounded-[52px] bg-[var(--color-surface-card)] px-2 py-2 shadow-[var(--shadow-voice-btn)]">
                <button
                  type="button"
                  aria-label="Start speaking"
                  onClick={onTapMic}
                  className="flex h-16 w-full items-center justify-center rounded-full [background:var(--gradient-mic)] shadow-[var(--shadow-mic)] transition-transform active:scale-95"
                >
                  <MicIcon className="text-white" />
                </button>
              </div>
              <p className="text-center text-base font-semibold text-[var(--color-brand-600)]">
                Tap to start speaking
              </p>
            </>
          )}

          {state === 'countdown' && (
            <div className="flex w-full flex-col items-center gap-3 py-2">
              <div className="flex h-16 w-full max-w-[280px] items-center justify-center rounded-full [background:var(--gradient-mic)] px-6 shadow-[var(--shadow-mic)]">
                <span className="text-lg font-bold text-white">
                  Be ready in <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/20">{countdown}</span>
                </span>
              </div>
            </div>
          )}

          {state === 'recording' && (
            <div className="flex w-full flex-col items-center gap-3 py-1">
              <p className="text-sm font-semibold text-[var(--color-brand-500)]">
                Recording…{Math.min(100, Math.round(recordProgress))}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-app)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand-500)] transition-[width] duration-100 ease-linear"
                  style={{ width: `${Math.min(100, recordProgress)}%` }}
                />
              </div>
              <Waveform active={micActive} className="scale-90" />
            </div>
          )}

          {state === 'review' && (
            <div className="flex w-full gap-3 pt-1">
              <button
                type="button"
                onClick={onRerecord}
                className="h-12 flex-1 rounded-full border-2 border-[var(--color-brand-500)] bg-white text-sm font-semibold text-[var(--color-brand-500)] transition-colors hover:bg-[rgba(32,114,178,0.06)]"
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="h-12 flex-1 rounded-full bg-[var(--color-success-from)] text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
