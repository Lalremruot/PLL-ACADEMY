import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { X, Printer, CheckCircle, AlertTriangle, Clock, Trophy, Award, IndianRupee } from 'lucide-react';
import { Invoice } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';

interface InvoiceReceiptModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaySuccess?: (invoiceId: string) => void;
}

export default function InvoiceReceiptModal({ invoice, onClose, onPaySuccess }: InvoiceReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    if (printContent) {
      // Inline visual-only printing simulation, or trigger native print if possible.
      // Since alert/new window is discouraged in sandboxed iframe, we'll simulate a gorgeous print receipt style.
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Receipt - ${invoice.id}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                body { font-family: 'Roboto Mono', ui-monospace, 'Courier New', monospace; padding: 40px; color: #1a1a1a; background: #fff; }
                .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px dashed #000; padding-bottom: 20px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
                .bold { font-weight: bold; }
                .divider { border-bottom: 1px dashed #000; margin: 20px 0; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <h2>FOOTBALL ACADEMY LEDGER</h2>
                  <p>PLL ACADEMY</p>
                  <p>OFFICIAL BILLING RECEIPT</p>
                </div>
                <div class="row"><span class="bold">Invoice ID:</span><span>${invoice.id}</span></div>
                <div class="row"><span class="bold">Date Issued:</span><span>${formatDisplayDate(invoice.date)}</span></div>
                <div class="row"><span class="bold">Due Date:</span><span>${formatDisplayDate(invoice.dueDate)}</span></div>
                <div class="row"><span class="bold">Status:</span><span>${invoice.status.toUpperCase()}</span></div>
                ${invoice.transactionId ? `<div class="row"><span class="bold">Transaction ID:</span><span>${invoice.transactionId}</span></div>` : ''}
                <div class="divider"></div>
                <div class="row"><span class="bold">Student:</span><span>${invoice.studentName}</span></div>
                <div class="row"><span class="bold">Billing For:</span><span>${invoice.parentName}</span></div>
                <div class="row"><span class="bold">Parent Email:</span><span>${invoice.parentEmail}</span></div>
                <div class="row"><span class="bold">Semester:</span><span>${invoice.semester}</span></div>
                <div class="divider"></div>
                <div class="row"><span class="bold">Course / Class:</span><span>${invoice.courseName}</span></div>
                <div class="row"><span class="bold">Tuition Fee:</span><span class="bold">₹${invoice.amount.toFixed(2)}</span></div>
                <div class="divider"></div>
                <div class="row" style="font-size: 18px;"><span class="bold">TOTAL AMOUNT:</span><span class="bold">₹${invoice.amount.toFixed(2)}</span></div>
                <div class="footer">
                  <p>Thank you for supporting Athletic Excellence.</p>
                  <p>PLL Academy &bull; Billing Office</p>
                </div>
              </div>
              <script>window.onload = function() { window.print(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Fallback simulated print notification
        alert("Receipt format prepared! Press Ctrl+P or Cmd+P to print.");
      }
    }
  };

  return (
    <div id={`modal-${invoice.id}`} className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto border border-brand-border bg-brand-surface-modal rounded-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border bg-brand-charcoal px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-gold" />
            <h3 className="font-sans text-lg font-semibold text-white tracking-tight">
              Football Ledger Receipt
            </h3>
          </div>
          <button
            id={`close-btn-${invoice.id}`}
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-brand-border hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 sm:overflow-y-auto sm:max-h-[75vh]" ref={printRef}>
          {/* Status Banner */}
          <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-charcoal/50 p-6 text-center">
            {invoice.status === 'Success' && (
              <>
                <div className="mb-2 rounded-full bg-brand-emerald/10 p-3 text-brand-emerald">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-emerald">
                  Transaction Paid
                </span>
                <span className="mt-1 font-mono text-3xl font-bold text-white tracking-tight">
                  ₹{invoice.amount.toFixed(2)}
                </span>
                <p className="mt-2 font-mono text-xs text-gray-500">
                  Ref ID: {invoice.transactionId || 'TXN-AUTO-9201'}
                </p>
              </>
            )}

            {invoice.status === 'Failed' && (
              <>
                <div className="mb-2 rounded-full bg-brand-cinnabar/10 p-3 text-brand-cinnabar">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-cinnabar">
                  Transaction Failed / Overdue
                </span>
                <span className="mt-1 font-mono text-3xl font-bold text-white tracking-tight">
                  ₹{invoice.amount.toFixed(2)}
                </span>
                <p className="mt-2 font-sans text-xs text-gray-400">
                  Please initiate a payment from the Parent Portal immediately.
                </p>
              </>
            )}

            {invoice.status === 'Pending' && (
              <>
                <div className="mb-2 rounded-full bg-brand-amethyst/10 p-3 text-brand-amethyst">
                  <Clock className="h-8 w-8" />
                </div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-amethyst">
                  Payment Outstanding
                </span>
                <span className="mt-1 font-mono text-3xl font-bold text-white tracking-tight">
                  ₹{invoice.amount.toFixed(2)}
                </span>
                <p className="mt-2 font-sans text-xs text-gray-400">
                  Payment is scheduled for automatic draft or direct transfer.
                </p>
              </>
            )}
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-brand-gold">
              Ledger Specifications
            </h4>

            <div className="grid grid-cols-2 gap-4 border-b border-brand-border pb-4">
              <div>
                <span className="block font-sans text-xs text-gray-500">Invoice ID</span>
                <span className="font-mono text-sm text-white font-medium">{invoice.id}</span>
              </div>
              <div>
                <span className="block font-sans text-xs text-gray-500">Semester Period</span>
                <span className="font-sans text-sm text-white font-medium">{invoice.semester}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-brand-border pb-4">
              <div>
                <span className="block font-sans text-xs text-gray-500">Student Athlete</span>
                <span className="font-sans text-sm text-white font-medium">{invoice.studentName}</span>
              </div>
              <div>
                <span className="block font-sans text-xs text-gray-500">Billing Guarantor</span>
                <span className="font-sans text-sm text-white font-medium">{invoice.parentName}</span>
              </div>
            </div>

            <div className="border-b border-brand-border pb-4">
              <span className="block font-sans text-xs text-gray-500">Notification Dispatch</span>
              <span className="font-mono text-xs text-gray-300">{invoice.parentEmail}</span>
            </div>

            <div className="border-b border-brand-border pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-xs text-gray-500">Football Program / Course</span>
                <span className="rounded-full bg-brand-charcoal px-2.5 py-0.5 font-mono text-[10px] text-brand-gold tracking-wide">
                  {invoice.amount >= 400 ? 'PREMIUM TIER' : 'STANDARD TIER'}
                </span>
              </div>
              <p className="font-sans text-sm text-white font-semibold flex items-center gap-1.5">
                <Award className="h-4 w-4 text-brand-gold shrink-0" />
                {invoice.courseName}
              </p>
            </div>

            {/* Timestamps */}
            <div className="flex justify-between font-mono text-xs text-gray-500 py-1">
              <span>Issued: {formatDisplayDate(invoice.date)}</span>
              <span>Due Date: {formatDisplayDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center border-t border-brand-border bg-brand-charcoal px-6 py-4">
          <button
            id={`print-invoice-btn-${invoice.id}`}
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xs border border-brand-border hover:border-brand-gold bg-transparent px-4 py-2 font-sans text-xs font-medium text-white transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-brand-gold" />
            Print Ledger Copy
          </button>

          <div className="flex gap-2">
            {invoice.status !== 'Success' && onPaySuccess && (
              <button
                id={`modal-pay-btn-${invoice.id}`}
                onClick={() => {
                  onPaySuccess(invoice.id);
                  onClose();
                }}
                className="rounded-xs bg-brand-gold hover:bg-brand-gold-bright px-4 py-2 font-sans text-xs font-semibold text-black transition-all cursor-pointer shadow-md"
              >
                Direct Settlement
              </button>
            )}
            <button
              id={`close-footer-btn-${invoice.id}`}
              onClick={onClose}
              className="rounded-xs bg-brand-border hover:bg-gray-700 px-4 py-2 font-sans text-xs font-medium text-white transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
