import { useState } from 'react'
import { MicIcon, VolumeIcon, VolumeMutedIcon } from '@/components/ui/icons'

interface VoiceSheetProps {
  onStart?: () => void
}

export function VoiceSheet({ onStart }: VoiceSheetProps) {
  const [muted, setMuted] = useState(false)

  return (
    <div className="absolute bottom-0 left-0 w-full">
      <div className="rounded-t-3xl bg-white px-5 py-2 shadow-[-0.5px_-3px_4px_0px_rgba(174,174,174,0.25)]">
        <div className="mx-auto w-full max-w-[356px] px-3">
          <div className="flex flex-col items-center gap-6 md:gap-[76px]">
            {/* Handle */}
            <div className="h-0.5 w-10 rounded-full bg-black/40" />

            <div className="flex w-full flex-col items-center gap-12 md:gap-[60px]">
              {/* Voice button container */}
              <div className="w-52 rounded-[52px] bg-white px-3 py-2 shadow-[0px_3px_4px_0px_rgba(0,0,0,0.25),0.5px_-5px_4px_0px_#efefef]">
                <button
                  type="button"
                  aria-label="Start voice conversation"
                  onClick={onStart}
                  className="flex h-16 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#2072b2] to-[#13324a] shadow-[0px_25px_50px_0px_rgba(26,69,104,0.5)] transition-transform hover:scale-105 active:scale-95"
                >
                  <MicIcon className="text-white" />
                </button>
              </div>

              {/* Instructions */}
              <div className="text-center text-lg font-semibold leading-7 text-[#1a476a]">
                <div>Say &ldquo;Hey, Fin&rdquo;</div>
                <div>to start conversation</div>
              </div>
            </div>

            {/* Mute button */}
            <div className="flex w-full items-center justify-end gap-2 pb-2">
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
