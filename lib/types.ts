export type WorkerId = string
export type ShiftId = string
export type ShiftGroup = 'A' | 'B'

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (JS Date.getDay() convention)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WorkerPreferences {
  preferredDaysOff: DayOfWeek[]   // preferred days off each week (empty = no preference)
  preferredShiftId: ShiftId | null
}

export interface Worker {
  id: WorkerId
  name: string
  hoursPerWeek: number
  shiftGroup: ShiftGroup
  preferences: WorkerPreferences
  color: string
  active: boolean
}

export interface Shift {
  id: ShiftId
  name: string
  startTime: string
  endTime: string
  color: string
  order: number
  activeDays: DayOfWeek[]  // days this shift runs; empty = all days
}

export interface ShiftConstraints {
  shiftId: ShiftId
  weekdayMin: number
  weekdayMax: number
  weekendMin: number
  weekendMax: number
}

export interface ScheduleConfig {
  id: string
  name: string
  shifts: Shift[]
  constraints: ShiftConstraints[]
  workers: Worker[]
  groupAShiftWeek1: ShiftId
  groupBShiftWeek1: ShiftId
  workingDaysPerWeek: number
  daysOffPerWeek: number
}

export type AssignmentStatus = 'auto' | 'manual' | 'off'

export interface ScheduleEntry {
  workerId: WorkerId
  date: string
  shiftId: ShiftId | null
  status: AssignmentStatus
  note: string
}

export interface MonthSchedule {
  year: number
  month: number
  configId: string
  entries: ScheduleEntry[]
}

export interface ConstraintViolation {
  date: string
  shiftId: ShiftId
  type: 'below_min' | 'above_max'
  actual: number
  limit: number
}

export interface PersistedState {
  version: number
  config: ScheduleConfig | null
  schedules: MonthSchedule[]
}
