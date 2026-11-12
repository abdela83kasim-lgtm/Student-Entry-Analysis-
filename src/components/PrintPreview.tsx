import React, { useState } from 'react';
import { ReportDocument } from '../types';
import { AnalyticsResult } from '../data/analytics';
import { ReportPaper } from './ReportPaper';
import { Printer, ArrowLeft, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { exportReportToPDF } from '../utils/exportPdf';

interface PrintPreviewProps {
  report: ReportDocument;
  analytics: AnalyticsResult;
  onBackToReport: () => void;
  onPrint: () => void;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  report,
  analytics,
  onBackToReport,
  onPrint
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handlePrintAndSave = async () => {
    setIsExporting(true);
    let printAttempted = false;
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
        printAttempted = true;
      }
    } catch (err) {
      console.warn('Browser print blocked or unsupported in iframe:', err);
    }

    // Always generate high-fidelity PDF so the action reliably produces the document
    await exportReportToPDF('osu-report-paper', `${report.name || 'OSU_Report'}.pdf`);
    setIsExporting(false);
  };

  const handleDirectPDF = async () => {
    setIsExporting(true);
    await exportReportToPDF('osu-report-paper', `${report.name || 'OSU_Report'}.pdf`);
    setIsExporting(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Utility toolbar */}
      <div className="bg-white dark:bg-[#16221F] border border-[#D5E0DC] dark:border-[#273B35] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] hover:bg-[#F2F7F4] dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer border border-[#C5D8CF] dark:border-[#334641]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Editor</span>
          </button>
          <div className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] hidden sm:block">
            Print Preview mode: A4 Layout (210mm × 297mm)
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDirectPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Generate and download PDF file directly"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrintAndSave}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Open browser print dialog or save as PDF"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{isExporting ? 'Generating PDF...' : 'Open System Print / Save PDF'}</span>
          </button>
        </div>
      </div>

      {/* Simulated A4 Paper */}
      <div className="p-4 sm:p-8 bg-[#DCE4E0] rounded-xl flex justify-center shadow-inner overflow-x-auto">
        <div className="w-full max-w-[850px] shadow-2xl bg-white">
          <ReportPaper
            report={report}
            analytics={analytics}
            isEditing={false}
            onUpdateReport={() => {}}
            onAddFinding={() => {}}
            onDeleteFinding={() => {}}
            onAddNote={() => {}}
            onDeleteNote={() => {}}
            onOpenDataLedger={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
