import {
  getDaysInMonth,
  groupByISOWeek,
  toDateString,
  isWeekendDay,
  isWeekdayDay,
  getISOWeekNumber,
} from './calendar-utils'
import type {
  ScheduleConfig,
  ScheduleEntry,
  MonthSchedule,
  ConstraintViolation,
  WorkerId,
  ShiftId,
  Shift,
} from './types'

export interface GenerateResult {
  schedule: MonthSchedule
  violations: ConstraintViolation[]
}

function isShiftActiveOnDay(shift: Shift, date: Date): boolean {
  return (shift.activeDays ?? []).length === 0 || (shift.activeDays ?? []).includes(date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)
}

// Normalize legacy worker preferences (preferWeekendsOff boolean → preferredDaysOff array)
function normalizeDaysOff(prefs: { preferredDaysOff?: number[]; preferWeekendsOff?: boolean; preferredShiftId?: string | null }): number[] {
  if (Array.isArray(prefs.preferredDaysOff)) return prefs.preferredDaysOff
  if ((prefs as { preferWeekendsOff?: boolean }).preferWeekendsOff) return [0, 6]
  return []
}

export function generateMonthSchedule(
  config: ScheduleConfig,
  year: number,
  month: number,
  existingSchedule?: MonthSchedule
): GenerateResult {
  const days = getDaysInMonth(year, month)
  const activeWorkers = config.workers.filter((w) => w.active)

  // Build index of existing manual overrides to preserve
  const manualOverrides = new Map<string, ScheduleEntry>()
  if (existingSchedule) {
    for (const entry of existingSchedule.entries) {
      if (entry.status === 'manual') {
        manualOverrides.set(`${entry.workerId}|${entry.date}`, entry)
      }
    }
  }

  // Step 1: For each day, determine which shift each group works
  const dayGroupShift = new Map<string, { A: ShiftId; B: ShiftId }>()
  for (const day of days) {
    const dateStr = toDateString(day)
    const isoWeek = getISOWeekNumber(day)
    const isOddWeek = isoWeek % 2 === 1

    const shiftA = isOddWeek ? config.groupAShiftWeek1 : config.groupBShiftWeek1
    const shiftB = isOddWeek ? config.groupBShiftWeek1 : config.groupAShiftWeek1

    dayGroupShift.set(dateStr, { A: shiftA, B: shiftB })
  }

  // Step 2: Assign days off per worker per ISO week
  const workerDaysOff = new Map<WorkerId, Set<string>>()
  for (const worker of activeWorkers) {
    workerDaysOff.set(worker.id, new Set())
  }

  const weekGroups = groupByISOWeek(days)

  for (const [isoWeek, weekDays] of weekGroups) {
    // Sort: Mon-Fri first, then Sat, Sun
    const sorted = [...weekDays].sort((a, b) => {
      const aDow = a.getDay() === 0 ? 7 : a.getDay()
      const bDow = b.getDay() === 0 ? 7 : b.getDay()
      return aDow - bDow
    })

    const maxDaysOffThisWeek = Math.max(0, Math.min(config.daysOffPerWeek, sorted.length - 1))

    activeWorkers.forEach((worker, workerIndex) => {
      const preferredDaysOff = normalizeDaysOff(worker.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean; preferredShiftId?: string | null })

      const offset = (isoWeek + workerIndex * 3) % sorted.length
      const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)]

      // Move preferred days to front of candidate list
      let candidates: Date[]
      if (preferredDaysOff.length > 0) {
        const preferred = rotated.filter((d) => preferredDaysOff.includes(d.getDay()))
        const rest = rotated.filter((d) => !preferredDaysOff.includes(d.getDay()))
        candidates = [...preferred, ...rest]
      } else {
        candidates = rotated
      }

      const daysOffToAssign = candidates.slice(0, maxDaysOffThisWeek)
      const daysOffSet = workerDaysOff.get(worker.id)!
      for (const d of daysOffToAssign) {
        daysOffSet.add(toDateString(d))
      }
    })
  }

  // Step 3: Build entries
  const entries: ScheduleEntry[] = []

  for (const worker of activeWorkers) {
    const daysOffSet = workerDaysOff.get(worker.id)!

    for (const day of days) {
      const dateStr = toDateString(day)
      const key = `${worker.id}|${dateStr}`

      if (manualOverrides.has(key)) {
        entries.push(manualOverrides.get(key)!)
        continue
      }

      if (daysOffSet.has(dateStr)) {
        entries.push({ workerId: worker.id, date: dateStr, shiftId: null, status: 'off', note: '' })
        continue
      }

      const groupShifts = dayGroupShift.get(dateStr)!
      const shiftId = groupShifts[worker.shiftGroup]
      const shift = config.shifts.find((s) => s.id === shiftId)

      // If the assigned shift doesn't run on this day, worker is off
      if (shift && !isShiftActiveOnDay(shift, day)) {
        entries.push({ workerId: worker.id, date: dateStr, shiftId: null, status: 'off', note: '' })
        continue
      }

      entries.push({ workerId: worker.id, date: dateStr, shiftId, status: 'auto', note: '' })
    }
  }

  // Step 4: Enforce weekend max constraint (hard) — only for shifts active on that day
  const weekendDays = days.filter((d) => isWeekendDay(d))
  for (const day of weekendDays) {
    const dateStr = toDateString(day)
    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      if (!constraint) continue

      const working = entries.filter(
        (e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off'
      )

      if (working.length > constraint.weekendMax) {
        const excess = working.length - constraint.weekendMax
        const preferSorted = [...working].sort((a, b) => {
          const wa = activeWorkers.find((w) => w.id === a.workerId)
          const wb = activeWorkers.find((w) => w.id === b.workerId)
          const aDaysOff = normalizeDaysOff(wa?.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean } ?? {})
          const bDaysOff = normalizeDaysOff(wb?.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean } ?? {})
          const aScore = aDaysOff.includes(day.getDay()) ? 1 : 0
          const bScore = bDaysOff.includes(day.getDay()) ? 1 : 0
          return bScore - aScore
        })
        const toRemove = preferSorted.slice(0, excess)
        for (const entry of toRemove) {
          const idx = entries.findIndex((e) => e.workerId === entry.workerId && e.date === entry.date)
          if (idx >= 0) {
            entries[idx] = { ...entries[idx], shiftId: null, status: 'off' }
          }
        }
      }
    }
  }

  // Step 5: Check min constraints (soft — produces violations) — skip inactive shifts
  const violations: ConstraintViolation[] = []

  const weekdayDays = days.filter((d) => isWeekdayDay(d))
  for (const day of weekdayDays) {
    const dateStr = toDateString(day)
    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      if (!constraint) continue

      const count = entries.filter(
        (e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off'
      ).length

      if (count < constraint.weekdayMin) {
        violations.push({ date: dateStr, shiftId: shift.id, type: 'below_min', actual: count, limit: constraint.weekdayMin })
      }
    }
  }

  for (const day of weekendDays) {
    const dateStr = toDateString(day)
    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      if (!constraint) continue

      const count = entries.filter(
        (e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off'
      ).length

      if (constraint.weekendMin > 0 && count < constraint.weekendMin) {
        violations.push({ date: dateStr, shiftId: shift.id, type: 'below_min', actual: count, limit: constraint.weekendMin })
      }
    }
  }

  return {
    schedule: { year, month, configId: config.id, entries },
    violations,
  }
}
