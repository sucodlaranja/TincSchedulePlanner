"use client";

import { useScheduleStore } from "@/lib/store";
import ShiftBadge from "./ShiftBadge";
import ConflictIndicator from "./ConflictIndicator";
import { isInMonth, isToday } from "@/lib/calendar-utils";
import type { ScheduleEntry, ConstraintViolation } from "@/lib/types";

interface CalendarCellProps {
  date: Date;
  year: number;
  month: number;
  entries: ScheduleEntry[];
  violations: ConstraintViolation[];
  onClick: (dateStr: string) => void;
}

export default function CalendarCell({
  date,
  year,
  month,
  entries,
  violations,
  onClick,
}: CalendarCellProps) {
  const config = useScheduleStore((s) => s.config);
  const inMonth = isInMonth(date, year, month);
  const today = isToday(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const hasViolation = violations.length > 0;
  const hasManualOverride = entries.some((e) => e.status === "manual");

  const borderColor = hasViolation
    ? "border-l-red-400"
    : hasManualOverride
      ? "border-l-blue-400"
      : "border-l-transparent";

  if (!config) {
    return (
      <div
        className={`min-h-[80px] border border-gray-100 p-1.5 ${isWeekend ? "bg-gray-50" : "bg-white"} ${!inMonth ? "opacity-30" : ""}`}
      >
        <span className="text-xs text-gray-400">{date.getDate()}</span>
      </div>
    );
  }

  const shiftCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.shiftId && entry.status !== "off") {
      shiftCounts.set(entry.shiftId, (shiftCounts.get(entry.shiftId) ?? 0) + 1);
    }
  }

  const hasScheduleData = entries.length > 0;

  return (
    <div
      onClick={() => inMonth && hasScheduleData && onClick(dateStr)}
      className={`relative min-h-[80px] border border-gray-100 border-l-4 ${borderColor} p-1.5 transition-colors
        ${isWeekend ? "bg-gray-50" : "bg-white"}
        ${!inMonth ? "opacity-30" : ""}
        ${inMonth && hasScheduleData ? "cursor-pointer hover:bg-blue-50/40" : ""}
        ${today ? "ring-2 ring-blue-500 ring-inset z-10" : ""}
      `}
    >
      <div className="flex items-start justify-between mb-1">
        <span
          className={`text-xs font-semibold leading-none ${today ? "text-blue-600" : isWeekend ? "text-blue-500" : "text-gray-600"} ${today ? "bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center" : ""}`}
        >
          {date.getDate()}
        </span>
        {hasViolation && <ConflictIndicator violations={violations} />}
      </div>

      {inMonth && hasScheduleData && (
        <div className="space-y-0.5">
          {config.shifts
            .sort((a, b) => a.order - b.order)
            .filter((shift) => {
              // Only show badge if shift is active on this day
              return (
                (shift.activeDays ?? []).length === 0 ||
                shift.activeDays.includes(
                  date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                )
              );
            })
            .map((shift) => {
              const count = shiftCounts.get(shift.id) ?? 0;
              const constraint = config.constraints.find(
                (c) => c.shiftId === shift.id,
              );
              return (
                <ShiftBadge
                  key={shift.id}
                  shift={shift}
                  count={count}
                  min={
                    isWeekend ? constraint?.weekendMin : constraint?.weekdayMin
                  }
                  max={isWeekend ? constraint?.weekendMax : undefined}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
