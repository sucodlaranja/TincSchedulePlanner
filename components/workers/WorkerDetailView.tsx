'use client'

import Link from 'next/link'
import { useScheduleStore } from '@/lib/store'
import { useWorkerStats } from '@/hooks/useWorkerStats'
import { navigateMonth, formatMonthLabel } from '@/lib/calendar-utils'
import WorkerMonthGrid from './WorkerMonthGrid'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'

interface WorkerDetailViewProps {
  workerId: string
}

export default function WorkerDetailView({ workerId }: WorkerDetailViewProps) {
  const config = useScheduleStore((s) => s.config)
  const activeYear = useScheduleStore((s) => s.activeYear)
  const activeMonth = useScheduleStore((s) => s.activeMonth)
  const setActiveMonth = useScheduleStore((s) => s.setActiveMonth)
  const generateSchedule = useScheduleStore((s) => s.generateSchedule)
  const schedules = useScheduleStore((s) => s.schedules)

  const worker = config?.workers.find((w) => w.id === workerId)
  const stats = useWorkerStats(workerId, activeYear, activeMonth)
  const hasSchedule = schedules.some((s) => s.year === activeYear && s.month === activeMonth)

  if (!config || !worker) {
    return (
      <EmptyState
        title="Worker not found"
        description="This worker may have been removed."
        action={{ label: 'Back to Workers', onClick: () => {} }}
        icon="👤"
      />
    )
  }

  function handlePrev() {
    const { year, month } = navigateMonth(activeYear, activeMonth, 'prev')
    setActiveMonth(year, month)
  }

  function handleNext() {
    const { year, month } = navigateMonth(activeYear, activeMonth, 'next')
    setActiveMonth(year, month)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/workers" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: worker.color }}
        >
          {worker.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{worker.name}</h1>
          <p className="text-sm text-gray-500">
            {worker.hoursPerWeek}h/week
            {(worker.preferences.preferredDaysOff ?? []).length > 0 ? ` · Prefers off: ${(worker.preferences.preferredDaysOff ?? []).map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handlePrev} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[160px] text-center">
          {formatMonthLabel(activeYear, activeMonth)}
        </span>
        <button onClick={handleNext} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {hasSchedule && stats.totalDays > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Working days" value={stats.totalWorkingDays} color="text-green-600" />
          <StatCard label="Days off" value={stats.totalDaysOff} color="text-gray-500" />
          {Array.from(stats.countByShift.entries()).map(([shiftId, count]) => {
            const shift = config.shifts.find((s) => s.id === shiftId)
            return shift ? (
              <StatCard key={shiftId} label={shift.name} value={count} colorHex={shift.color} />
            ) : null
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Monthly Schedule</h2>
        </div>
        <div className="p-3">
          {!hasSchedule ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-gray-500">No schedule generated for this month yet.</p>
              <Button size="sm" onClick={() => generateSchedule(activeYear, activeMonth)}>
                Generate Schedule
              </Button>
            </div>
          ) : (
            <WorkerMonthGrid workerId={workerId} year={activeYear} month={activeMonth} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  colorHex,
}: {
  label: string
  value: number
  color?: string
  colorHex?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <p className="text-2xl font-bold" style={colorHex ? { color: colorHex } : undefined}>
        <span className={color}>{value}</span>
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
