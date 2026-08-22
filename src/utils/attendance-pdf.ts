import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ManagerAttendanceRecord, StudentAttendanceRecord } from '../types';
import { formatDisplayDate } from './attendance-dates';

interface StudentPdfInput {
  title: string;
  from: string;
  to: string;
  records: StudentAttendanceRecord[];
  batchFilter?: string;
}

interface ManagerPdfInput {
  title: string;
  from: string;
  to: string;
  records: ManagerAttendanceRecord[];
}

/**
 * Downloads a consolidated student attendance PDF for a date range.
 */
export const downloadStudentAttendancePdf = (input: StudentPdfInput): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text(input.title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Date range: ${formatDisplayDate(input.from)} → ${formatDisplayDate(input.to)}${input.batchFilter ? `  |  Batch: ${input.batchFilter}` : ''}`,
    40,
    58
  );
  doc.text(`Generated: ${formatDisplayDate(new Date())}  |  Records: ${input.records.length}`, 40, 72);

  const present = input.records.filter((r) => r.status === 'Present').length;
  const late = input.records.filter((r) => r.status === 'Late').length;
  const absent = input.records.filter((r) => r.status === 'Absent').length;
  const excused = input.records.filter((r) => r.status === 'Excused').length;
  doc.text(`Summary — Present: ${present}  Late: ${late}  Absent: ${absent}  Excused: ${excused}`, 40, 86);

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Student', 'Batch', 'Status', 'Marked By', 'Notes']],
    body: input.records.map((record) => [
      formatDisplayDate(record.date),
      record.studentName,
      record.batch,
      record.status,
      `${record.markedBy} (${record.markedByRole})`,
      record.notes || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [212, 175, 55], textColor: 0 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`student-attendance_${input.from}_to_${input.to}.pdf`);
};

/**
 * Downloads a consolidated manager attendance PDF for a date range.
 */
export const downloadManagerAttendancePdf = (input: ManagerPdfInput): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text(input.title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Date range: ${formatDisplayDate(input.from)} → ${formatDisplayDate(input.to)}`,
    40,
    58
  );
  doc.text(`Generated: ${formatDisplayDate(new Date())}  |  Records: ${input.records.length}`, 40, 72);

  const onTime = input.records.filter((r) => r.status === 'On Time').length;
  const late = input.records.filter((r) => r.status === 'Late').length;
  doc.text(`Summary — On Time: ${onTime}  Late: ${late}`, 40, 86);

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Manager', 'Status', 'Check In', 'Check Out', 'Distance (m)', 'GPS']],
    body: input.records.map((record) => [
      formatDisplayDate(record.date),
      record.managerEmail,
      record.status,
      record.checkInTime,
      record.checkOutTime || '—',
      String(record.distanceFromAcademyMeters),
      record.verifiedGPS ? 'Verified' : 'No',
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [212, 175, 55], textColor: 0 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`manager-attendance_${input.from}_to_${input.to}.pdf`);
};
