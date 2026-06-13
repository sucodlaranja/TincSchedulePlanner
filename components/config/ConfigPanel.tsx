'use client'

import { useState } from 'react'
import { useScheduleStore } from '@/lib/store'
import SlideOver from '@/components/ui/SlideOver'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import ShiftConfigForm from './ShiftConfigForm'
import ConstraintConfigForm from './ConstraintConfigForm'
import type { ScheduleConfig } from '@/lib/types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

type Section = 'general' | 'shifts' | 'constraints' | 'rotation'

export default function ConfigPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const config = useScheduleStore((s) => s.config)
  const setConfig = useScheduleStore((s) => s.setConfig)
  const updateConfigMeta = useScheduleStore((s) => s.updateConfigMeta)
  const [open, setOpen] = useState<Section>('general')
  const [newName, setNewName] = useState('')

  function handleCreateConfig() {
    if (!newName.trim()) return
    const cfg: ScheduleConfig = {
      id: generateId(),
      name: newName.trim(),
      shifts: [],
      constraints: [],
      workers: [],
      groupAShiftWeek1: '',
      groupBShiftWeek1: '',
      workingDaysPerWeek: 5,
      daysOffPerWeek: 2,
    }
    setConfig(cfg)
  }

  function toggle(section: Section) {
    setOpen((s) => (s === section ? 'general' : section))
  }

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Configuration">
      {!config ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">Create a new schedule configuration to get started.</p>
          <Input
            label="Configuration name"
            placeholder="e.g. TINC 2026"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleCreateConfig} disabled={!newName.trim()} className="w-full">
            Create Configuration
          </Button>
        </div>
      ) : (
        <div className="space-y-2 -mx-6 px-0">
          <Accordion title="General" isOpen={open === 'general'} onToggle={() => toggle('general')}>
            <div className="space-y-3">
              <Input
                label="Name"
                value={config.name}
                onChange={(e) => updateConfigMeta({ name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Working days/week"
                  type="number"
                  min={1}
                  max={7}
                  value={config.workingDaysPerWeek}
                  onChange={(e) => updateConfigMeta({ workingDaysPerWeek: parseInt(e.target.value) || 5 })}
                />
                <Input
                  label="Days off/week"
                  type="number"
                  min={0}
                  max={6}
                  value={config.daysOffPerWeek}
                  onChange={(e) => updateConfigMeta({ daysOffPerWeek: parseInt(e.target.value) || 2 })}
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="Shifts" isOpen={open === 'shifts'} onToggle={() => toggle('shifts')}>
            <ShiftConfigForm />
          </Accordion>

          <Accordion title="Constraints" isOpen={open === 'constraints'} onToggle={() => toggle('constraints')}>
            <ConstraintConfigForm />
          </Accordion>

          <Accordion title="Rotation" isOpen={open === 'rotation'} onToggle={() => toggle('rotation')}>
            {config.shifts.length < 2 ? (
              <p className="text-sm text-gray-500">Add at least 2 shifts to configure rotation.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Workers are auto-split by their order in the list. The first half and second half swap shifts every week. On odd ISO weeks:
                </p>
                <Select
                  label="First half of workers (odd weeks)"
                  value={config.groupAShiftWeek1}
                  onChange={(e) => updateConfigMeta({ groupAShiftWeek1: e.target.value })}
                >
                  <option value="">— select —</option>
                  {config.shifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Select
                  label="Second half of workers (odd weeks)"
                  value={config.groupBShiftWeek1}
                  onChange={(e) => updateConfigMeta({ groupBShiftWeek1: e.target.value })}
                >
                  <option value="">— select —</option>
                  {config.shifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            )}
          </Accordion>
        </div>
      )}
    </SlideOver>
  )
}

function Accordion({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        onClick={onToggle}
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-6 pb-4 pt-1">{children}</div>}
    </div>
  )
}
