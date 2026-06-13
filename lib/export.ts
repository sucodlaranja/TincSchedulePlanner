import { format } from 'date-fns'
import type { MonthSchedule, ScheduleConfig } from './types'

export function exportScheduleToCSV(schedule: MonthSchedule, config: ScheduleConfig): string {
  const rows: string[] = [
    'Date,Day,Shift,Time,Workers,Worker Count',
  ]

  // Collect all dates in the schedule
  const datesSet = new Set(schedule.entries.map((e) => e.date))
  const dates = Array.from(datesSet).sort()

  for (const dateStr of dates) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayName = format(date, 'EEEE')

    for (const shift of config.shifts.sort((a, b) => a.order - b.order)) {
      const assignedWorkerIds = schedule.entries
        .filter((e) => e.date === dateStr && e.shiftId === shift.id)
        .map((e) => e.workerId)

      const workerNames = assignedWorkerIds
        .map((id) => config.workers.find((w) => w.id === id)?.name ?? id)
        .filter(Boolean)
        .join(', ')

      const timeRange = `${shift.startTime}-${shift.endTime}`
      const count = assignedWorkerIds.length

      // Escape worker names that may contain commas
      const escapedWorkers = workerNames.includes(',') ? `"${workerNames}"` : workerNames

      rows.push(`${dateStr},${dayName},${shift.name},${timeRange},${escapedWorkers},${count}`)
    }
  }

  return rows.join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
