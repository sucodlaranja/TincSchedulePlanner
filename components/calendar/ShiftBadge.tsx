import type { Shift } from '@/lib/types'

interface ShiftBadgeProps {
  shift: Shift
  count: number
  min?: number
  max?: number
}

export default function ShiftBadge({ shift, count, min, max }: ShiftBadgeProps) {
  const belowMin = min !== undefined && count < min
  const aboveMax = max !== undefined && count > max

  return (
    <div
      className="px-1.5 py-1 rounded text-[11px] font-medium"
      style={{ backgroundColor: shift.color + '18', color: shift.color }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{shift.name}</span>
        <span className={`shrink-0 font-bold ${belowMin ? 'text-red-600' : aboveMax ? 'text-amber-600' : ''}`}>
          {count}
          {belowMin && ' ⚠'}
          {aboveMax && ' ▲'}
        </span>
      </div>
      <div className="text-[10px] opacity-60 leading-tight mt-0.5">
        {shift.startTime}–{shift.endTime}
      </div>
    </div>
  )
}
