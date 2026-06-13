'use client'

import { useScheduleStore } from '@/lib/store'
import Input from '@/components/ui/Input'
import type { ShiftConstraints } from '@/lib/types'

export default function ConstraintConfigForm() {
  const config = useScheduleStore((s) => s.config)
  const setConstraint = useScheduleStore((s) => s.setConstraint)

  if (!config || config.shifts.length === 0) {
    return <p className="text-sm text-gray-500">Add shifts first to configure constraints.</p>
  }

  function handleChange(shiftId: string, field: keyof Omit<ShiftConstraints, 'shiftId'>, value: string) {
    const existing = config!.constraints.find((c) => c.shiftId === shiftId) ?? {
      shiftId,
      weekdayMin: 5,
      weekdayMax: 99,
      weekendMin: 0,
      weekendMax: 4,
    }
    setConstraint({ ...existing, [field]: Math.max(0, parseInt(value) || 0) })
  }

  return (
    <div className="space-y-4">
      {config.shifts.map((shift) => {
        const c = config.constraints.find((con) => con.shiftId === shift.id) ?? {
          shiftId: shift.id,
          weekdayMin: 5,
          weekdayMax: 99,
          weekendMin: 0,
          weekendMax: 4,
        }
        return (
          <div key={shift.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
              <span className="text-sm font-semibold text-gray-800">{shift.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weekday</p>
                <Input
                  label="Min workers"
                  type="number"
                  min={0}
                  value={c.weekdayMin}
                  onChange={(e) => handleChange(shift.id, 'weekdayMin', e.target.value)}
                />
                <Input
                  label="Max workers"
                  type="number"
                  min={0}
                  value={c.weekdayMax === 99 ? '' : c.weekdayMax}
                  placeholder="No limit"
                  onChange={(e) => handleChange(shift.id, 'weekdayMax', e.target.value || '99')}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weekend</p>
                <Input
                  label="Min workers"
                  type="number"
                  min={0}
                  value={c.weekendMin}
                  onChange={(e) => handleChange(shift.id, 'weekendMin', e.target.value)}
                />
                <Input
                  label="Max workers"
                  type="number"
                  min={0}
                  value={c.weekendMax}
                  onChange={(e) => handleChange(shift.id, 'weekendMax', e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
