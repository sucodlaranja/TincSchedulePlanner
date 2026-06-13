'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { generateMonthSchedule } from './scheduler'
import type {
  ScheduleConfig,
  Worker,
  WorkerId,
  Shift,
  ShiftId,
  ShiftConstraints,
  ScheduleEntry,
  MonthSchedule,
  ConstraintViolation,
} from './types'

interface ScheduleStore {
  config: ScheduleConfig | null
  schedules: MonthSchedule[]
  activeYear: number
  activeMonth: number
  violations: ConstraintViolation[]
  configWarnings: string[]
  configPanelOpen: boolean

  setConfig: (config: ScheduleConfig) => void
  addWorker: (worker: Worker) => void
  updateWorker: (id: WorkerId, patch: Partial<Worker>) => void
  removeWorker: (id: WorkerId) => void
  addShift: (shift: Shift) => void
  updateShift: (id: ShiftId, patch: Partial<Shift>) => void
  removeShift: (id: ShiftId) => void
  setConstraint: (constraint: ShiftConstraints) => void
  updateConfigMeta: (patch: Partial<Pick<ScheduleConfig, 'name' | 'groupAShiftWeek1' | 'groupBShiftWeek1' | 'workingDaysPerWeek' | 'daysOffPerWeek'>>) => void

  generateSchedule: (year: number, month: number) => void
  overrideEntry: (entry: ScheduleEntry) => void
  clearOverride: (workerId: WorkerId, date: string) => void
  clearSchedule: (year: number, month: number) => void

  setActiveMonth: (year: number, month: number) => void
  toggleConfigPanel: () => void
  setConfigPanelOpen: (open: boolean) => void
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      config: null,
      schedules: [],
      activeYear: new Date().getFullYear(),
      activeMonth: new Date().getMonth() + 1,
      violations: [],
      configWarnings: [],
      configPanelOpen: false,

      setConfig: (config) => set({ config }),

      addWorker: (worker) =>
        set((state) => {
          if (!state.config) return state
          return { config: { ...state.config, workers: [...state.config.workers, worker] } }
        }),

      updateWorker: (id, patch) =>
        set((state) => {
          if (!state.config) return state
          return {
            config: {
              ...state.config,
              workers: state.config.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
            },
          }
        }),

      removeWorker: (id) =>
        set((state) => {
          if (!state.config) return state
          return {
            config: {
              ...state.config,
              workers: state.config.workers.filter((w) => w.id !== id),
            },
          }
        }),

      addShift: (shift) =>
        set((state) => {
          if (!state.config) return state
          return { config: { ...state.config, shifts: [...state.config.shifts, shift] } }
        }),

      updateShift: (id, patch) =>
        set((state) => {
          if (!state.config) return state
          return {
            config: {
              ...state.config,
              shifts: state.config.shifts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
            },
          }
        }),

      removeShift: (id) =>
        set((state) => {
          if (!state.config) return state
          return {
            config: {
              ...state.config,
              shifts: state.config.shifts.filter((s) => s.id !== id),
              constraints: state.config.constraints.filter((c) => c.shiftId !== id),
            },
          }
        }),

      setConstraint: (constraint) =>
        set((state) => {
          if (!state.config) return state
          const existing = state.config.constraints.findIndex((c) => c.shiftId === constraint.shiftId)
          const updated =
            existing >= 0
              ? state.config.constraints.map((c) => (c.shiftId === constraint.shiftId ? constraint : c))
              : [...state.config.constraints, constraint]
          return { config: { ...state.config, constraints: updated } }
        }),

      updateConfigMeta: (patch) =>
        set((state) => {
          if (!state.config) return state
          return { config: { ...state.config, ...patch } }
        }),

      generateSchedule: (year, month) => {
        const { config, schedules } = get()
        if (!config) return

        // Pre-flight: check if groups have enough workers to meet weekday minimums
        const configWarnings: string[] = []
        const groupAWorkers = config.workers.filter((w) => w.active && w.shiftGroup === 'A')
        const groupBWorkers = config.workers.filter((w) => w.active && w.shiftGroup === 'B')

        for (const shift of config.shifts) {
          const constraint = config.constraints.find((c) => c.shiftId === shift.id)
          if (!constraint || constraint.weekdayMin === 0) continue

          // Determine which group covers this shift in odd weeks
          const groupForShift =
            config.groupAShiftWeek1 === shift.id ? groupAWorkers
            : config.groupBShiftWeek1 === shift.id ? groupBWorkers
            : null

          if (groupForShift && groupForShift.length < constraint.weekdayMin) {
            const groupLabel = config.groupAShiftWeek1 === shift.id ? 'A' : 'B'
            configWarnings.push(
              `${shift.name} needs at least ${constraint.weekdayMin} workers per weekday, but Group ${groupLabel} only has ${groupForShift.length} active worker${groupForShift.length !== 1 ? 's' : ''}.`
            )
          }
        }

        if (configWarnings.length > 0) {
          set((state) => ({
            schedules: state.schedules.filter((s) => !(s.year === year && s.month === month)),
            violations: [],
            configWarnings,
          }))
          return
        }

        const existing = schedules.find((s) => s.year === year && s.month === month)
        const { schedule, violations } = generateMonthSchedule(config, year, month, existing)
        set((state) => ({
          schedules: [
            ...state.schedules.filter((s) => !(s.year === year && s.month === month)),
            schedule,
          ],
          violations,
          configWarnings: [],
        }))
      },

      overrideEntry: (entry) => {
        const { activeYear, activeMonth } = get()
        set((state) => {
          const schedule = state.schedules.find(
            (s) => s.year === activeYear && s.month === activeMonth
          )
          if (!schedule) return state
          const updated: MonthSchedule = {
            ...schedule,
            entries: [
              ...schedule.entries.filter(
                (e) => !(e.workerId === entry.workerId && e.date === entry.date)
              ),
              { ...entry, status: 'manual' },
            ],
          }
          return {
            schedules: state.schedules.map((s) =>
              s.year === updated.year && s.month === updated.month ? updated : s
            ),
          }
        })
      },

      clearOverride: (workerId, date) => {
        const { activeYear, activeMonth, config } = get()
        if (!config) return
        set((state) => {
          const schedule = state.schedules.find(
            (s) => s.year === activeYear && s.month === activeMonth
          )
          if (!schedule) return state
          const updated: MonthSchedule = {
            ...schedule,
            entries: schedule.entries.filter(
              (e) => !(e.workerId === workerId && e.date === date && e.status === 'manual')
            ),
          }
          return {
            schedules: state.schedules.map((s) =>
              s.year === updated.year && s.month === updated.month ? updated : s
            ),
          }
        })
      },

      clearSchedule: (year, month) =>
        set((state) => ({
          schedules: state.schedules.filter((s) => !(s.year === year && s.month === month)),
          violations: [],
        })),

      setActiveMonth: (year, month) => set({ activeYear: year, activeMonth: month }),
      toggleConfigPanel: () => set((state) => ({ configPanelOpen: !state.configPanelOpen })),
      setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
    }),
    {
      name: 'tinc-schedule-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        schedules: state.schedules,
      }),
    }
  )
)
