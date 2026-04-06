const BAR_HEIGHTS = [4, 6, 9, 13, 18, 24, 30, 36, 42, 46, 44, 40, 34, 28, 22, 18, 14, 10, 8, 6, 4]

interface WaveformProps {
  active?: boolean
  className?: string
}

/** Animated bar waveform — same visual as the listening sheet on Home. */
export function Waveform({ active = true, className }: WaveformProps) {
  return (
    <div className={`flex items-end justify-center gap-[5px] ${className ?? ''}`}>
      {BAR_HEIGHTS.map((height, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-[var(--color-brand-400)] transition-all duration-300"
          style={{
            height: `${height}px`,
            animationName: active ? 'waveBar' : 'none',
            animationDuration: '1.2s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
    </div>
  )
}
