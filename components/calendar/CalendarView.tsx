'use client'

import { useState } from 'react'
import { useScheduleStore } from '@/lib/store'
import { useCalendarMonth } from '@/hooks/useCalendarMonth'
import { parseDate, formatShortDate, formatMonthLabel } from '@/lib/calendar-utils'
import CalendarGrid from './CalendarGrid'
import DayOverrideModal from './DayOverrideModal'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'

export default function CalendarView() {
  const activeYear = useScheduleStore((s) => s.activeYear)
  const activeMonth = useScheduleStore((s) => s.activeMonth)
  const config = useScheduleStore((s) => s.config)
  const generateSchedule = useScheduleStore((s) => s.generateSchedule)
  const toggleConfigPanel = useScheduleStore((s) => s.toggleConfigPanel)
  const violations = useScheduleStore((s) => s.violations)
  const configWarnings = useScheduleStore((s) => s.configWarnings)

  const { weeks, entriesByDate, violationsByDate, schedule } = useCalendarMonth(activeYear, activeMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="📅"
          title="No schedule configured"
          description="Set up your shifts, constraints, and workers to generate a monthly schedule."
          action={{ label: 'Open Config', onClick: toggleConfigPanel }}
        />
      </div>
    )
  }

  if (!schedule) {
    if (configWarnings.length > 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
          <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Cannot generate schedule</h2>
          <div className="w-full max-w-lg space-y-2">
            {configWarnings.map((w, i) => (
              <div key={i} className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <span className="font-bold shrink-0 mt-0.5">✕</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">Fix the staffing issues in Config, then generate again.</p>
          <Button variant="secondary" size="sm" onClick={toggleConfigPanel}>Open Config</Button>
        </div>
      )
    }

    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="⚡"
          title="No schedule generated"
          description={`Click Generate to auto-schedule ${config.workers.filter((w) => w.active).length} workers for this month.`}
          action={{ label: 'Generate Schedule', onClick: () => generateSchedule(activeYear, activeMonth) }}
        />
      </div>
    )
  }

  const hasIssues = configWarnings.length > 0 || violations.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="hidden print:block text-center text-2xl font-bold py-4 text-gray-900">
        {formatMonthLabel(activeYear, activeMonth)}
      </div>
      <div className="flex-1 overflow-auto print:overflow-visible">
        <CalendarGrid
          weeks={weeks}
          year={activeYear}
          month={activeMonth}
          entriesByDate={entriesByDate}
          violationsByDate={violationsByDate}
          onDayClick={setSelectedDate}
        />
      </div>

      {hasIssues && (
        <div className={`print:hidden shrink-0 border-t ${configWarnings.length > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer"
          >
            {configWarnings.length > 0 ? (
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className={`text-sm font-medium flex-1 ${configWarnings.length > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {configWarnings.length > 0
                ? `${configWarnings.length} staffing error${configWarnings.length > 1 ? 's' : ''} — not enough workers to meet minimums`
                : `${violations.length} constraint violation${violations.length > 1 ? 's' : ''} — some shifts may be understaffed`
              }
            </span>
            <svg className={`w-4 h-4 transition-transform ${panelOpen ? 'rotate-180' : ''} ${configWarnings.length > 0 ? 'text-red-500' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {panelOpen && (
            <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {configWarnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">
                  <span className="shrink-0 font-bold mt-0.5">✕</span>
                  <span>{warning}</span>
                </div>
              ))}
              {violations.length > 0 && (
                <div className="space-y-1">
                  {violations.map((v, i) => {
                    const shift = config.shifts.find((s) => s.id === v.shiftId)
                    const dateLabel = formatShortDate(parseDate(v.date))
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100 rounded px-3 py-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: shift?.color }}
                        />
                        <span className="font-medium">{dateLabel}</span>
                        <span>·</span>
                        <span>{shift?.name ?? 'Unknown shift'}</span>
                        <span>·</span>
                        <span>needs {v.limit}, has <strong>{v.actual}</strong></span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DayOverrideModal date={selectedDate} onClose={() => setSelectedDate(null)} />
    </div>
  )
}
