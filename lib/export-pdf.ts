"use client";

import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { MonthSchedule, ScheduleConfig } from "./types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
}

function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + (sm ?? 0);
  let end = eh * 60 + (em ?? 0);
  if (end <= start) end += 24 * 60; // overnight shift
  return (end - start) / 60;
}

type RowStyle = "off" | "weekend" | "working";

interface RowMeta {
  _style: RowStyle;
  _shiftColor: string | null;
}

export function exportWorkerSchedulePDF(
  schedule: MonthSchedule,
  config: ScheduleConfig,
  year: number,
  month: number,
): void {
  const activeWorkers = config.workers.filter((w) => w.active);
  if (activeWorkers.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  activeWorkers.forEach((worker, workerIndex) => {
    if (workerIndex > 0) doc.addPage();

    // Header: colored circle + worker name
    const [wr, wg, wb] = hexToRgb(worker.color);
    doc.setFillColor(wr, wg, wb);
    doc.circle(margin + 3, 22, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(worker.name, margin + 9, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(monthLabel, pageWidth - margin, 24, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 29, pageWidth - margin, 29);

    // Build rows
    const workerEntries = schedule.entries
      .filter((e) => e.workerId === worker.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    let workingDays = 0;
    let totalHours = 0;

    const rowMetas: RowMeta[] = [];
    const tableBody: string[][] = [];

    for (const entry of workerEntries) {
      const date = parseISO(entry.date);
      const dow = date.getDay();
      const isOff = entry.shiftId === null || entry.status === "off";
      const shift = isOff
        ? null
        : (config.shifts.find((s) => s.id === entry.shiftId) ?? null);

      if (!isOff) {
        workingDays++;
        if (shift) totalHours += shiftHours(shift.startTime, shift.endTime);
      }

      const isWeekend = dow === 0 || dow === 6;
      const style: RowStyle = isOff ? "off" : isWeekend ? "weekend" : "working";

      rowMetas.push({ _style: style, _shiftColor: shift?.color ?? null });
      tableBody.push([
        format(date, "dd MMM"),
        format(date, "EEEE"),
        shift ? shift.name : "—",
        shift ? `${shift.startTime}–${shift.endTime}` : "—",
        isOff ? "Day Off" : "Working",
      ]);
    }

    const daysOff = workerEntries.length - workingDays;
    const hoursRounded = Math.round(totalHours);

    autoTable(doc, {
      startY: 33,
      margin: { left: margin, right: margin },
      head: [["Date", "Day", "Shift", "Hours", "Status"]],
      body: tableBody,
      theme: "plain",
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [80, 80, 80],
        fontSize: 8,
        fontStyle: "bold",
        lineColor: [220, 220, 220],
        lineWidth: { bottom: 0.3 },
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 6 },
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 34 },
        2: { cellWidth: 40 },
        3: { cellWidth: 34 },
        4: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const meta = rowMetas[data.row.index];
        if (!meta) return;
        if (meta._style === "off") {
          data.cell.styles.fillColor = [248, 248, 248];
          data.cell.styles.textColor = [140, 140, 140];
        } else if (meta._style === "weekend") {
          data.cell.styles.fillColor = [239, 246, 255];
        } else {
          data.cell.styles.fillColor = [255, 255, 255];
        }
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 2) return;
        const meta = rowMetas[data.row.index];
        if (!meta?._shiftColor) return;
        const [cr, cg, cb] = hexToRgb(meta._shiftColor);
        doc.setFillColor(cr, cg, cb);
        doc.rect(data.cell.x, data.cell.y, 2, data.cell.height, "F");
      },
    });

    const lastTable = (
      doc as unknown as { lastAutoTable?: { finalY?: number } }
    ).lastAutoTable;
    const finalY = lastTable?.finalY ?? 220;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Working days: ${workingDays}   ·   Days off: ${daysOff}   ·   ~${hoursRounded}h`,
      margin,
      finalY + 9,
    );
  });

  doc.save(`schedule-${year}-${pad(month)}-workers.pdf`);
}
