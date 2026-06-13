'use client'

import { useState } from 'react'
import { useScheduleStore } from '@/lib/store'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Shift, DayOfWeek } from '@/lib/types'

const SHIFT_COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f97316']

const DAY_CHIPS: { label: string; value: DayOfWeek }[] = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]

function toggleDay(current: DayOfWeek[], day: DayOfWeek): DayOfWeek[] {
  const allDays: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]
  const effective = current.length === 0 ? allDays : current
  const next = effective.includes(day) ? effective.filter((d) => d !== day) : [...effective, day]
  return (next.length === 7 ? [] : next) as DayOfWeek[]
}

function isDayActive(current: DayOfWeek[], day: DayOfWeek): boolean {
  return current.length === 0 || current.includes(day)
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function ShiftConfigForm() {
  const config = useScheduleStore((s) => s.config)
  const addShift = useScheduleStore((s) => s.addShift)
  const updateShift = useScheduleStore((s) => s.updateShift)
  const removeShift = useScheduleStore((s) => s.removeShift)
  const updateConfigMeta = useScheduleStore((s) => s.updateConfigMeta)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', startTime: '08:00', endTime: '16:00', color: SHIFT_COLORS[0], activeDays: [] as DayOfWeek[] })

  if (!config) return null
  const shifts = config.shifts

  function handleAdd() {
    if (!form.name.trim()) return
    const shift: Shift = {
      id: generateId(),
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      color: form.color,
      order: shifts.length,
      activeDays: form.activeDays,
    }
    addShift(shift)
    // Auto-assign to rotation if needed
    if (shifts.length === 0) updateConfigMeta({ groupAShiftWeek1: shift.id })
    if (shifts.length === 1) updateConfigMeta({ groupBShiftWeek1: shift.id })
    setForm({ name: '', startTime: '08:00', endTime: '16:00', color: SHIFT_COLORS[shifts.length + 1] ?? SHIFT_COLORS[0], activeDays: [] })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <ShiftRow key={shift.id} shift={shift} onUpdate={updateShift} onRemove={removeShift} />
      ))}

      {adding ? (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {SHIFT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${form.color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
            <Input
              label="End time"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Active days</label>
            <div className="flex gap-1 flex-wrap">
              {DAY_CHIPS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setForm((f) => ({ ...f, activeDays: toggleDay(f.activeDays, value) }))}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    isDayActive(form.activeDays, value)
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!form.name.trim()}>Add Shift</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)} className="w-full">
          + Add Shift
        </Button>
      )}
    </div>
  )
}

function ShiftRow({
  shift,
  onUpdate,
  onRemove,
}: {
  shift: Shift
  onUpdate: (id: string, patch: Partial<Shift>) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, color: shift.color, activeDays: (shift.activeDays ?? []) as DayOfWeek[] })

  function handleSave() {
    onUpdate(shift.id, form)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50">
        <div className="grid grid-cols-2 gap-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {['#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f97316'].map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${form.color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Start" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          <Input label="End" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Active days</label>
          <div className="flex gap-1 flex-wrap">
            {DAY_CHIPS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, activeDays: toggleDay(f.activeDays, value) }))}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  isDayActive(form.activeDays, value)
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-400 border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-white">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: shift.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{shift.name}</p>
        <p className="text-xs text-gray-500">{shift.startTime} – {shift.endTime}</p>
        {shift.activeDays && shift.activeDays.length > 0 && (
          <p className="text-xs text-indigo-500 mt-0.5">
            {DAY_CHIPS.filter(({ value }) => shift.activeDays.includes(value)).map(({ label }) => label).join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-blue-600 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onRemove(shift.id)} className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
