import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../types';
import { formatDisplayDate } from './attendance-dates';

/**
 * Downloads an invoice as a nicely formatted, printable PDF receipt.
 * Available to admins, managers, and parents.
 */
export const downloadReceiptPdf = (invoice: Invoice): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 56, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PLL ACADEMY', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL BILLING RECEIPT', doc.internal.pageSize.getWidth() / 2, 44, { align: 'center' });

  doc.setTextColor(20, 20, 20);

  // Invoice meta
  let y = 92;
  const line = (label: string, value: string): void => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, 40, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 200, y);
    y += 16;
  };

  line('Invoice ID', invoice.id);
  line('Date Issued', formatDisplayDate(invoice.date));
  line('Due Date', formatDisplayDate(invoice.dueDate));
  line('Status', invoice.status.toUpperCase());
  if (invoice.transactionId) line('Transaction ID', invoice.transactionId);

  y += 8;

  doc.setDrawColor(212, 175, 55);
  doc.line(40, y, doc.internal.pageSize.getWidth() - 40, y);
  y += 18;

  line('Student Athlete', invoice.studentName);
  line('Billing Guarantor', invoice.parentName);
  line('Guarantor Email', invoice.parentEmail);
  line('Semester Period', invoice.semester);

  y += 8;
  doc.line(40, y, doc.internal.pageSize.getWidth() - 40, y);
  y += 18;

  line('Course / Program', invoice.courseName);

  autoTable(doc, {
    startY: y,
    head: [['Tuition Fee', 'Total Amount']],
    body: [[`₹${invoice.amount.toFixed(2)}`, `₹${invoice.amount.toFixed(2)}`]],
    styles: { fontSize: 11, cellPadding: 6, halign: 'center' },
    headStyles: { fillColor: [212, 175, 55], textColor: 0 },
    margin: { left: 40, right: 40 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Thank you for supporting athletic excellence.', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  doc.text('PLL Academy · Billing Office', doc.internal.pageSize.getWidth() / 2, y + 14, { align: 'center' });

  doc.save(`receipt_${invoice.id}.pdf`);
};