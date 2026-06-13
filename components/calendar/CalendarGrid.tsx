'use client'

import CalendarCell from './CalendarCell'
import { DAY_NAMES } from '@/lib/calendar-utils'
import type { ScheduleEntry, ConstraintViolation } from '@/lib/types'

interface CalendarGridProps {
  weeks: Date[][]
  year: number
  month: number
  entriesByDate: Map<string, ScheduleEntry[]>
  violationsByDate: Map<string, ConstraintViolation[]>
  onDayClick: (dateStr: string) => void
}

export default function CalendarGrid({
  weeks,
  year,
  month,
  entriesByDate,
  violationsByDate,
  onDayClick,
}: CalendarGridProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className={`py-2 text-center text-xs font-semibold uppercase tracking-wide ${
              name === 'Sat' || name === 'Sun' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(100px, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
              return (
                <CalendarCell
                  key={dateStr}
                  date={day}
                  year={year}
                  month={month}
                  entries={entriesByDate.get(dateStr) ?? []}
                  violations={violationsByDate.get(dateStr) ?? []}
                  onClick={onDayClick}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
