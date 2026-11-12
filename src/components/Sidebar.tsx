import React, { useState } from 'react';
import { ReportDocument } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Check,
  X
} from 'lucide-react';

interface SidebarProps {
  reports: ReportDocument[];
  activeReportId: string;
  onSelectReport: (id: string) => void;
  onNewReport: () => void;
  onDuplicateReport: (report: ReportDocument) => void;
  onDeleteReport: (id: string) => void;
  onToggleSection: (sectionId: string) => void;
  onRebuildReport: () => void;
  onExportJSON: () => void;
  onExportHTML: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  reports,
  activeReportId,
  onSelectReport,
  onNewReport,
  onDuplicateReport,
  onDeleteReport,
  onToggleSection,
  onRebuildReport,
  onExportJSON,
  onExportHTML,
  isOpenMobile,
  onCloseMobile,
  isOpen = false
}) => {
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-72 lg:w-80 shrink-0 bg-[#0F4C3A] text-[#E4F1EB] p-4 lg:p-5 flex flex-col h-[calc(100vh-65px)] sticky top-[65px] border-r border-[#0A3428] overflow-y-auto z-30 transition-transform ${
          isOpenMobile
            ? 'fixed inset-y-0 left-0 top-0 h-full w-80'
            : isOpen
            ? 'hidden lg:flex'
            : 'hidden'
        }`}
        aria-label="Report Studio Sidebar"
      >
        {/* Top Action & Close */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={onNewReport}
            className="flex-1 py-2.5 px-4 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Report</span>
          </button>
          <button
            onClick={onCloseMobile}
            className="p-2 text-[#A0CBB9] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Hide side panel"
            aria-label="Hide side panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Saved Reports Accordion */}
        <div className="mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setReportsExpanded(!reportsExpanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#A0CBB9] hover:text-white uppercase tracking-wider cursor-pointer"
            >
              <span>Saved Reports ({reports.length})</span>
              {reportsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {reportsExpanded && (
            <ul className="space-y-1.5 mt-2 max-h-56 overflow-y-auto pr-1">
              {reports.map((r) => {
                const isActive = r.id === activeReportId;
                return (
                  <li
                    key={r.id}
                    className={`group rounded-lg p-2 transition-all flex items-center justify-between gap-2 text-xs ${
                      isActive
                        ? 'bg-white/15 text-white ring-1 ring-[#E0A526]'
                        : 'hover:bg-white/5 text-[#CADED4]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectReport(r.id);
                        if (isOpenMobile) onCloseMobile();
                      }}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="font-semibold truncate text-[#F4F9F6]">{r.name}</div>
                      <div className="text-[11px] text-[#91B8A8] truncate">
                        {r.status} · {formatTimestamp(r.updatedAt)}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateReport(r);
                        }}
                        title="Duplicate report"
                        className="p-1 text-[#91B8A8] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {reports.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(r.id);
                          }}
                          title="Delete report"
                          className="p-1 text-[#91B8A8] hover:text-red-300 hover:bg-white/10 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Section 2: Sections in Active Report */}
        {activeReport && (
          <div className="flex-1 mb-5 border-b border-white/10 pb-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setSectionsExpanded(!sectionsExpanded)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#A0CBB9] hover:text-white uppercase tracking-wider cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Document Sections</span>
                {sectionsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[11px] text-[#91B8A8]">
                {activeReport.sections.filter((s) => s.enabled).length}/{activeReport.sections.length} active
              </span>
            </div>

            {sectionsExpanded && (
              <div className="space-y-1 mt-2">
                {activeReport.sections.map((sec) => (
                  <label
                    key={sec.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      sec.enabled
                        ? 'bg-white/5 text-[#E7F3ED] hover:bg-white/10'
                        : 'text-[#7D9E92] hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate flex-1 font-medium">{sec.title}</span>
                    <input
                      type="checkbox"
                      checked={sec.enabled}
                      onChange={() => onToggleSection(sec.id)}
                      className="accent-[#E0A526] w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Document Maintenance & Sync */}
        <div className="space-y-2 mt-auto pt-2">
          <button
            onClick={onRebuildReport}
            className="w-full py-2 px-3 bg-white/10 hover:bg-white/15 text-[#E4F1EB] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
            title="Recalculates all tables and statistics from the raw data registry"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#E0A526]" />
            <span>Rebuild from Data Ledger</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-[#CADED4] rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer border border-white/5"
            >
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Export & Backup</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {exportOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#16382D] border border-white/15 rounded-lg shadow-xl p-1.5 z-40 text-xs space-y-1">
                <button
                  onClick={() => {
                    onExportHTML();
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 text-white flex items-center justify-between"
                >
                  <span>Export Report (HTML)</span>
                  <span className="text-[10px] text-[#9CC7B7]">Standalone</span>
                </button>
                <button
                  onClick={() => {
                    onExportJSON();
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 text-white flex items-center justify-between"
                >
                  <span>Backup All Reports (JSON)</span>
                  <span className="text-[10px] text-[#9CC7B7]">Full Data</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
