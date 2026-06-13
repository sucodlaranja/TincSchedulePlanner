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

  // Step 3.5: Minimum staffing enforcement — restore workers from 'off' to cover shortfalls
  // Runs before max enforcement so Step 4 can trim any resulting overstaffing correctly.
  for (const day of days) {
    const dateStr = toDateString(day)
    const dow = day.getDay() as DayOfWeek
    const isoWeek = getISOWeekNumber(day)

    for (const shift of config.shifts) {
      if (!isShiftActiveOnDay(shift, day)) continue

      const constraint = config.constraints.find((c) => c.shiftId === shift.id)
      const groups = normalizeDayGroups(constraint as (ShiftConstraints & Record<string, unknown>) | undefined, shift)
      const group = groups.find((g) => g.days.includes(dow))
      if (!group || group.min === 0) continue

      const working = entries.filter((e) => e.date === dateStr && e.shiftId === shift.id && e.status !== 'off')
      if (working.length >= group.min) continue

      const shortage = group.min - working.length

      // Candidates: workers assigned 'off' this day whose rotation slot maps to this shift
      const candidates = entries
        .filter((e) => {
          if (e.date !== dateStr) return false
          if (e.status === 'manual') return false
          if (e.shiftId !== null || e.status !== 'off') return false
          const workerIdx = activeWorkers.findIndex((w) => w.id === e.workerId)
          if (workerIdx < 0) return false
          const slot = workerIdx % 2
          return dayRotationShift.get(dateStr)?.[slot as 0 | 1] === shift.id
        })
        .sort((a, b) => {
          // Pull back workers who don't prefer today off first; preference-holders are last resort
          const wa = activeWorkers.find((w) => w.id === a.workerId)!
          const wb = activeWorkers.find((w) => w.id === b.workerId)!
          const aP = normalizeDaysOff(wa.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean }).includes(dow) ? 1 : 0
          const bP = normalizeDaysOff(wb.preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean }).includes(dow) ? 1 : 0
          return aP - bP
        })

      for (const candidate of candidates.slice(0, shortage)) {
        // Restore worker to working on this day
        const idx = entries.findIndex((e) => e.workerId === candidate.workerId && e.date === dateStr)
        if (idx < 0) continue
        entries[idx] = { ...entries[idx], shiftId: shift.id, status: 'auto' }

        // Try to find a swap day off in the same ISO week to preserve their days-off count
        const workerIdx = activeWorkers.findIndex((w) => w.id === candidate.workerId)
        const slot = workerIdx % 2
        const preferredDaysOff = normalizeDaysOff(
          activeWorkers[workerIdx].preferences as { preferredDaysOff?: number[]; preferWeekendsOff?: boolean }
        )

        const swapCandidates = days
          .filter((d) => {
            if (toDateString(d) === dateStr) return false
            if (getISOWeekNumber(d) !== isoWeek) return false
            const dStr = toDateString(d)
            const e = entries.find((x) => x.workerId === candidate.workerId && x.date === dStr)
            return e?.status === 'auto'
          })
          .sort((a, b) => {
            // Prefer swapping to a day the worker actually wants off
            const aP = preferredDaysOff.includes(a.getDay() as DayOfWeek) ? -1 : 0
            const bP = preferredDaysOff.includes(b.getDay() as DayOfWeek) ? -1 : 0
            return aP - bP
          })

        for (const swapDay of swapCandidates) {
          const swapDateStr = toDateString(swapDay)
          const swapDow = swapDay.getDay() as DayOfWeek
          const swapShiftId = dayRotationShift.get(swapDateStr)?.[slot as 0 | 1]
          if (!swapShiftId) continue

          const swapShift = config.shifts.find((s) => s.id === swapShiftId)
          if (!swapShift || !isShiftActiveOnDay(swapShift, swapDay)) continue

          const swapConstraint = config.constraints.find((c) => c.shiftId === swapShiftId)
          const swapGroups = normalizeDayGroups(
            swapConstraint as (ShiftConstraints & Record<string, unknown>) | undefined,
            swapShift
          )
          const swapGroup = swapGroups.find((g) => g.days.includes(swapDow))
          const swapMin = swapGroup?.min ?? 0

          const swapCount = entries.filter(
            (e) => e.date === swapDateStr && e.shiftId === swapShiftId && e.status !== 'off'
          ).length

          if (swapCount - 1 >= swapMin) {
            const swapIdx = entries.findIndex((e) => e.workerId === candidate.workerId && e.date === swapDateStr)
            if (swapIdx >= 0) entries[swapIdx] = { ...entries[swapIdx], shiftId: null, status: 'off' }
            break
          }
        }
      }
    }
  }

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
