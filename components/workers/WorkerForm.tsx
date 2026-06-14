"use client";

import { useState } from "react";
import { useScheduleStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import type { Worker, DayOfWeek } from "@/lib/types";

const WORKER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#f43f5e",
];

const DAY_CHIPS: { label: string; value: DayOfWeek }[] = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface WorkerFormProps {
  worker?: Worker;
  onClose: () => void;
}

export default function WorkerForm({ worker, onClose }: WorkerFormProps) {
  const config = useScheduleStore((s) => s.config);
  const addWorker = useScheduleStore((s) => s.addWorker);
  const updateWorker = useScheduleStore((s) => s.updateWorker);

  const existingCount = config?.workers.length ?? 0;
  const defaultColor = WORKER_COLORS[existingCount % WORKER_COLORS.length];

  // Normalize legacy preferWeekendsOff boolean to preferredDaysOff array
  const legacyPrefs = worker?.preferences as
    | Record<string, unknown>
    | undefined;
  const initialDaysOff: DayOfWeek[] = Array.isArray(
    legacyPrefs?.preferredDaysOff,
  )
    ? (legacyPrefs.preferredDaysOff as DayOfWeek[])
    : legacyPrefs?.preferWeekendsOff
      ? [0, 6]
      : [];

  const [form, setForm] = useState({
    name: worker?.name ?? "",
    hoursPerWeek: worker?.hoursPerWeek ?? 40,
    color: worker?.color ?? defaultColor,
    preferredDaysOff: initialDaysOff,
    preferredShiftId:
      worker?.preferences.preferredShiftId ?? (null as string | null),
    active: worker?.active ?? true,
  });

  const [error, setError] = useState("");

  function toggleDayOff(day: DayOfWeek) {
    setForm((f) => ({
      ...f,
      preferredDaysOff: f.preferredDaysOff.includes(day)
        ? f.preferredDaysOff.filter((d) => d !== day)
        : [...f.preferredDaysOff, day],
    }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    const workerData: Worker = {
      id: worker?.id ?? generateId(),
      name: form.name.trim(),
      hoursPerWeek: form.hoursPerWeek,
      color: form.color,
      active: form.active,
      preferences: {
        preferredDaysOff: form.preferredDaysOff,
        preferredShiftId: form.preferredShiftId,
      },
    };

    if (worker) {
      updateWorker(worker.id, workerData);
    } else {
      addWorker(workerData);
    }
    onClose();
  }

  return (
    <div className="space-y-4">
      <Input
        label="Name"
        value={form.name}
        onChange={(e) => {
          setForm((f) => ({ ...f, name: e.target.value }));
          setError("");
        }}
        error={error}
        placeholder="Worker name"
        autoFocus
      />

      <Input
        label="Hours per week"
        type="number"
        min={1}
        max={60}
        value={form.hoursPerWeek}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            hoursPerWeek: parseInt(e.target.value) || 40,
          }))
        }
      />

      {config && config.shifts.length > 0 && (
        <Select
          label="Preferred shift (optional)"
          value={form.preferredShiftId ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, preferredShiftId: e.target.value || null }))
          }
        >
          <option value="">No preference</option>
          {config.shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Preferred days off
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleDayOff(value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                form.preferredDaysOff.includes(value)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Highlighted days are preferred when assigning days off
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="flex gap-2 flex-wrap">
          {WORKER_COLORS.map((c) => (
            <button
              title={`Select color ${c}`}
              key={c}
              className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${form.color === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: c }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
      </div>

      {worker && (
        <Toggle
          checked={form.active}
          onChange={(v) => setForm((f) => ({ ...f, active: v }))}
          label="Active"
        />
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} className="flex-1">
          {worker ? "Save Changes" : "Add Worker"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
