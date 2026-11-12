import React, { useState } from 'react';
import { ReportDocument } from '../types';
import { DEFAULT_SECTIONS } from '../data/initialData';
import { X, FileText, BarChart3, Briefcase } from 'lucide-react';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (report: Partial<ReportDocument>) => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('');
  const [preparedBy, setPreparedBy] = useState('Office of Institutional Research & Planning');
  const [template, setTemplate] = useState<'standard' | 'executive' | 'departmental' | 'blank'>('standard');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || 'Untitled Institutional Report';

    let sections = DEFAULT_SECTIONS.map((s) => ({ ...s }));
    let customSummary = '';

    if (template === 'executive') {
      sections = sections.map((s) => ({
        ...s,
        enabled: ['kpi', 'summary', 'yearTrend', 'gender', 'findings'].includes(s.id)
      }));
      customSummary =
        'Executive Briefing: Summary of multi-year institutional student recruitment, academic capacity, and strategic demographic parity indicators for senate leadership.';
    } else if (template === 'departmental') {
      sections = sections.map((s) => ({
        ...s,
        enabled: ['summary', 'departments', 'campuses', 'findings'].includes(s.id)
      }));
      customSummary =
        'Faculty and Department Intake Review: Comprehensive enrollment distribution across academic divisions, colleges, and regional satellite campuses.';
    } else if (template === 'blank') {
      sections = [
        { id: 'summary', title: 'Executive Summary', enabled: true, type: 'summary' },
        { id: 'custom-1', title: 'Institutional Analysis', enabled: true, type: 'custom', customContent: 'Enter narrative findings and recommendations here...' },
        { id: 'notes', title: 'Data Source & Methodology', enabled: true, type: 'notes' }
      ];
    }

    onCreate({
      name: finalTitle,
      preparedBy: preparedBy.trim() || 'Institutional Research',
      institution: 'Oromia State University',
      status: 'Draft',
      sections,
      customSummary
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-report-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-[#C5D8CF] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F4C3A] text-white">
          <h2 id="new-report-title" className="text-lg font-serif font-bold tracking-tight">
            Create New Report
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CC7B7] hover:text-white transition-colors p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#324840] mb-1">
              Report Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Student Enrollment & Retention Audit (2026)"
              className="w-full px-3 py-2 border border-[#BFCDC8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-serif text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] mb-1">
              Prepared By / Author Office
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="e.g. Office of Institutional Research & Planning"
              className="w-full px-3 py-2 border border-[#BFCDC8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] mb-2">
              Select Starting Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  template === 'standard'
                    ? 'border-[#0F4C3A] bg-[#F1F8F4] ring-1 ring-[#0F4C3A]'
                    : 'border-[#D1DDD8] hover:bg-[#F9FCFA]'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={template === 'standard'}
                  onChange={() => setTemplate('standard')}
                  className="mt-1 accent-[#0F4C3A]"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#182924]">
                    <FileText className="w-4 h-4 text-[#0F4C3A]" />
                    Full Analytical Study
                  </div>
                  <div className="text-xs text-[#5D7068] mt-0.5">
                    Complete 10-section institutional analysis with KPI cards, charts, and raw ledger.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  template === 'executive'
                    ? 'border-[#0F4C3A] bg-[#F1F8F4] ring-1 ring-[#0F4C3A]'
                    : 'border-[#D1DDD8] hover:bg-[#F9FCFA]'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={template === 'executive'}
                  onChange={() => setTemplate('executive')}
                  className="mt-1 accent-[#0F4C3A]"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#182924]">
                    <Briefcase className="w-4 h-4 text-[#0F4C3A]" />
                    Executive Brief
                  </div>
                  <div className="text-xs text-[#5D7068] mt-0.5">
                    Focused high-level summary with key figures, charts, and strategic findings.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  template === 'departmental'
                    ? 'border-[#0F4C3A] bg-[#F1F8F4] ring-1 ring-[#0F4C3A]'
                    : 'border-[#D1DDD8] hover:bg-[#F9FCFA]'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={template === 'departmental'}
                  onChange={() => setTemplate('departmental')}
                  className="mt-1 accent-[#0F4C3A]"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#182924]">
                    <BarChart3 className="w-4 h-4 text-[#0F4C3A]" />
                    Department & Campus Audit
                  </div>
                  <div className="text-xs text-[#5D7068] mt-0.5">
                    Focused on department rollups, weekend satellite campuses, and capacity.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  template === 'blank'
                    ? 'border-[#0F4C3A] bg-[#F1F8F4] ring-1 ring-[#0F4C3A]'
                    : 'border-[#D1DDD8] hover:bg-[#F9FCFA]'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={template === 'blank'}
                  onChange={() => setTemplate('blank')}
                  className="mt-1 accent-[#0F4C3A]"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#182924]">
                    <FileText className="w-4 h-4 text-[#6B8077]" />
                    Custom Canvas
                  </div>
                  <div className="text-xs text-[#5D7068] mt-0.5">
                    Minimal starter document with editable narrative sections.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C5D8CF] text-[#283C35] rounded-lg hover:bg-[#F2F7F4] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C3A] text-white rounded-lg hover:bg-[#1A5C49] font-medium transition-colors shadow-xs"
            >
              Create Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
