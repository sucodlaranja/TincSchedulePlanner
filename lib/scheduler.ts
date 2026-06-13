import {
  getDaysInMonth,
  groupByISOWeek,
  toDateString,
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
  ShiftConstraints,
  DayGroupConstraint,
  DayOfWeek,
} from './types'

export interface GenerateResult {
  schedule: MonthSchedule
  violations: ConstraintViolation[]
}

function isShiftActiveOnDay(shift: Shift, date: Date): boolean {
  return (shift.activeDays ?? []).length === 0 || (shift.activeDays ?? []).includes(date.getDay() as DayOfWeek)
}

// Returns the days a shift is active on (all 7 if activeDays is empty)
export function getActiveDaysForShift(shift: Shift): DayOfWeek[] {
  const all: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]
  return (shift.activeDays ?? []).length === 0 ? all : shift.activeDays
}

// Normalizes legacy weekdayMin/Max/weekendMin/Max constraints into DayGroupConstraint[]
// Also handles the case where dayGroups already exists (new format)
export function normalizeDayGroups(
  constraint: (ShiftConstraints & Record<string, unknown>) | undefined,
  shift: Shift
): DayGroupConstraint[] {
  if (!constraint) return []
  if (Array.isArray(constraint.dayGroups)) {
    return constraint.dayGroups as DayGroupConstraint[]
  }
  // Legacy migration: build from weekdayMin/Max/weekendMin/Max
  const legacy = constraint as Record<string, unknown>
  const activeDays = getActiveDaysForShift(shift)
  const weekdays = activeDays.filter((d) => d !== 0 && d !== 6)
  const weekends = activeDays.filter((d) => d === 0 || d === 6)
  const groups: DayGroupConstraint[] = []
  if (weekdays.length > 0) {
    const min = (legacy.weekdayMin as number) ?? 0
    const rawMax = legacy.weekdayMax as number | undefined
    groups.push({ id: 'legacy-wd', label: 'Weekdays', days: weekdays, min, max: rawMax === 99 || rawMax === undefined ? null : rawMax })
  }
  if (weekends.length > 0) {
    const min = (legacy.weekendMin as number) ?? 0
    const rawMax = legacy.weekendMax as number | undefined
    groups.push({ id: 'legacy-we', label: 'Weekends', days: weekends, min, max: rawMax ?? null })
  }
  return groups
}

// Normalize legacy worker preferences (preferWeekendsOff boolean → preferredDaysOff array)
function normalizeDaysOff(prefs: { preferredDaysOff?: number[]; preferWeekendsOff?: boolean }): number[] {
  if (Array.isArray(prefs.preferredDaysOff)) return prefs.preferredDaysOff
  if (prefs.preferWeekendsOff) return [0, 6]
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

  // Step 1: For each day, determine which shift each rotation slot works.
  // Workers at even indices (0, 2, 4…) are slot 0; odd indices (1, 3, 5…) are slot 1.
  // Slots swap shifts each ISO week.
  const dayRotationShift = new Map<string, [ShiftId, ShiftId]>()
  for (const day of days) {
    const isOddWeek = getISOWeekNumber(day) % 2 === 1
    dayRotationShift.set(toDateString(day), [
      isOddWeek ? config.groupAShiftWeek1 : config.groupBShiftWeek1,
      isOddWeek ? config.groupBShiftWeek1 : config.groupAShiftWeek1,
    ])
  }

  // Step 2: Assign days off per worker per ISO week
  const workerDaysOff = new Map<WorkerId, Set<string>>()
  for (const worker of activeWorkers) {
    workerDaysOff.set(worker.id, new Set())
  }

  const weekGroups = groupByISOWeek(days)

  for (const [isoWeek, weekDays] of weekGroups) {
    const sorted = [...weekDays].sort((a, b) => {
      const aDow = a.getDay() === 0 ? 7 : a.getDay()
      const bDow = b.getDay() === 0 ? 7 : b.getDay()
      return aDow - bDow
    })

    const maxDaysOffThisWeek = Math.max(0, Math.min(config.daysOffPerWeek, sorted.length - 1))

    activeWorkers.forEach((worker, workerIndex) => {
      const preferredDaysOff = normalizeDaysOff(worker.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean })

      const offset = (isoWeek + workerIndex * 3) % sorted.length
      const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)]

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

  activeWorkers.forEach((worker, workerIndex) => {
    const daysOffSet = workerDaysOff.get(worker.id)!
    const slot = workerIndex % 2

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

      const shiftId = dayRotationShift.get(dateStr)![slot as 0 | 1]
      const shift = config.shifts.find((s) => s.id === shiftId)

      if (shift && !isShiftActiveOnDay(shift, day)) {
        entries.push({ workerId: worker.id, date: dateStr, shiftId: null, status: 'off', note: '' })
        continue
      }

      entries.push({ workerId: worker.id, date: dateStr, shiftId, status: 'auto', note: '' })
    }
  })

  // Step 4: Enforce day-group max constraints (hard) — removes excess workers
  for (const day of days) {
    const dateStr = toDateString(day)
    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      const groups = normalizeDayGroups(constraint as (ShiftConstraints & Record<string, unknown>) | undefined, shift)
      const group = groups.find((g) => g.days.includes(day.getDay() as DayOfWeek))
      if (!group || group.max === null) continue

      const working = entries.filter((e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off')
      if (working.length <= group.max) continue

      const excess = working.length - group.max
      const preferSorted = [...working].sort((a, b) => {
        const wa = activeWorkers.find((w) => w.id === a.workerId)
        const wb = activeWorkers.find((w) => w.id === b.workerId)
        const aDaysOff = normalizeDaysOff((wa?.preferences ?? {}) as { preferredDaysOff?: number[] })
        const bDaysOff = normalizeDaysOff((wb?.preferences ?? {}) as { preferredDaysOff?: number[] })
        return (bDaysOff.includes(day.getDay()) ? 1 : 0) - (aDaysOff.includes(day.getDay()) ? 1 : 0)
      })
      for (const entry of preferSorted.slice(0, excess)) {
        const idx = entries.findIndex((e) => e.workerId === entry.workerId && e.date === entry.date)
        if (idx >= 0) entries[idx] = { ...entries[idx], shiftId: null, status: 'off' }
      }
    }
  }

  // Step 5: Check day-group min constraints (soft — produces violations)
  const violations: ConstraintViolation[] = []

  for (const day of days) {
    const dateStr = toDateString(day)
    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      const groups = normalizeDayGroups(constraint as (ShiftConstraints & Record<string, unknown>) | undefined, shift)
      const group = groups.find((g) => g.days.includes(day.getDay() as DayOfWeek))
      if (!group || group.min === 0) continue

      const count = entries.filter((e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off').length
      if (count < group.min) {
        violations.push({ date: dateStr, shiftId: shift.id, type: 'below_min', actual: count, limit: group.min })
      }
    }
  }

  return {
    schedule: { year, month, configId: config.id, entries },
    violations,
  }
}
