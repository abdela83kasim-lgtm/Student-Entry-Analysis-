import React, { useState } from 'react';
import { X, Printer, Download, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { exportReportToPDF } from '../utils/exportPdf';
import { LIVE_PORTAL_URL } from '../types';
import { formatYearSpan } from '../data/analytics';

const OSU_LOGO_PATH = '/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  years?: number[];
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose, years }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  if (!isOpen) return null;

  const yearSpan = formatYearSpan(years, '–');
  const firstYear = years && years.length > 0 ? years[0] : 2014;
  const latestYear = years && years.length > 0 ? years[years.length - 1] : 2018;
  const yearRangeText = firstYear === latestYear ? String(firstYear) : `${firstYear} through ${latestYear}`;

  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportReportToPDF('osu-docs-container', 'Oromia_State_University_Student_Report_Documentation.pdf');
    setIsExporting(false);
  };

  const handleExportDOCX = async () => {
    setIsExportingDocx(true);
    const { exportDocumentationToDOCX } = await import('../utils/exportDocx');
    await exportDocumentationToDOCX('Oromia_State_University_Student_Report_Documentation.docx', years);
    setIsExportingDocx(false);
  };

  const handlePrint = async () => {
    const docsEl = document.getElementById('osu-docs-container');
    if (!docsEl) {
      window.print();
      return;
    }

    // Inline the OSU logo into the printable iframe so System Print always renders the logo cleanly
    let logoDataUri = OSU_LOGO_PATH;
    try {
      const res = await fetch(OSU_LOGO_PATH);
      if (res.ok) {
        const blob = await res.blob();
        logoDataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    const clone = docsEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('img').forEach((img) => {
      img.setAttribute('src', logoDataUri);
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Oromia State University Documentation</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #162521; background: #fff; line-height: 1.55; margin: 0; padding: 12px; }
  h1, h2, h3 { font-family: Georgia, serif; color: #0F4C3A; }
  img { max-width: 72px; height: auto; display: block; margin: 0 auto 10px; }
  section { margin-bottom: 20px; break-inside: avoid; }
  ul { padding-left: 20px; }
  .text-center { text-align: center; }
</style>
</head>
<body>${clone.innerHTML}</body>
</html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 250);
    } else {
      document.body.removeChild(iframe);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16221F] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-[#D5E2DC] dark:border-[#2A3B37] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0F4C3A] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#E0A526] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 p-1">
              <img
                src={OSU_LOGO_PATH}
                alt="Oromia State University Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-white">
                Official System & User Documentation
              </h2>
              <p className="text-xs text-[#A9D3C2]">
                Oromia State University Student Report ({yearSpan})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDOCX}
              disabled={isExportingDocx}
              className="px-3.5 py-2 bg-[#E7F3ED] hover:bg-white text-[#0F4C3A] font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Generate and download official documentation as Word (.docx) with logo"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingDocx ? 'Generating DOCX...' : 'Download DOCX'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3.5 py-2 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Download official documentation as PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-[#CADED4] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Print documentation"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#CADED4] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close documentation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Documentation Content */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-[#FAFDFB] dark:bg-[#0D1513] text-[#162521] dark:text-[#E7EFEC]" id="osu-docs-container">
          {/* Cover / Title Block */}
          <div className="text-center pb-8 border-b border-[#D5E2DC] dark:border-[#2A3B37]">
            <img
              src={OSU_LOGO_PATH}
              alt="Oromia State University Emblem"
              className="w-16 h-16 mx-auto mb-3 object-contain"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F4C3A]/10 dark:bg-[#E0A526]/10 text-[#0F4C3A] dark:text-[#E0A526] rounded-full text-xs font-semibold mb-3">
              Institutional Technical & User Manual
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#0F4C3A] dark:text-[#EAEFEA]">
              Oromia State University Student Report
            </h1>
            <p className="text-sm text-[#5B6B70] dark:text-[#9DB0AA] max-w-2xl mx-auto mt-2">
              Comprehensive reference guide for preparing, editing, analyzing, calculating, and exporting institutional active student statistics and program level admissions.
            </p>
            <div className="mt-3">
              <a
                href={LIVE_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] hover:underline"
              >
                <span>Official Portal URL: {LIVE_PORTAL_URL}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0F4C3A] text-white text-xs flex items-center justify-center font-sans font-bold">1</span>
              <span>Executive Overview & Purpose</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#324840] dark:text-[#CFE6DC]">
              The <strong>Oromia State University Student Report</strong> is an institutional web portal designed for the Office of Academic Registrar, departmental admission coordinators, and executive leadership. It aggregates and tracks student enrollment data across academic years ({yearSpan}), covering multiple program levels (1st Degree Applied, 1st Degree Education, Diploma & Certificate, Masters, and PhD), delivery modes (Regular, Evening, Summer, Distance/Weekend), and regional satellite campuses (Adama, Bishoftu, Nekemte, Jimma, Shashemene, etc.).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0F4C3A] text-white text-xs flex items-center justify-center font-sans font-bold">2</span>
              <span>User Roles & Access Control (RBAC)</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#324840] dark:text-[#CFE6DC]">
              The system supports granular role-based access control with dedicated user accounts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-white dark:bg-[#16221F] rounded-xl border border-[#D5E2DC] dark:border-[#2A3B37]">
                <div className="font-bold text-xs text-[#0F4C3A] dark:text-[#A9D3C2] uppercase">Academic Registrar (@registrar)</div>
                <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1">Full institutional enrollment authority across all faculties and program levels.</p>
              </div>
              <div className="p-4 bg-white dark:bg-[#16221F] rounded-xl border border-[#D5E2DC] dark:border-[#2A3B37]">
                <div className="font-bold text-xs text-[#0F4C3A] dark:text-[#A9D3C2] uppercase">Department Admission Officers (@accounting_lead, etc.)</div>
                <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1">Departmental coordinators managing intake records for specific academic departments.</p>
              </div>
              <div className="p-4 bg-white dark:bg-[#16221F] rounded-xl border border-[#D5E2DC] dark:border-[#2A3B37]">
                <div className="font-bold text-xs text-[#0F4C3A] dark:text-[#A9D3C2] uppercase">Program Level Coordinators (@applied, @education, @diploma, @masters, @phd)</div>
                <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1">Faculty coordinators overseeing specific degree tiers and student pathways.</p>
              </div>
              <div className="p-4 bg-white dark:bg-[#16221F] rounded-xl border border-[#D5E2DC] dark:border-[#2A3B37]">
                <div className="font-bold text-xs text-[#0F4C3A] dark:text-[#A9D3C2] uppercase">University Executive Admin (@admin)</div>
                <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1">System administrator managing user accounts, passwords, department assignments, and archival status.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0F4C3A] text-white text-xs flex items-center justify-center font-sans font-bold">3</span>
              <span>Data Ledger & Management</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#324840] dark:text-[#CFE6DC]">
              The Data Ledger view provides complete CRUD (Create, Read, Update, Delete) management for raw student enrollment records. Each record comprises:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 text-[#324840] dark:text-[#CFE6DC] pl-2">
              <li><strong>Academic Year:</strong> {yearRangeText}</li>
              <li><strong>Program Level:</strong> 1st Degree (Applied), 1st Degree (Education), Diploma & Certificate, Masters, PhD</li>
              <li><strong>Department:</strong> Accounting, Law, Economics, Computer Science, etc.</li>
              <li><strong>Delivery Mode:</strong> Regular, Evening, Summer, Distance</li>
              <li><strong>Campus:</strong> Main Campus Adama, Regional Centers</li>
              <li><strong>Gender Breakdown:</strong> Male, Female, and automatically computed Total</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0F4C3A] text-white text-xs flex items-center justify-center font-sans font-bold">4</span>
              <span>Analytics & Calculation Engine</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#324840] dark:text-[#CFE6DC]">
              The built-in analytics engine instantly computes institutional KPIs, year-on-year growth rates, female participation percentage shares, and faculty distribution summaries. All numerical data maintains strict tabular formatting with tabular-nums font variants for precision.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0F4C3A] text-white text-xs flex items-center justify-center font-sans font-bold">5</span>
              <span>Reporting & PDF Export</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#324840] dark:text-[#CFE6DC]">
              Users can customize report sections, add executive summaries and findings, and generate high-fidelity PDF documents using advanced DOM cloning and client-side rendering (`html-to-image` and `jsPDF`). Standalone HTML exports and JSON data backups are also supported.
            </p>
          </section>

          {/* Footer note in docs */}
          <div className="pt-6 border-t border-[#D5E2DC] dark:border-[#2A3B37] text-center text-xs text-[#6B8077]">
            © Oromia State University | Copyright by Abdela Kasim · Institutional Planning & Statistics
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white dark:bg-[#16221F] px-6 py-4 border-t border-[#D5E2DC] dark:border-[#2A3B37] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
