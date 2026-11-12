import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RawRecord, UserAccount } from '../types';
import {
  formatNum,
  formatPct,
  PROGRAM_LEVELS,
  STUDY_MODES,
  YEARS,
  getDefaultSourceCell
} from '../data/analytics';
import {
  Search,
  Plus,
  RefreshCw,
  ArrowUpDown,
  Download,
  Filter,
  Trash2,
  Edit2,
  Check,
  Calculator,
  Sparkles,
  Layers,
  Printer,
  Loader2,
  Lock,
  ChevronDown
} from 'lucide-react';
import { exportReportToPDF } from '../utils/exportPdf';

interface DataLedgerViewProps {
  records: RawRecord[];
  currentUserAccount?: UserAccount;
  onAddRecord: () => void;
  onSaveNewRecord?: (record: RawRecord) => void;
  onEditRecord: (record: RawRecord, index: number) => void;
  onDeleteRecord: (record: RawRecord, index: number) => void;
  onResetData: () => void;
  onMarkDataEntryComplete?: () => void;
}

export const DataLedgerView: React.FC<DataLedgerViewProps> = ({
  records,
  currentUserAccount,
  onAddRecord,
  onSaveNewRecord,
  onEditRecord,
  onDeleteRecord,
  onResetData,
  onMarkDataEntryComplete
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
  const assignedDept = isDeptScoped ? currentUserAccount!.assignedDepartment! : null;

  const isAdmin = currentUserAccount?.role === 'admin';
  const canEditOrDelete = isAdmin;

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [programFilter, setProgramFilter] = useState(scopedProgramLevel || '');
  const [modeFilter, setModeFilter] = useState('');
  const [sortKey, setSortKey] = useState<number>(0);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Inline Quick Add State
  const [quickYear, setQuickYear] = useState<number>(2018);
  const [quickProgram, setQuickProgram] = useState<string>(
    scopedProgramLevel || PROGRAM_LEVELS[0]
  );
  const [quickDepartment, setQuickDepartment] = useState<string>(
    assignedDept || ''
  );
  const [quickMode, setQuickMode] = useState<string>(STUDY_MODES[0]);
  const [quickCampus, setQuickCampus] = useState<string>('');
  const [quickMale, setQuickMale] = useState<string>('');
  const [quickFemale, setQuickFemale] = useState<string>('');
  const [quickSourceCell, setQuickSourceCell] = useState<string>('');
  const [inlineError, setInlineError] = useState<string>('');
  const [showInlineRow, setShowInlineRow] = useState<boolean>(true);

  // Department List & Dropdown State
  const [deptDropdownOpen, setDeptDropdownOpen] = useState<boolean>(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  // Retrieve all existing departments from records + standard defaults
  const allDepartments = useMemo(() => {
    const fromRecords = records.map((r) => r[2]).filter(Boolean);
    const defaults = [
      'Accounting',
      'Accounting and Finance',
      'Banking and Finance',
      'Business Administration',
      'Computer Science',
      'Cooperative Accounting and Auditing',
      'Development Economics',
      'Economics',
      'Governance and Development Studies',
      'Human Resource Management',
      'Information Technology',
      'Law',
      'Leadership and Good Governance',
      'Management',
      'Marketing Management',
      'Master of Business Administration (MBA)',
      'Public Administration',
      'Public Finance and Taxation',
      'Public Financial Management',
      'Public Management',
      'Public Policy and Administration',
      'Project Management',
      'Rural Development and Agricultural Extension',
      'Tax and Customs Administration',
      'Urban Governance and Management'
    ];
    return Array.from(new Set([...fromRecords, ...defaults])).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Close department dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDepartments = useMemo(() => {
    const query = quickDepartment.trim().toLowerCase();
    if (!query) return allDepartments;
    return allDepartments.filter((d) => d.toLowerCase().includes(query));
  }, [allDepartments, quickDepartment]);

  const isExactMatch = useMemo(() => {
    const query = quickDepartment.trim().toLowerCase();
    return allDepartments.some((d) => d.toLowerCase() === query);
  }, [allDepartments, quickDepartment]);

  // Live computed quick values
  const qm = quickMale.trim() === '' ? null : parseInt(quickMale, 10);
  const qf = quickFemale.trim() === '' ? null : parseInt(quickFemale, 10);
  const qmValid = qm !== null && !isNaN(qm) && qm >= 0;
  const qfValid = qf !== null && !isNaN(qf) && qf >= 0;
  const quickTotal = (qmValid ? qm! : 0) + (qfValid ? qf! : 0);
  const quickFemalePct = quickTotal > 0 && qfValid ? (qf! / quickTotal) * 100 : null;

  const inlineDefaultSourceCell = getDefaultSourceCell(quickYear, quickMode, quickCampus);

  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInlineError('');

    const targetDept = assignedDept || quickDepartment.trim();
    if (!targetDept) {
      setInlineError('Enter a Department name.');
      return;
    }

    if (!quickYear || isNaN(quickYear) || quickYear < 1900 || quickYear > 2100) {
      setInlineError('Enter a valid year (e.g. 2018).');
      return;
    }

    const maleVal = quickMale.trim() === '' ? null : parseInt(quickMale, 10);
    const femaleVal = quickFemale.trim() === '' ? null : parseInt(quickFemale, 10);

    if (maleVal !== null && (isNaN(maleVal) || maleVal < 0)) {
      setInlineError('Male entrants must be >= 0.');
      return;
    }
    if (femaleVal !== null && (isNaN(femaleVal) || femaleVal < 0)) {
      setInlineError('Female entrants must be >= 0.');
      return;
    }

    const tot = maleVal === null && femaleVal === null ? null : (maleVal || 0) + (femaleVal || 0);
    const finalSourceCell = quickSourceCell.trim() || inlineDefaultSourceCell;

    const newRecord: RawRecord = [
      quickYear,
      quickProgram,
      targetDept,
      quickMode,
      quickCampus.trim() ? quickCampus.trim() : null,
      maleVal,
      femaleVal,
      tot,
      finalSourceCell
    ];

    if (onSaveNewRecord) {
      onSaveNewRecord(newRecord);
    }

    // Reset quick fields
    if (!assignedDept) {
      setQuickDepartment('');
    }
    setQuickCampus('');
    setQuickMale('');
    setQuickFemale('');
    setQuickSourceCell('');
    setInlineError('');
  };

  // Filter records
  const filtered = useMemo(() => {
    const list = records.map((r, originalIndex) => ({ r, originalIndex }));

    const filteredList = list.filter(({ r }) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r[2].toLowerCase().includes(q) ||
        r[1].toLowerCase().includes(q) ||
        (r[4] && r[4].toLowerCase().includes(q));

      const matchYear = !yearFilter || String(r[0]) === yearFilter;
      const matchProg = !programFilter || r[1] === programFilter;
      const matchMode = !modeFilter || r[3] === modeFilter;

      return matchSearch && matchYear && matchProg && matchMode;
    });

    filteredList.sort((a, b) => {
      const itemA = a.r;
      const itemB = b.r;
      const valA = itemA[sortKey] ?? '';
      const valB = itemB[sortKey] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return filteredList;
  }, [records, search, yearFilter, programFilter, modeFilter, sortKey, sortAsc]);

  const handleSort = (idx: number) => {
    if (sortKey === idx) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(idx);
      setSortAsc(idx === 0 || idx === 1 || idx === 2);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Year',
      'Program Level',
      'Department',
      'Study Mode',
      'Campus',
      'Male',
      'Female',
      'Total',
      'Female %',
      'Source Reference'
    ];

    const rows = filtered.map(({ r }) => {
      const tot = (r[5] || 0) + (r[6] || 0);
      const femalePct = tot > 0 ? (((r[6] || 0) / tot) * 100).toFixed(1) + '%' : '';
      return [
        r[0],
        `"${r[1]}"`,
        `"${r[2]}"`,
        `"${r[3]}"`,
        r[4] ? `"${r[4]}"` : '',
        r[5] ?? '',
        r[6] ?? '',
        tot,
        femalePct,
        r[8] ? `"${r[8]}"` : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OSU_Student_Intake_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMale = filtered.reduce((acc, curr) => acc + (curr.r[5] || 0), 0);
  const totalFemale = filtered.reduce((acc, curr) => acc + (curr.r[6] || 0), 0);
  const grandTotal = totalMale + totalFemale;
  const overallFemalePct = grandTotal > 0 ? (totalFemale / grandTotal) * 100 : 0;

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    await exportReportToPDF('data-ledger-document', 'OSU_Data_Ledger.pdf');
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
    await exportReportToPDF('data-ledger-document', 'OSU_Data_Ledger.pdf');
    setIsExporting(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Utility toolbar */}
      <div className="bg-white dark:bg-[#16221F] border border-[#D5E0DC] dark:border-[#273B35] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
            Total Entries: <strong className="text-[#0F4C3A] dark:text-[#A9D3C2]">{records.length}</strong> · Filtered: <strong className="text-[#0F4C3A] dark:text-[#A9D3C2]">{filtered.length}</strong> records
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-[#0F4C3A] dark:text-[#A9D3C2] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download verified records registry as PDF"
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

      <article id="data-ledger-document" className="paper bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-xl shadow-lg border border-[#D5E0DC] dark:border-[#273B35] overflow-hidden">
        {/* Header */}
        <header className="bg-[#0F4C3A] text-white p-8 border-b-6 border-[#E0A526]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A9D3C2] font-semibold mb-1 flex items-center gap-2">
                <span>Oromia State University</span>
                <span>·</span>
                <span>Office of the Academic Registrar</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                Student Admissions & Enrollment Ledger
              </h1>
              <p className="text-xs sm:text-sm text-[#CFE6DC] mt-1 font-mono">
                Official 9-Column Format: Year · Program Level · Department · Mode · Campus · Male · Female · Total · Female %
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isDeptScoped && onMarkDataEntryComplete && (
                <button
                  onClick={onMarkDataEntryComplete}
                  className={`px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
                    currentUserAccount?.dataEntryCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                  title="Mark student admissions data entry for this department as completed"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {currentUserAccount?.dataEntryCompleted
                      ? '✓ Data Entry Completed'
                      : 'Mark All Data Entry Complete'}
                  </span>
                </button>
              )}

              <button
                onClick={onAddRecord}
                className="px-4 py-2.5 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] text-xs sm:text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isDeptScoped
                    ? `Add Student (${assignedDept})`
                    : 'Registrar: Add New Student'}
                </span>
              </button>
            </div>
        </div>
      </header>

      {/* Department Lead Scope Banner */}
      {isDeptScoped && (
        <div className="bg-[#EFF8F4] dark:bg-[#142922] border-b border-[#D0E2D9] dark:border-[#273B35] px-6 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#0F4C3A] dark:text-[#A9D3C2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              <strong>Department Admissions Lead:</strong> Authorized to add and edit student records exclusively for <strong>{assignedDept}</strong> ({currentUserAccount?.programLevelScope}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-white dark:bg-white/10 border border-[#C5D8CF] dark:border-white/10">
              Offer Status: {currentUserAccount?.departmentOfferStatus?.toUpperCase() || 'ASSIGNED'}
            </span>
            {currentUserAccount?.dataEntryCompleted && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                ✓ Entry Finalized
              </span>
            )}
          </div>
        </div>
      )}

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
                placeholder="Search department, campus, program..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              />
            </div>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="py-2 px-3 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            {/* Program Filter */}
            {isScoped ? (
              <div className="py-2 px-3 bg-[#EFF6F3] dark:bg-white/5 border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Scope: {scopedProgramLevel}</span>
              </div>
            ) : (
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="py-2 px-3 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              >
                <option value="">All Programs</option>
                {PROGRAM_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="py-2 px-3 bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
            >
              <option value="">All Study Modes</option>
              {STUDY_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
              title="Toggle inline quick add row on top of table"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showInlineRow ? 'Hide Quick Add' : 'Quick Add Row'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white dark:bg-white/5 border border-[#C5D8CF] dark:border-white/10 text-[#283C35] dark:text-[#A9D3C2] hover:bg-[#EFF5F2] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#5B6B70]" />
              <span>Export CSV</span>
            </button>

            {canEditOrDelete && (
              <button
                onClick={() => {
                  onResetData();
                }}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-[#C5D8CF] dark:border-white/10 text-[#283C35] dark:text-[#A9D3C2] hover:bg-[#EFF5F2] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset data to official baseline"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5B6B70]" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {!canEditOrDelete && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
            <Lock className="w-4 h-4 text-[#0F4C3A] dark:text-[#A9D3C2] shrink-0" />
            <span>
              <strong>Add-Only Data Policy:</strong> You are authorized to <strong>add new student admissions records</strong>. Modifying or deleting existing institutional data is restricted to Administrator.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
          <span>
            Displaying <strong className="text-[#17262B] dark:text-white">{filtered.length}</strong> of{' '}
            <strong className="text-[#17262B] dark:text-white">{records.length}</strong> verified entries
          </span>
          <span className="italic">
            Use the top inline row or the "Add New Data Record" button to append entries anytime.
          </span>
        </div>
      </div>

      {/* Inline Quick Add Notice Banner */}
      {showInlineRow && inlineError && (
        <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 text-red-800 dark:text-red-300 text-xs font-medium flex items-center justify-between">
          <span>{inlineError}</span>
          <button onClick={() => setInlineError('')} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Records Table */}
      <div className="overflow-x-auto p-4 sm:p-6">
        <table className="w-full text-xs sm:text-sm border-collapse text-left">
          <thead>
            <tr className="bg-[#1F7A5C] text-white">
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort(0)}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Year</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort(1)}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Program Level</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort(2)}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                <button
                  onClick={() => handleSort(3)}
                  className="flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer"
                >
                  <span>Mode</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Campus</th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                <button
                  onClick={() => handleSort(5)}
                  className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                >
                  <span>Male</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                <button
                  onClick={() => handleSort(6)}
                  className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                >
                  <span>Female</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                <button
                  onClick={() => handleSort(7)}
                  className="inline-flex items-center gap-1 hover:text-[#E0A526] transition-colors cursor-pointer justify-end"
                >
                  <span>Total</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Female %</th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Source Cell</th>
              <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">
                {canEditOrDelete ? 'Actions' : 'Policy'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3ECE7] dark:divide-[#273B35]">
            {/* INLINE QUICK ADD ROW */}
            {showInlineRow && (
              <tr className="bg-[#EFF8F4] dark:bg-[#142922] border-b-2 border-[#1F7A5C]">
                {/* Year */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={quickYear}
                    onChange={(e) => setQuickYear(parseInt(e.target.value, 10))}
                    className="w-16 px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-mono text-center"
                    placeholder="Year"
                  />
                </td>

                {/* Program Level */}
                <td className="p-1.5 min-w-[150px]">
                  {isScoped ? (
                    <div className="w-full px-2 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] truncate">
                      {scopedProgramLevel}
                    </div>
                  ) : (
                    <select
                      value={quickProgram}
                      onChange={(e) => setQuickProgram(e.target.value)}
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

                {/* Department (Lists all departments on click + allows adding new department) */}
                <td className="p-1.5 min-w-[210px] relative">
                  {isDeptScoped ? (
                    <div className="w-full px-2 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-bold text-[#0F4C3A] dark:text-[#A9D3C2] truncate">
                      {assignedDept}
                    </div>
                  ) : (
                    <div ref={deptDropdownRef} className="relative w-full">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          list="quick-dept-datalist"
                          value={quickDepartment}
                          onChange={(e) => {
                            setQuickDepartment(e.target.value);
                            setDeptDropdownOpen(true);
                          }}
                          onClick={() => setDeptDropdownOpen(true)}
                          onFocus={() => setDeptDropdownOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setDeptDropdownOpen(false);
                              handleQuickAdd();
                            } else if (e.key === 'Escape') {
                              setDeptDropdownOpen(false);
                            }
                          }}
                          placeholder="Click to list departments or type new..."
                          className="w-full pl-2 pr-7 py-1 text-xs border border-[#A2C4B7] dark:border-[#384E47] rounded bg-white dark:bg-[#101A17] font-medium text-[#162521] dark:text-[#E7EFEC] focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                          className="absolute right-1 text-[#6A8077] hover:text-[#0F4C3A] dark:hover:text-[#A9D3C2] p-1 cursor-pointer"
                          title="Show all departments list"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <datalist id="quick-dept-datalist">
                        {allDepartments.map((dept) => (
                          <option key={dept} value={dept} />
                        ))}
                      </datalist>

                      {/* Dropdown Menu Popover */}
                      {deptDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1 w-72 max-h-60 overflow-y-auto bg-white dark:bg-[#16221F] border border-[#BFCDC8] dark:border-[#384E47] rounded-lg shadow-2xl z-50 text-xs py-1 divide-y divide-gray-100 dark:divide-white/5 animate-in fade-in duration-100">
                          {/* Option to add custom department if typed name is not in list */}
                          {quickDepartment.trim() && !isExactMatch && (
                            <div
                              onMouseDown={() => {
                                setDeptDropdownOpen(false);
                              }}
                              className="p-2.5 bg-[#F2F8F5] dark:bg-emerald-950/40 text-[#0F4C3A] dark:text-[#A9D3C2] font-semibold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1.5 transition-colors border-b border-[#C5DDD2] dark:border-emerald-800/60"
                            >
                              <Plus className="w-4 h-4 text-[#E0A526] shrink-0" />
                              <span className="truncate">
                                Add new department: <strong>"{quickDepartment.trim()}"</strong>
                              </span>
                            </div>
                          )}

                          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 text-[10px] uppercase font-bold text-[#6A8077] dark:text-[#9DB0AA] flex items-center justify-between">
                            <span>University Departments ({allDepartments.length})</span>
                            <span className="text-[9px] font-normal lowercase">click to select</span>
                          </div>

                          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                            {filteredDepartments.length === 0 ? (
                              <div className="p-3 text-center text-[#6A8077] dark:text-[#9DB0AA]">
                                <p>No department matching "{quickDepartment.trim()}".</p>
                                <p className="mt-1 font-bold text-[#0F4C3A] dark:text-[#A9D3C2]">
                                  Press Enter or click Add to create this new department.
                                </p>
                              </div>
                            ) : (
                              filteredDepartments.map((dept) => {
                                const isSelected = quickDepartment.trim().toLowerCase() === dept.toLowerCase();
                                return (
                                  <button
                                    key={dept}
                                    type="button"
                                    onMouseDown={() => {
                                      setQuickDepartment(dept);
                                      setDeptDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-[#F2F8F5] dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#EBF5F0] dark:bg-emerald-950/50 font-bold text-[#0F4C3A] dark:text-[#A9D3C2]'
                                        : 'text-[#162521] dark:text-[#E7EFEC]'
                                    }`}
                                  >
                                    <span className="truncate">{dept}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#A9D3C2] shrink-0" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Mode */}
                <td className="p-1.5 min-w-[100px]">
                  <select
                    value={quickMode}
                    onChange={(e) => setQuickMode(e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17]"
                  >
                    {STUDY_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Campus */}
                <td className="p-1.5 min-w-[100px]">
                  <input
                    type="text"
                    value={quickCampus}
                    onChange={(e) => setQuickCampus(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                    }}
                    placeholder="Campus..."
                    className="w-full px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17]"
                  />
                </td>

                {/* Male */}
                <td className="p-1.5">
                  <input
                    type="number"
                    min="0"
                    value={quickMale}
                    onChange={(e) => setQuickMale(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                    }}
                    placeholder="M"
                    className="w-16 px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-mono text-right"
                  />
                </td>

                {/* Female */}
                <td className="p-1.5">
                  <input
                    type="number"
                    min="0"
                    value={quickFemale}
                    onChange={(e) => setQuickFemale(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                    }}
                    placeholder="F"
                    className="w-16 px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-mono text-right"
                  />
                </td>

                {/* Live Total (Auto) */}
                <td className="p-1.5 text-right font-bold text-[#0F4C3A] dark:text-[#E0A526] tabular-nums whitespace-nowrap">
                  {quickTotal > 0 ? quickTotal.toLocaleString() : '–'}
                </td>

                {/* Live Female % (Auto) */}
                <td className="p-1.5 text-right font-bold text-[#B8456B] tabular-nums whitespace-nowrap">
                  {quickFemalePct !== null ? formatPct(quickFemalePct) : '–'}
                </td>

                {/* Source Cell */}
                <td className="p-1.5">
                  <input
                    type="text"
                    value={quickSourceCell}
                    onChange={(e) => setQuickSourceCell(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                    }}
                    placeholder={inlineDefaultSourceCell}
                    title={`Default: ${inlineDefaultSourceCell} (auto-assigned if left blank)`}
                    className="w-24 px-1.5 py-1 text-xs border border-[#A2C4B7] rounded bg-white dark:bg-[#101A17] font-mono text-right"
                  />
                </td>

                {/* Actions: Add Button */}
                <td className="p-1.5 text-center">
                  <button
                    onClick={() => handleQuickAdd()}
                    className="px-3 py-1 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs mx-auto"
                    title="Add this row directly to data registry"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </td>
              </tr>
            )}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-sm text-[#5B6B70]">
                  No records match your filter criteria. Clear filters to see all rows.
                </td>
              </tr>
            ) : (
              filtered.map(({ r, originalIndex }) => {
                const tot = (r[5] || 0) + (r[6] || 0);
                const fPct = tot > 0 ? ((r[6] || 0) / tot) * 100 : null;

                return (
                  <tr key={`record-${originalIndex}`} className="hover:bg-[#F7FAF8] dark:hover:bg-white/5">
                    <td key="year" className="py-2 px-3 font-medium text-[#1A2E26] dark:text-[#E7EFEC] font-mono">{r[0]}</td>
                    <td key="prog" className="py-2 px-3 text-[#52665F] dark:text-[#A9D3C2]">{r[1]}</td>
                    <td key="dept" className="py-2 px-3 font-medium text-[#17262B] dark:text-white">{r[2]}</td>
                    <td key="mode" className="py-2 px-3 text-[#52665F] dark:text-[#A9D3C2]">{r[3]}</td>
                    <td key="camp" className="py-2 px-3 text-[#183127] dark:text-[#A9D3C2] font-medium">{r[4] || '–'}</td>
                    <td key="male" className="py-2 px-3 text-right tabular-nums text-[#33463F] dark:text-[#CFE6DC]">{formatNum(r[5])}</td>
                    <td key="fema" className="py-2 px-3 text-right tabular-nums text-[#33463F] dark:text-[#CFE6DC]">{formatNum(r[6])}</td>
                    <td key="tota" className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A] dark:text-[#E0A526]">
                      {tot > 0 ? formatNum(tot) : '–'}
                    </td>
                    <td key="fpct" className="py-2 px-3 text-right tabular-nums text-[#8D4258] dark:text-[#E88EA8] font-medium">
                      {formatPct(fPct)}
                    </td>
                    <td key="src" className="py-2 px-3 text-right font-mono text-xs text-[#6A8077] dark:text-[#8E9F99]">
                      {r[8] || '–'}
                    </td>
                    <td key="actn" className="py-2 px-3 text-center">
                      {canEditOrDelete ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditRecord(r, originalIndex)}
                            className="text-[#1F7A5C] dark:text-[#A9D3C2] hover:text-[#0F4C3A] hover:underline font-medium p-1 cursor-pointer"
                            title="Edit record"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(r, originalIndex)}
                            className="text-red-600 hover:text-red-800 hover:underline hover:bg-red-50 hover:border-red-200 border border-transparent font-medium p-1 cursor-pointer rounded"
                            title="Delete record"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B6B70] dark:text-[#9DB0AA] bg-[#EFF5F2] dark:bg-white/5 px-2 py-0.5 rounded-full"
                          title="Users can only add new records. Modifying or deleting existing entries is reserved for Administrator."
                        >
                          <Lock className="w-2.5 h-2.5 text-[#0F4C3A] dark:text-[#A9D3C2]" />
                          <span>Add Only</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="bg-[#EFF5F2] dark:bg-[#101A17] font-bold border-t-2 border-[#0F4C3A]">
              <td className="py-2.5 px-3 text-[#0F4C3A] dark:text-[#E0A526]" colSpan={5}>
                Total ({filtered.length} matching rows)
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(totalMale)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(totalFemale)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A] dark:text-[#E0A526]">{formatNum(grandTotal)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#8D4258] dark:text-[#E88EA8]">{formatPct(overallFemalePct)}</td>
              <td className="py-2.5 px-3" colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </div>
);
};
