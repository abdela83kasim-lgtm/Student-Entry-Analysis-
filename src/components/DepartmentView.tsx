import React, { useState, useMemo } from 'react';
import { DepartmentSummary, UserAccount } from '../types';
import {
  AnalyticsResult,
  formatNum,
  formatPct,
  PROGRAM_LEVELS
} from '../data/analytics';
import {
  Search,
  Plus,
  RefreshCw,
  ArrowUpDown,
  Edit2,
  Trash2,
  Filter,
  Layers,
  Database,
  Check,
  Building2,
  Printer,
  Download,
  Loader2,
  Lock
} from 'lucide-react';
import { exportReportToPDF } from '../utils/exportPdf';

interface DepartmentViewProps {
  analytics: AnalyticsResult;
  currentUserAccount?: UserAccount;
  onEditDept: (dept: DepartmentSummary) => void;
  onAddDept: () => void;
  onSaveDepartment?: (deptName: string, programLevel: string, yearsValues: number[]) => void;
  onOpenRecordModal?: () => void;
  onDeleteDept: (dept: DepartmentSummary) => void;
  onResetData: () => void;
}

type SortKey = 'dept' | 'prog' | 'total' | 'female' | string;

export const DepartmentView: React.FC<DepartmentViewProps> = ({
  analytics,
  currentUserAccount,
  onEditDept,
  onAddDept,
  onSaveDepartment,
  onOpenRecordModal,
  onDeleteDept,
  onResetData
}) => {
  const isScoped = Boolean(
    currentUserAccount &&
    currentUserAccount.programLevelScope &&
    currentUserAccount.programLevelScope !== 'ALL'
  );
  const scopedProgramLevel = isScoped ? currentUserAccount!.programLevelScope : null;

  const isDeptScoped = Boolean(
    currentUserAccount?.assignedDepartment &&
    currentUserAccount.assignedDepartment !== 'ALL'
  );
  const scopedDepartment = isDeptScoped ? currentUserAccount!.assignedDepartment : null;
  const isAdmin = currentUserAccount?.role === 'admin';

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState(scopedProgramLevel || '');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const years = useMemo(() => {
    const raw = analytics.years && analytics.years.length > 0 ? analytics.years : [2014, 2015, 2016, 2017, 2018];
    return Array.from(new Set(raw.filter((y) => typeof y === 'number' && !isNaN(y)))).sort((a, b) => a - b);
  }, [analytics.years]);

  // Inline Quick Add Department State
  const [showInlineRow, setShowInlineRow] = useState<boolean>(true);
  const [quickDeptName, setQuickDeptName] = useState<string>(scopedDepartment || '');
  const [quickProgLevel, setQuickProgLevel] = useState<string>(
    scopedProgramLevel || PROGRAM_LEVELS[0]
  );
  const [quickYears, setQuickYears] = useState<{ [year: number]: string }>({});
  const [quickError, setQuickError] = useState<string>('');

  const quickTotal = useMemo(() => {
    return years.reduce((acc, yr) => {
      const v = parseInt(quickYears[yr] || '0', 10);
      return acc + (isNaN(v) ? 0 : Math.max(0, v));
    }, 0);
  }, [quickYears, years]);

  const handleQuickAddDept = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuickError('');

    const targetDept = isDeptScoped && scopedDepartment ? scopedDepartment : quickDeptName.trim();

    if (!targetDept) {
      setQuickError('Please enter a Department name.');
      return;
    }

    const values = years.map((yr) => {
      const v = parseInt(quickYears[yr] || '0', 10);
      return isNaN(v) || v < 0 ? 0 : v;
    });

    if (values.reduce((a, b) => a + b, 0) === 0) {
      setQuickError('Enter entrants for at least one academic year.');
      return;
    }

    if (onSaveDepartment) {
      onSaveDepartment(targetDept, quickProgLevel, values);
    }

    // Reset quick fields
    if (!isDeptScoped) {
      setQuickDeptName('');
    }
    setQuickYears({});
    setQuickError('');
  };

  const filtered = useMemo(() => {
    let result = analytics.departments.filter((d) => {
      const matchSearch =
        d.department.toLowerCase().includes(search.toLowerCase()) ||
        d.program.toLowerCase().includes(search.toLowerCase());
      const matchLevel = !levelFilter || d.program === levelFilter;
      return matchSearch && matchLevel;
    });

    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'dept') {
        valA = a.department.toLowerCase();
        valB = b.department.toLowerCase();
      } else if (sortKey === 'prog') {
        valA = a.program.toLowerCase();
        valB = b.program.toLowerCase();
      } else if (sortKey === 'total') {
        valA = a.total;
        valB = b.total;
      } else if (sortKey === 'female') {
        valA = a.femaleShare2018 ?? -1;
        valB = b.femaleShare2018 ?? -1;
      } else {
        const yearIndex = years.indexOf(parseInt(sortKey, 10));
        valA = a.years[yearIndex] ?? 0;
        valB = b.years[yearIndex] ?? 0;
      }

      if (typeof valA === 'string') {
        return sortAsc
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [analytics.departments, search, levelFilter, sortKey, sortAsc, years]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'dept' || key === 'prog');
    }
  };

  // Compute filtered totals
  const filteredTotals = years.map((_, yIdx) =>
    filtered.reduce((acc, curr) => acc + (curr.years[yIdx] || 0), 0)
  );
  const filteredGrandTotal = filtered.reduce((acc, curr) => acc + curr.total, 0);

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    await exportReportToPDF('department-table-document', 'OSU_Department_List.pdf');
    setIsExporting(false);
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    } catch (e) {
      console.warn('System print failed or blocked by iframe:', e);
    }
    await exportReportToPDF('department-table-document', 'OSU_Department_List.pdf');
    setIsExporting(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Utility toolbar */}
      <div className="bg-white dark:bg-[#16221F] border border-[#D5E0DC] dark:border-[#273B35] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
            Total Departments: <strong className="text-[#0F4C3A] dark:text-[#A9D3C2]">{analytics.departments.length}</strong> · Filtered: <strong className="text-[#0F4C3A] dark:text-[#A9D3C2]">{filtered.length}</strong> programs
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download department list as PDF"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Open browser print / Save PDF"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{isExporting ? 'Generating PDF...' : 'Open System Print / Save PDF'}</span>
          </button>
        </div>
      </div>

      <article id="department-table-document" className="paper bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-xl shadow-lg border border-[#D5E0DC] dark:border-[#273B35] overflow-hidden">
        {/* Header */}
        <header className="bg-[#0F4C3A] text-white p-8 border-b-6 border-[#E0A526]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A9D3C2] font-semibold mb-1">
                Oromia State University · Academic Department Registry
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold">
              Department & Academic Program List
            </h1>
            <p className="text-xs sm:text-sm text-[#CFE6DC] mt-1">
              Live synchronized catalog: Any changes or additions immediately update the Data Ledger, Department List, and Report Document in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRecordModal && (
              <button
                onClick={onOpenRecordModal}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#E2EFE9] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
                title="Add individual detailed admissions record with campus and gender"
              >
                <Database className="w-3.5 h-3.5 text-[#E0A526]" />
                <span>Add Data Record</span>
              </button>
            )}

            <button
              onClick={onAddDept}
              className="px-4 py-2 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] text-xs sm:text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="p-6 border-b border-[#D5E2DC] dark:border-[#273B35] bg-[#FAFDFB] dark:bg-[#101A17] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#6A8077] absolute left-3 top-2.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search department or program..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              />
            </div>

            {/* Level Filter */}
            {isScoped ? (
              <div className="py-2 px-3 bg-[#EFF6F3] dark:bg-white/5 border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Scope: {scopedProgramLevel}</span>
              </div>
            ) : (
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="py-2 px-3 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              >
                <option value="">All Program Levels</option>
                {PROGRAM_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInlineRow(!showInlineRow)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showInlineRow
                  ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                  : 'bg-white dark:bg-white/5 border-[#C5D8CF] dark:border-white/10 text-[#283C35] dark:text-[#A9D3C2]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showInlineRow ? 'Hide Quick Add' : 'Quick Add Row'}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  onResetData();
                }}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-[#C5D8CF] dark:border-white/10 text-[#283C35] dark:text-[#A9D3C2] hover:bg-[#EFF5F2] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset to Excel baseline data"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5B6B70]" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
            <Lock className="w-4 h-4 text-[#0F4C3A] dark:text-[#A9D3C2] shrink-0" />
            <span>
              <strong>Add-Only Data Policy:</strong> You are authorized to <strong>add new student admissions</strong>. Editing, deleting, or resetting baseline records is restricted to Administrator.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
          <span>
            Showing <strong className="text-[#17262B] dark:text-white">{filtered.length}</strong> of{' '}
            <strong className="text-[#17262B] dark:text-white">{analytics.departments.length}</strong> departments
          </span>
          <span className="italic">
            Synchronized: Adding or editing here creates records in the Data Ledger and updates the active Report instantly.
          </span>
        </div>
      </div>

      {/* Inline Quick Add Error */}
      {showInlineRow && quickError && (
        <div className="px-6 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 text-red-800 dark:text-red-300 text-xs font-medium flex items-center justify-between">
          <span>{quickError}</span>
          <button onClick={() => setQuickError('')} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Department Table */}
      <div className="overflow-x-auto p-4 sm:p-6">
        <table className="w-full text-xs sm:text-sm border-collapse text-left">
          <thead>
            <tr className="bg-[#1F7A5C] text-white">
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort('dept')}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort('prog')}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Program Level</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {years.map((y, idx) => (
                <th key={`dept-th-year-${y ?? idx}`} className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    onClick={() => handleSort(String(y))}
                    className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                  >
                    <span>{y}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                <button
                  onClick={() => handleSort('total')}
                  className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                >
                  <span>All Years</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                <button
                  onClick={() => handleSort('female')}
                  className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                >
                  <span>{analytics.latestYear} Female %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3ECE7] dark:divide-[#273B35]">
            {/* INLINE QUICK ADD ROW FOR DEPARTMENT LIST */}
            {showInlineRow && (
              <tr key="dept-quick-add-row" className="bg-[#EFF8F4] dark:bg-[#142922] border-b-2 border-[#1F7A5C]">
                {/* Department Name */}
                <td className="p-1.5 min-w-[180px]">
                  {isDeptScoped ? (
                    <div className="w-full px-2 py-1 text-xs border border-emerald-300 dark:border-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#E0A526]" />
                      <span>{scopedDepartment}</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        list="dept-view-departments-list"
                        value={quickDeptName}
                        onChange={(e) => setQuickDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickAddDept();
                        }}
                        placeholder="Click to pick or enter new department..."
                        className="w-full px-2 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-semibold"
                      />
                      <datalist id="dept-view-departments-list">
                        {Array.from(new Set(analytics.departments.map((d) => d.department))).map((dept) => (
                          <option key={dept} value={dept} />
                        ))}
                      </datalist>
                    </>
                  )}
                </td>

                {/* Program Level */}
                <td className="p-1.5 min-w-[150px]">
                  {isScoped ? (
                    <div className="w-full px-2 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] truncate">
                      {scopedProgramLevel}
                    </div>
                  ) : (
                    <select
                      value={quickProgLevel}
                      onChange={(e) => setQuickProgLevel(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17]"
                    >
                      {PROGRAM_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  )}
                </td>

                {/* Year inputs */}
                {years.map((yr, idx) => (
                  <td key={`quick-year-td-${yr ?? idx}`} className="p-1.5">
                    <input
                      type="number"
                      min="0"
                      value={quickYears[yr] || ''}
                      onChange={(e) =>
                        setQuickYears({ ...quickYears, [yr]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAddDept();
                      }}
                      placeholder="0"
                      className="w-16 px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-mono text-right"
                    />
                  </td>
                ))}

                {/* Live Total */}
                <td className="p-1.5 text-right font-bold text-[#0F4C3A] dark:text-[#E0A526] tabular-nums whitespace-nowrap">
                  {quickTotal > 0 ? formatNum(quickTotal) : '–'}
                </td>

                {/* Female % note */}
                <td className="p-1.5 text-right text-xs text-[#6B8077] italic whitespace-nowrap">
                  Calculated
                </td>

                {/* Action button */}
              </tr>
            )}

            {filtered.length === 0 ? (
              <tr key="dept-empty-row">
                <td colSpan={years.length + 4} className="py-8 text-center text-sm text-[#5B6B70]">
                  No departments match your search. Clear filters to view all entries.
                </td>
              </tr>
            ) : (
              filtered.map((d, idx) => (
                <tr key={`dept-row-${d.department}-${d.program}-${idx}`} className="hover:bg-[#F7FAF8] dark:hover:bg-white/5 group">
                  <td className="py-2 px-3 font-medium text-[#1A2E26] dark:text-white">{d.department}</td>
                  <td className="py-2 px-3 text-[#52665F] dark:text-[#A9D3C2]">{d.program}</td>
                  {years.map((yr, yIdx) => (
                    <td key={`dept-cell-${d.department}-${d.program}-${yr ?? yIdx}`} className="py-2 px-3 text-right tabular-nums text-[#33463F] dark:text-[#CFE6DC]">
                      {formatNum(d.years[yIdx])}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A] dark:text-[#E0A526]">
                    {formatNum(d.total)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#8D4258] dark:text-[#E88EA8] font-medium">
                    {formatPct(d.femaleShare2018)}
                  </td>
                </tr>
              ))
            )}
            <tr key="dept-footer-total-row" className="bg-[#EFF5F2] dark:bg-[#101A17] font-bold border-t-2 border-[#0F4C3A]">
              <td className="py-2.5 px-3 text-[#0F4C3A] dark:text-[#E0A526]" colSpan={2}>
                Total ({filtered.length} departments)
              </td>
              {filteredTotals.map((tot, idx) => (
                <td key={`dept-tot-col-${years[idx] ?? idx}`} className="py-2.5 px-3 text-right tabular-nums">
                  {formatNum(tot)}
                </td>
              ))}
              <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A] dark:text-[#E0A526]">
                {formatNum(filteredGrandTotal)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#8D4258] dark:text-[#E88EA8]" colSpan={1}>
                –
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </div>
);
};
