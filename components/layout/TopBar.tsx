'use client'

import { useScheduleStore } from '@/lib/store'
import { navigateMonth, formatMonthLabel } from '@/lib/calendar-utils'
import { exportScheduleToCSV, downloadCSV } from '@/lib/export'
import { exportWorkerSchedulePDF } from '@/lib/export-pdf'
import Button from '@/components/ui/Button'

export default function TopBar() {
  const activeYear = useScheduleStore((s) => s.activeYear)
  const activeMonth = useScheduleStore((s) => s.activeMonth)
  const config = useScheduleStore((s) => s.config)
  const setActiveMonth = useScheduleStore((s) => s.setActiveMonth)
  const generateSchedule = useScheduleStore((s) => s.generateSchedule)
  const toggleConfigPanel = useScheduleStore((s) => s.toggleConfigPanel)
  const schedules = useScheduleStore((s) => s.schedules)
  const violations = useScheduleStore((s) => s.violations)

  const currentSchedule = schedules.find((s) => s.year === activeYear && s.month === activeMonth)
  const hasSchedule = currentSchedule !== undefined

  const manualOverrideCount = schedules
    .find((s) => s.year === activeYear && s.month === activeMonth)
    ?.entries.filter((e) => e.status === 'manual').length ?? 0

  function handlePrev() {
    const { year, month } = navigateMonth(activeYear, activeMonth, 'prev')
    setActiveMonth(year, month)
  }

  function handleNext() {
    const { year, month } = navigateMonth(activeYear, activeMonth, 'next')
    setActiveMonth(year, month)
  }

  function handleDownloadPDF() {
    if (!currentSchedule || !config) return
    exportWorkerSchedulePDF(currentSchedule, config, activeYear, activeMonth)
  }

  function handleDownloadCSV() {
    if (!currentSchedule || !config) return
    const csv = exportScheduleToCSV(currentSchedule, config)
    const filename = `schedule-${activeYear}-${String(activeMonth).padStart(2, '0')}.csv`
    downloadCSV(csv, filename)
  }

  function handleGenerate() {
    if (manualOverrideCount > 0) {
      const ok = confirm(
        `This will replace ${manualOverrideCount} manual override${manualOverrideCount > 1 ? 's' : ''}. Continue?`
      )
      if (!ok) return
    }
    generateSchedule(activeYear, activeMonth)
  }

  return (
    <header className="print:hidden h-14 border-b border-gray-200 bg-white flex items-center px-4 lg:px-6 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[160px] text-center">
          {formatMonthLabel(activeYear, activeMonth)}
        </span>
        <button
          onClick={handleNext}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {violations.length > 0 && (
        <span className="hidden sm:flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {violations.length} violation{violations.length > 1 ? 's' : ''}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {hasSchedule && config && (
          <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </Button>
        )}
        {hasSchedule && config && (
          <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Worker PDFs
          </Button>
        )}
        {config && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {hasSchedule ? 'Regenerate' : 'Generate'}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={toggleConfigPanel}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Config
        </Button>
      </div>
    </header>
  )
}
