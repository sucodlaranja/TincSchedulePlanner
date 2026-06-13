'use client'

import { useState, useMemo } from 'react'
import { useScheduleStore } from '@/lib/store'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { formatLongDate, parseDate } from '@/lib/calendar-utils'
import type { ScheduleEntry } from '@/lib/types'

interface DayOverrideModalProps {
  date: string | null
  onClose: () => void
}

export default function DayOverrideModal({ date, onClose }: DayOverrideModalProps) {
  const config = useScheduleStore((s) => s.config)
  const schedules = useScheduleStore((s) => s.schedules)
  const activeYear = useScheduleStore((s) => s.activeYear)
  const activeMonth = useScheduleStore((s) => s.activeMonth)
  const overrideEntry = useScheduleStore((s) => s.overrideEntry)

  const schedule = schedules.find((s) => s.year === activeYear && s.month === activeMonth)
  const dayEntries = useMemo(() => {
    if (!date || !schedule) return []
    return schedule.entries.filter((e) => e.date === date)
  }, [date, schedule])

  const [pending, setPending] = useState<Record<string, string | null>>({})

  if (!config || !date) return null

  const activeWorkers = config.workers.filter((w) => w.active)
  const title = formatLongDate(parseDate(date))

  function getShiftId(workerId: string): string | null {
    if (workerId in pending) return pending[workerId]
    const entry = dayEntries.find((e) => e.workerId === workerId)
    return entry?.shiftId ?? null
  }

  function getStatus(workerId: string) {
    const entry = dayEntries.find((e) => e.workerId === workerId)
    return entry?.status ?? 'off'
  }

  function handleChange(workerId: string, shiftId: string | null) {
    setPending((p) => ({ ...p, [workerId]: shiftId }))
  }

  function handleSave() {
    if (!date) return
    for (const worker of activeWorkers) {
      if (!(worker.id in pending)) continue
      const shiftId = pending[worker.id]
      const entry: ScheduleEntry = {
        workerId: worker.id,
        date,
        shiftId,
        status: 'manual',
        note: '',
      }
      overrideEntry(entry)
    }
    setPending({})
    onClose()
  }

  function handleReset() {
    setPending({})
  }

  const hasChanges = Object.keys(pending).length > 0

  return (
    <Modal isOpen={!!date} onClose={() => { setPending({}); onClose() }} title={title} size="lg">
      <div className="space-y-1 mb-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 pb-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Worker</span>
          <span>Shift</span>
          <span className="text-center w-12">Override</span>
        </div>
        {activeWorkers.map((worker) => {
          const currentShiftId = getShiftId(worker.id)
          const status = getStatus(worker.id)
          const isOverridden = worker.id in pending

          return (
            <div
              key={worker.id}
              className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 px-1 rounded-lg ${isOverridden ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: worker.color }}
                >
                  {worker.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-800 truncate">{worker.name}</span>
                {status === 'manual' && !isOverridden && (
                  <span className="text-[10px] text-blue-500 font-medium shrink-0">✎</span>
                )}
              </div>
              <select
                value={currentShiftId ?? ''}
                onChange={(e) => handleChange(worker.id, e.target.value || null)}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
              >
                <option value="">Day Off</option>
                {config.shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="w-12 flex justify-center">
                {isOverridden && (
                  <button
                    onClick={() => {
                      const next = { ...pending }
                      delete next[worker.id]
                      setPending(next)
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Undo"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button onClick={handleSave} disabled={!hasChanges} className="flex-1">
          Save Changes
        </Button>
        {hasChanges && (
          <Button variant="ghost" onClick={handleReset}>Reset</Button>
        )}
        <Button variant="secondary" onClick={() => { setPending({}); onClose() }}>Close</Button>
      </div>
    </Modal>
  )
}
