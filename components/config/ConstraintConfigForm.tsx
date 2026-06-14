"use client";

import { useScheduleStore } from "@/lib/store";
import { normalizeDayGroups, getActiveDaysForShift } from "@/lib/scheduler";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type {
  Shift,
  ShiftConstraints,
  DayGroupConstraint,
  DayOfWeek,
} from "@/lib/types";

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ConstraintConfigForm() {
  const config = useScheduleStore((s) => s.config);
  const setConstraint = useScheduleStore((s) => s.setConstraint);

  if (!config || config.shifts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Add shifts first to configure constraints.
      </p>
    );
  }

  function handleUpdate(shiftId: string, dayGroups: DayGroupConstraint[]) {
    setConstraint({ shiftId, dayGroups });
  }

  return (
    <div className="space-y-4">
      {config.shifts.map((shift) => {
        const raw = config.constraints.find((c) => c.shiftId === shift.id);
        const dayGroups = normalizeDayGroups(
          raw as (ShiftConstraints & Record<string, unknown>) | undefined,
          shift,
        );
        return (
          <ShiftConstraintBlock
            key={shift.id}
            shift={shift}
            dayGroups={dayGroups}
            onUpdate={(groups) => handleUpdate(shift.id, groups)}
          />
        );
      })}
    </div>
  );
}

function ShiftConstraintBlock({
  shift,
  dayGroups,
  onUpdate,
}: {
  shift: Shift;
  dayGroups: DayGroupConstraint[];
  onUpdate: (groups: DayGroupConstraint[]) => void;
}) {
  const activeDays = getActiveDaysForShift(shift);
  const activeDaysOrdered = DAY_ORDER.filter((d) => activeDays.includes(d));

  function addGroup() {
    const newGroup: DayGroupConstraint = {
      id: generateId(),
      label: "",
      days: [...activeDays],
      min: 0,
      max: null,
    };
    onUpdate([...dayGroups, newGroup]);
  }

  function updateGroup(id: string, patch: Partial<DayGroupConstraint>) {
    onUpdate(dayGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGroup(id: string) {
    onUpdate(dayGroups.filter((g) => g.id !== id));
  }

  function toggleDay(group: DayGroupConstraint, day: DayOfWeek) {
    const next = group.days.includes(day)
      ? group.days.filter((d) => d !== day)
      : [...group.days, day];
    updateGroup(group.id, { days: next });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: shift.color }}
        />
        <span className="text-sm font-semibold text-gray-800">
          {shift.name}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          Active: {activeDaysOrdered.map((d) => DAY_LABELS[d]).join(", ")}
        </span>
      </div>

      {dayGroups.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          No constraints — click below to add one.
        </p>
      )}

      {dayGroups.map((group) => (
        <div key={group.id} className="bg-gray-50 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 flex-wrap">
              {activeDaysOrdered.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(group, day)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    group.days.includes(day)
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-gray-400 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
            <button
              title="Remove constraint group"
              onClick={() => removeGroup(group.id)}
              className="shrink-0 text-gray-400 hover:text-red-500 transition cursor-pointer p-0.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Min workers"
              type="number"
              min={0}
              value={group.min}
              onChange={(e) =>
                updateGroup(group.id, {
                  min: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
            />
            <Input
              label="Max workers"
              type="number"
              min={0}
              value={group.max ?? ""}
              placeholder="No limit"
              onChange={(e) =>
                updateGroup(group.id, {
                  max:
                    e.target.value === ""
                      ? null
                      : Math.max(0, parseInt(e.target.value) || 0),
                })
              }
            />
            {group.max !== null && group.max < group.min && (
              <p className="col-span-2 text-xs text-red-500">
                Max must be ≥ min ({group.min})
              </p>
            )}
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={addGroup}
        className="w-full"
      >
        + Add constraint group
      </Button>
    </div>
  );
}
