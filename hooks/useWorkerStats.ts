'use client'

import { useMemo } from 'react'
import { useScheduleStore } from '@/lib/store'
import type { WorkerId, ShiftId } from '@/lib/types'

export interface WorkerStats {
  totalWorkingDays: number
  totalDaysOff: number
  countByShift: Map<ShiftId, number>
  totalDays: number
}

export function useWorkerStats(workerId: WorkerId, year: number, month: number): WorkerStats {
  const schedules = useScheduleStore((s) => s.schedules)

  return useMemo(() => {
    const schedule = schedules.find((s) => s.year === year && s.month === month)
    if (!schedule) {
      return { totalWorkingDays: 0, totalDaysOff: 0, countByShift: new Map(), totalDays: 0 }
    }

    const workerEntries = schedule.entries.filter((e) => e.workerId === workerId)
    const countByShift = new Map<ShiftId, number>()
    let totalDaysOff = 0

    for (const entry of workerEntries) {
      if (entry.shiftId === null) {
        totalDaysOff++
      } else {
        countByShift.set(entry.shiftId, (countByShift.get(entry.shiftId) ?? 0) + 1)
      }
    }

    const totalWorkingDays = workerEntries.length - totalDaysOff

    return {
      totalWorkingDays,
      totalDaysOff,
      countByShift,
      totalDays: workerEntries.length,
    }
  }, [schedules, workerId, year, month])
}
