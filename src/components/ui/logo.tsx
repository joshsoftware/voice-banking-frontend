import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 280, className }: LogoProps) {
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width: size, height: size }}>
      {/* Outer rings */}
      <div className="absolute inset-[3.57%]">
        <div className="size-full rounded-full border-4 border-blue-300/30" />
      </div>
      <div className="absolute inset-[14.29%]">
        <div className="size-full rounded-full border-4 border-blue-300/40" />
      </div>
      <div className="absolute inset-[28.57%]">
        <div className="size-full rounded-full border-4 border-blue-400/50" />
      </div>

      {/* Center circle with gradient */}
      <div className="absolute inset-[40.71%_41.79%_36.07%_39.29%]">
        <div className="size-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
      </div>

      {/* Corner decorative elements */}
      <div className="absolute inset-[30.71%_66.43%_66.43%_30.71%]">
        <div className="size-full rounded-full bg-blue-300/20" />
      </div>
      <div className="absolute inset-[30.71%_30.71%_66.43%_66.43%]">
        <div className="size-full rounded-full bg-blue-300/20" />
      </div>
      <div className="absolute inset-[66.43%_30.71%_30.71%_66.43%]">
        <div className="size-full rounded-full bg-blue-300/20" />
      </div>
      <div className="absolute inset-[66.43%_66.43%_30.71%_30.71%]">
        <div className="size-full rounded-full bg-blue-300/20" />
      </div>

      {/* Soundwave elements */}
      <div className="absolute inset-[47.14%_84.29%_47.14%_14.29%]">
        <div className="size-full rounded-full bg-blue-400/60" />
      </div>
      <div className="absolute inset-[45.71%_81.43%_45.71%_17.14%]">
        <div className="size-full rounded-full bg-blue-400/50" />
      </div>
      <div className="absolute inset-[43.57%_78.57%_43.57%_20%]">
        <div className="size-full rounded-full bg-blue-400/40" />
      </div>
      <div className="absolute inset-[42.14%_75.71%_42.14%_22.86%]">
        <div className="size-full rounded-full bg-blue-400/30" />
      </div>
      <div className="absolute inset-[44.29%_72.86%_44.29%_25.71%]">
        <div className="size-full rounded-full bg-blue-400/20" />
      </div>
    </div>
  )
}
