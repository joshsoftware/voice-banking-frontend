import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'

function Waveform() {
  const bars = useMemo(
    () => [4, 6, 9, 13, 18, 24, 30, 36, 42, 46, 44, 40, 34, 28, 22, 18, 14, 10, 8, 6, 4],
    []
  )

  return (
    <div className="flex items-end justify-center gap-[5px]">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-1.5 rounded-full bg-[#2f80c8] transition-all duration-300"
          style={{
            height: `${height}px`,
            opacity: index === Math.floor(bars.length / 2) ? 1 : 0.9,
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.05}s`,
          }}
        />
      ))}
    </div>
  )
}

interface ListeningSheetProps {
  onSubmit: () => void
}

export function ListeningSheet({ onSubmit }: ListeningSheetProps) {
  const [muted, setMuted] = useState(false)

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-white px-5 py-2 shadow-[-0.5px_-3px_4px_0px_rgba(174,174,174,0.25)]">
        <div className="mx-auto w-full max-w-[356px] px-3">
          <div className="flex flex-col items-center gap-6 pb-2">
            {/* Handle */}
            <div className="h-0.5 w-10 rounded-full bg-black/40" />

            <div className="flex w-full flex-col items-center gap-7 pt-8">
              {/* Listening status */}
              <div className="text-sm font-medium leading-5 text-[#2072b2]">Listening...</div>

              {/* Waveform */}
              <Waveform />

              {/* Submit button */}
              <Button
                type="button"
                onClick={onSubmit}
                variant="success"
                className="mt-4 h-16 w-52 rounded-full"
              >
                Submit
              </Button>
            </div>

            {/* Mute button */}
            <div className="mt-8 flex w-full items-center justify-end gap-2">
              <div className="text-center text-[10px] font-medium leading-normal text-[rgba(26,71,106,0.5)]">
                Tap to {muted ? 'unmute' : 'mute'}
              </div>
              <button
                type="button"
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => setMuted(!muted)}
                className="grid size-10 place-items-center rounded-full bg-[#f5f7fa] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-colors hover:bg-gray-200"
              >
                {muted ? (
                  <VolumeMutedIcon className="text-[#2072b2]" />
                ) : (
                  <VolumeIcon className="text-[#2072b2]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
