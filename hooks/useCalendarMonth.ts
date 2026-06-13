'use client'

import { useMemo } from 'react'
import { useScheduleStore } from '@/lib/store'
import { getMonthWeeks } from '@/lib/calendar-utils'
import type { ScheduleEntry } from '@/lib/types'

export function useCalendarMonth(year: number, month: number) {
  const schedules = useScheduleStore((s) => s.schedules)
  const violations = useScheduleStore((s) => s.violations)

  const schedule = useMemo(
    () => schedules.find((s) => s.year === year && s.month === month) ?? null,
    [schedules, year, month]
  )

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>()
    if (!schedule) return map
    for (const entry of schedule.entries) {
      const list = map.get(entry.date) ?? []
      list.push(entry)
      map.set(entry.date, list)
    }
    return map
  }, [schedule])

  const violationsByDate = useMemo(() => {
    const map = new Map<string, typeof violations>()
    for (const v of violations) {
      const list = map.get(v.date) ?? []
      list.push(v)
      map.set(v.date, list)
    }
    return map
  }, [violations])

  return { weeks, entriesByDate, violationsByDate, schedule, violations }
}
