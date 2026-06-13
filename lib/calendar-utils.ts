import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getISOWeek,
  isSaturday,
  isSunday,
  isWeekend,
  format,
  addMonths,
  subMonths,
  getYear,
  getMonth,
} from 'date-fns'

export function getMonthWeeks(year: number, month: number): Date[][] {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }
  return weeks
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  return eachDayOfInterval({ start: monthStart, end: monthEnd })
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isWeekendDay(date: Date): boolean {
  return isWeekend(date)
}

export function isWeekdayDay(date: Date): boolean {
  return !isWeekend(date)
}

export function isSaturdayDay(date: Date): boolean {
  return isSaturday(date)
}

export function isSundayDay(date: Date): boolean {
  return isSunday(date)
}

export function getISOWeekNumber(date: Date): number {
  return getISOWeek(date)
}

export function groupByISOWeek(days: Date[]): Map<number, Date[]> {
  const map = new Map<number, Date[]>()
  for (const day of days) {
    const week = getISOWeek(day)
    const existing = map.get(week) ?? []
    existing.push(day)
    map.set(week, existing)
  }
  return map
}

export function navigateMonth(year: number, month: number, direction: 'prev' | 'next'): { year: number; month: number } {
  const current = new Date(year, month - 1)
  const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1)
  return { year: getYear(next), month: getMonth(next) + 1 }
}

export function formatMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy')
}

export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month
}

export function isToday(date: Date): boolean {
  return toDateString(date) === toDateString(new Date())
}

export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() + 1 === month
}

export function formatDayLabel(date: Date): string {
  return format(date, 'd')
}

export function formatShortDate(date: Date): string {
  return format(date, 'EEE, MMM d')
}

export function formatLongDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
