import React, { useState, useEffect } from 'react';
import { RawRecord } from '../types';
import { PROGRAM_LEVELS, STUDY_MODES, formatPct, getDefaultSourceCell } from '../data/analytics';
import { X, Check, Plus, Calculator, Building2, GraduationCap, Users } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RawRecord | null;
  index: number | null;
  onSave: (record: RawRecord, index: number | null, andAddAnother?: boolean) => void;
  defaultProgramLevel?: string;
  assignedDepartment?: string;
  existingDepartments?: string[];
}

const COMMON_CAMPUSES = [
  'Main Campus',
  'Adama',
  'Batu',
  'Bishoftu',
  'Burayu',
  'Lega Tafo',
  'Meki',
  'Sebeta',
  'Shashamane',
  'Sululta'
];

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  record,
  index,
  onSave,
  defaultProgramLevel,
  assignedDepartment,
  existingDepartments = []
}) => {
  const [year, setYear] = useState<number>(2018);
  const [program, setProgram] = useState<string>(PROGRAM_LEVELS[0]);
  const [customProgram, setCustomProgram] = useState<string>('');
  const [isCustomProgram, setIsCustomProgram] = useState<boolean>(false);

  const [department, setDepartment] = useState<string>('');
  const [mode, setMode] = useState<string>(STUDY_MODES[0]);
  const [customMode, setCustomMode] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [campus, setCampus] = useState<string>('');
  const [male, setMale] = useState<string>('');
  const [female, setFemale] = useState<string>('');
  const [error, setError] = useState<string>('');

  const activeMode = isCustomMode ? customMode.trim() : mode;

  useEffect(() => {
    if (record) {
      setYear(record[0]);
      if ((PROGRAM_LEVELS as readonly string[]).includes(record[1])) {
        setProgram(record[1]);
        setIsCustomProgram(false);
        setCustomProgram('');
      } else {
        setIsCustomProgram(true);
        setCustomProgram(record[1]);
      }

      setDepartment(record[2]);

      if ((STUDY_MODES as readonly string[]).includes(record[3])) {
        setMode(record[3]);
        setIsCustomMode(false);
        setCustomMode('');
      } else {
        setIsCustomMode(true);
        setCustomMode(record[3]);
      }

      setCampus(record[4] || '');
      setMale(record[5] !== null && record[5] !== undefined ? String(record[5]) : '');
      setFemale(record[6] !== null && record[6] !== undefined ? String(record[6]) : '');
    } else {
      // Adding a new student record
      const defYear = 2018;
      const defProgram =
        defaultProgramLevel && (PROGRAM_LEVELS as readonly string[]).includes(defaultProgramLevel)
          ? defaultProgramLevel
          : PROGRAM_LEVELS[0];
      const defMode = STUDY_MODES[0];

      setYear(defYear);
      setProgram(defProgram);
      setIsCustomProgram(false);
      setCustomProgram('');
      setDepartment(
        assignedDepartment && assignedDepartment !== 'ALL' ? assignedDepartment : ''
      );
      setMode(defMode);
      setIsCustomMode(false);
      setCustomMode('');
      setCampus('');
      setMale('');
      setFemale('');
    }
    setError('');
  }, [record, isOpen, defaultProgramLevel, assignedDepartment]);

  if (!isOpen) return null;

  // Live calculations for Total and Female %
  const parsedMale = male.trim() === '' ? null : parseInt(male, 10);
  const parsedFemale = female.trim() === '' ? null : parseInt(female, 10);
  const validMale = parsedMale !== null && !isNaN(parsedMale) && parsedMale >= 0;
  const validFemale = parsedFemale !== null && !isNaN(parsedFemale) && parsedFemale >= 0;

  const liveTotal =
    validMale || validFemale ? (validMale ? parsedMale! : 0) + (validFemale ? parsedFemale! : 0) : null;

  const liveFemalePct =
    liveTotal !== null && liveTotal > 0 && validFemale
      ? (parsedFemale! / liveTotal) * 100
      : null;

  const handleSubmit = (e: React.FormEvent, andAddAnother = false) => {
    e.preventDefault();
    const finalDept =
      assignedDepartment && assignedDepartment !== 'ALL'
        ? assignedDepartment.trim()
        : department.trim();

    if (!finalDept) {
      setError('Please provide a Department / Discipline name.');
      return;
    }
    if (!year || isNaN(year) || year < 1900 || year > 2100) {
      setError('Please enter a valid academic year (e.g. 2018).');
      return;
    }

    const mVal = male.trim() === '' ? null : parseInt(male, 10);
    const fVal = female.trim() === '' ? null : parseInt(female, 10);

    if (mVal !== null && (isNaN(mVal) || mVal < 0)) {
      setError('Male students must be 0 or a positive whole number.');
      return;
    }
    if (fVal !== null && (isNaN(fVal) || fVal < 0)) {
      setError('Female students must be 0 or a positive whole number.');
      return;
    }

    const finalProgram = isCustomProgram ? customProgram.trim() : program;
    if (!finalProgram) {
      setError('Please select or enter a Program Level.');
      return;
    }

    const finalMode = isCustomMode ? customMode.trim() : mode;
    if (!finalMode) {
      setError('Please select or enter a Study Mode.');
      return;
    }

    const tot = mVal === null && fVal === null ? null : (mVal || 0) + (fVal || 0);

    // Auto-compute workbook source cell in the background
    const cleanCampus = campus.trim() && campus.trim().toLowerCase() !== 'main campus' ? campus.trim() : null;
    const finalSourceCell = record && record[8] ? record[8] : getDefaultSourceCell(year, finalMode, cleanCampus);

    const updated: RawRecord = [
      year,
      finalProgram,
      finalDept,
      finalMode,
      cleanCampus,
      mVal,
      fVal,
      tot,
      finalSourceCell
    ];

    onSave(updated, index, andAddAnother);

    if (andAddAnother) {
      if (!assignedDepartment || assignedDepartment === 'ALL') {
        setDepartment('');
      }
      setCampus('');
      setMale('');
      setFemale('');
      setError('');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#D5E2DC] dark:border-[#2C413A] my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header: Registrar Office */}
        <div className="flex items-center justify-between border-b border-[#E3ECE7] dark:border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-6 h-6 text-[#E0A526]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#A9D3C2] rounded">
                  Office of the Academic Registrar
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] mt-0.5">
                {record ? 'Edit Student Admission Record' : 'Enroll New Students'}
              </h2>
              <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
                Official institutional intake entry: updates university reports, department totals, and ledger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5B6B70] hover:text-[#183127] dark:hover:text-white hover:bg-[#F2F7F4] dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 text-xs sm:text-sm">
          {/* Row 1: 1. Year & 2. Program Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                1. Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                required
                min="1900"
                max="2100"
                placeholder="e.g. 2018"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                  2. Program Level <span className="text-red-500">*</span>
                </label>
                {!defaultProgramLevel && (
                  <button
                    type="button"
                    onClick={() => setIsCustomProgram(!isCustomProgram)}
                    className="text-[11px] text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                  >
                    {isCustomProgram ? 'Select standard' : 'Custom level'}
                  </button>
                )}
              </div>

              {defaultProgramLevel ? (
                <div className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-[#EFF6F3] dark:bg-white/5 text-[#0F4C3A] dark:text-[#A9D3C2] rounded-lg font-medium text-sm flex items-center justify-between">
                  <span>{defaultProgramLevel}</span>
                  <span className="text-[10px] uppercase font-bold bg-[#0F4C3A]/10 dark:bg-white/10 px-2 py-0.5 rounded text-[#0F4C3A] dark:text-[#E0A526]">
                    Locked to Assigned Scope
                  </span>
                </div>
              ) : isCustomProgram ? (
                <input
                  type="text"
                  value={customProgram}
                  onChange={(e) => setCustomProgram(e.target.value)}
                  placeholder="e.g. Specialty Diploma, Post-Doctoral"
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                  required
                />
              ) : (
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                >
                  {PROGRAM_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 2: 3. Department */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                3. Department / Discipline <span className="text-red-500">*</span>
              </label>
              {assignedDepartment && assignedDepartment !== 'ALL' && (
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Assigned Lead
                </span>
              )}
            </div>

            {assignedDepartment && assignedDepartment !== 'ALL' ? (
              <div className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-[#EFF6F3] dark:bg-white/5 text-[#0F4C3A] dark:text-[#A9D3C2] rounded-lg font-bold text-sm flex items-center justify-between">
                <span>{assignedDepartment}</span>
                <span className="text-[10px] uppercase font-bold bg-[#0F4C3A]/10 dark:bg-white/10 px-2 py-0.5 rounded text-[#0F4C3A] dark:text-[#E0A526]">
                  Locked to Assigned Department
                </span>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  list="existing-departments-list"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Accounting, Law, Computer Science, Economics, MBA"
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                  required
                />
                {existingDepartments.length > 0 && (
                  <datalist id="existing-departments-list">
                    {Array.from(new Set(existingDepartments)).map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                )}
              </>
            )}
          </div>

          {/* Row 3: 4. Mode & 5. Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                  4. Study Mode <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className="text-[11px] text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                >
                  {isCustomMode ? 'Select standard' : 'Custom mode'}
                </button>
              </div>

              {isCustomMode ? (
                <input
                  type="text"
                  value={customMode}
                  onChange={(e) => setCustomMode(e.target.value)}
                  placeholder="e.g. Distance, Online"
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                  required
                />
              ) : (
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                >
                  {STUDY_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                5. Campus <span className="text-[#6D857C] font-normal">(Leave blank for Main)</span>
              </label>
              <input
                type="text"
                list="common-campuses-list"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="e.g. Batu, Sebeta, Adama"
                className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
              />
              <datalist id="common-campuses-list">
                {COMMON_CAMPUSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 4: 6. Male, 7. Female + 8. Total, 9. Female % */}
          <div className="p-4 bg-[#F2F7F4] dark:bg-white/5 rounded-xl border border-[#D5E2DC] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C3A] dark:text-[#A9D3C2]">
                <Users className="w-4 h-4 text-[#E0A526]" />
                <span>6 & 7. Student Intake (Numbers)</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                <Calculator className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#E0A526]" />
                <span>Total & Female % Auto-Calculated</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  6. Male Students
                </label>
                <input
                  type="number"
                  min="0"
                  value={male}
                  onChange={(e) => setMale(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  7. Female Students
                </label>
                <input
                  type="number"
                  min="0"
                  value={female}
                  onChange={(e) => setFemale(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                />
              </div>
            </div>

            {/* Calculated Preview: 8. Total & 9. Female % */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#D9E6E0] dark:border-white/10">
              <div className="p-2.5 bg-white dark:bg-[#101A17] rounded-lg border border-[#D0E0D8] dark:border-white/10">
                <span className="block text-[11px] font-medium text-[#5B6B70] dark:text-[#9DB0AA]">
                  8. Total Students (Auto-Calculated)
                </span>
                <span className="text-xl font-bold font-serif text-[#0F4C3A] dark:text-[#E0A526] tabular-nums">
                  {liveTotal !== null ? liveTotal.toLocaleString() : '–'}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#101A17] rounded-lg border border-[#D0E0D8] dark:border-white/10">
                <span className="block text-[11px] font-medium text-[#5B6B70] dark:text-[#9DB0AA]">
                  9. Female % (Auto-Calculated)
                </span>
                <span className="text-xl font-bold font-serif text-[#B8456B] tabular-nums">
                  {liveFemalePct !== null ? formatPct(liveFemalePct) : '–'}
                </span>
              </div>
            </div>
          </div>

          {/* Official 9-Column Table Live Preview */}
          <div className="overflow-x-auto border border-[#D5E2DC] dark:border-[#324840] rounded-lg bg-[#FAFDFB] dark:bg-[#101A17]">
            <div className="px-3 py-1.5 bg-[#1F7A5C] text-white text-[11px] font-semibold flex items-center justify-between">
              <span>Registrar Admission Record Preview (9 Required Columns)</span>
              <span className="opacity-80">Official Form Format</span>
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#EFF5F2] dark:bg-white/5 border-b border-[#D5E2DC] dark:border-white/10 text-[#324840] dark:text-[#CFE6DC] text-[11px]">
                  <th className="py-1.5 px-2 font-semibold">Year</th>
                  <th className="py-1.5 px-2 font-semibold">Program Level</th>
                  <th className="py-1.5 px-2 font-semibold">Department</th>
                  <th className="py-1.5 px-2 font-semibold">Mode</th>
                  <th className="py-1.5 px-2 font-semibold">Campus</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Male</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Female</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Total</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Female %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-mono text-xs text-[#162521] dark:text-[#E7EFEC]">
                  <td className="py-2 px-2 font-medium">{year || '–'}</td>
                  <td className="py-2 px-2 text-[11px] font-sans truncate max-w-[120px]">
                    {isCustomProgram ? customProgram || '–' : program}
                  </td>
                  <td className="py-2 px-2 font-sans font-medium text-[#0F4C3A] dark:text-[#A9D3C2] truncate max-w-[120px]">
                    {department || <span className="italic text-gray-400">Required</span>}
                  </td>
                  <td className="py-2 px-2 text-[11px] font-sans">
                    {isCustomMode ? customMode || '–' : mode}
                  </td>
                  <td className="py-2 px-2 text-[11px] font-sans">
                    {campus || <span className="text-gray-400">Main</span>}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-[#324840] dark:text-[#CFE6DC]">
                    {validMale ? parsedMale : 0}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-[#324840] dark:text-[#CFE6DC]">
                    {validFemale ? parsedFemale : 0}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-[#0F4C3A] dark:text-[#E0A526]">
                    {liveTotal !== null ? liveTotal : 0}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-[#B8456B]">
                    {liveFemalePct !== null ? formatPct(liveFemalePct) : '0.0%'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3ECE7] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C5D8CF] dark:border-[#354C45] text-[#283C35] dark:text-[#CFE6DC] rounded-lg hover:bg-[#F2F7F4] dark:hover:bg-white/5 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {!record && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 border border-[#0F4C3A] text-[#0F4C3A] dark:text-[#A9D3C2] dark:border-[#A9D3C2] hover:bg-[#EFF6F3] dark:hover:bg-white/5 rounded-lg font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Enroll & Add Another
                </button>
              )}

              <button
                type="submit"
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer text-xs sm:text-sm"
              >
                <Check className="w-4 h-4" />
                <span>{record ? 'Update Admission Record' : 'Enroll Student Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
