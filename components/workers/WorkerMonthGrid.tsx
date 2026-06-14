"use client";

import { useScheduleStore } from "@/lib/store";
import { useCalendarMonth } from "@/hooks/useCalendarMonth";
import { isInMonth, toDateString, DAY_NAMES } from "@/lib/calendar-utils";
import type { WorkerId } from "@/lib/types";

interface WorkerMonthGridProps {
  workerId: WorkerId;
  year: number;
  month: number;
}

export default function WorkerMonthGrid({
  workerId,
  year,
  month,
}: WorkerMonthGridProps) {
  const config = useScheduleStore((s) => s.config);
  const { weeks, entriesByDate } = useCalendarMonth(year, month);

  if (!config) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-125">
        <thead>
          <tr>
            {DAY_NAMES.map((d) => (
              <th
                key={d}
                className={`pb-2 font-medium text-center ${d === "Sat" || d === "Sun" ? "text-blue-500" : "text-gray-500"}`}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day) => {
                const inMonth = isInMonth(day, year, month);
                const dateStr = toDateString(day);
                const entry = entriesByDate
                  .get(dateStr)
                  ?.find((e) => e.workerId === workerId);
                const shift = entry?.shiftId
                  ? config.shifts.find((s) => s.id === entry.shiftId)
                  : null;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <td
                    key={dateStr}
                    className={`p-1 text-center border border-gray-100 ${isWeekend ? "bg-gray-50" : "bg-white"} ${!inMonth ? "opacity-30" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-0.5 min-h-12 justify-start pt-1">
                      <span className="text-gray-500 font-medium">
                        {day.getDate()}
                      </span>
                      {inMonth && (
                        <>
                          {shift ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-white font-semibold text-[10px] leading-tight"
                              style={{ backgroundColor: shift.color }}
                              title={`${shift.name} (${shift.startTime}–${shift.endTime})`}
                            >
                              {shift.name.slice(0, 3).toUpperCase()}
                            </span>
                          ) : entry ? (
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium text-[10px]">
                              OFF
                            </span>
                          ) : null}
                          {entry?.status === "manual" && (
                            <span className="text-[9px] text-blue-500 font-medium">
                              ✎
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
