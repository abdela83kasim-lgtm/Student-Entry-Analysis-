import React, { useState } from 'react';
import { ReportDocument, UserAccount, parseProgramLevelScopes } from '../types';
import {
  AnalyticsResult,
  formatNum,
  formatPct,
  resolveDynamicReportTitle
} from '../data/analytics';
import { YearlyStackedChart, GenderShareChart } from './Charts';
import { Plus, Trash2, Edit3, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ReportPaperProps {
  report: ReportDocument;
  analytics: AnalyticsResult;
  currentUserAccount?: UserAccount;
  isEditing: boolean;
  onUpdateReport: (updates: Partial<ReportDocument>) => void;
  onAddFinding: () => void;
  onDeleteFinding: (idx: number) => void;
  onAddNote: () => void;
  onDeleteNote: (idx: number) => void;
  onOpenDataLedger: () => void;
}

export const ReportPaper: React.FC<ReportPaperProps> = ({
  report,
  analytics,
  currentUserAccount,
  isEditing,
  onUpdateReport,
  onAddFinding,
  onDeleteFinding,
  onAddNote,
  onDeleteNote,
  onOpenDataLedger
}) => {
  const years = analytics.years;
  const firstYear = years[0] ?? 2014;
  const latestYear = analytics.latestYear ?? years[years.length - 1] ?? 2018;
  const latestIdx = Math.max(0, years.length - 1);
  const prevYear = years[Math.max(0, latestIdx - 1)] ?? latestYear;
  const displayTitle = resolveDynamicReportTitle(report.name, years);
  const [selectedGenderYear, setSelectedGenderYear] = useState<number | 'ALL'>('ALL');
  const activeGenderYear: number | 'ALL' =
    selectedGenderYear !== 'ALL' && years.includes(selectedGenderYear) ? selectedGenderYear : 'ALL';

  const isSectionActive = (id: string) => {
    const sec = report.sections.find((s) => s.id === id);
    return sec ? sec.enabled : false;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateReport({ name: e.target.value });
  };

  const handlePreparedByChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateReport({ preparedBy: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateReport({ date: e.target.value });
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateReport({ customSummary: e.target.value });
  };

  const handleFindingChange = (idx: number, text: string) => {
    const list = [...(report.customFindings || [])];
    list[idx] = text;
    onUpdateReport({ customFindings: list });
  };

  const handleNoteChange = (idx: number, text: string) => {
    const list = [...(report.customNotes || [])];
    list[idx] = text;
    onUpdateReport({ customNotes: list });
  };

  return (
    <article
      id="osu-report-paper"
      className={`report-sheet bg-white text-[#17262B] max-w-4xl mx-auto rounded-none sm:rounded-xl shadow-lg border border-[#D5E0DC] overflow-hidden transition-all print:border-none print:shadow-none print:max-w-none ${
        isEditing ? 'ring-2 ring-[#E0A526] ring-offset-4 ring-offset-[#EAEFEA]' : ''
      }`}
      aria-label="Institutional Report Paper"
    >
      {/* Official Institutional Document Header */}
      <header className="report-letterhead bg-[#0F4C3A] text-white p-8 sm:p-12 border-b-6 border-[#E0A526] page-break-avoid">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png"
              alt="Oromia State University Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-sm bg-white/10 rounded-xl p-1 border border-white/20"
            />
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A9D3C2] font-semibold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#E0A526]" />
                <span>{report.institution || 'Oromia State University'}</span>
              </div>
              <span className="text-[11px] text-[#CFE6DC] tracking-wide block mt-0.5">
                Official Institutional Admissions & Statistical Report
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/10 px-2.5 py-1 rounded text-[#E2EFE9] font-medium border border-white/15">
              Status: {report.status}
            </span>
          </div>
        </div>

        {isEditing ? (
          <input
            type="text"
            value={displayTitle}
            onChange={handleTitleChange}
            className="w-full text-2xl sm:text-4xl font-serif font-bold text-white bg-black/20 border border-white/30 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E0A526] mb-3"
            placeholder="Report Document Title"
          />
        ) : (
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight mb-3">
            {displayTitle}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-[#CFE6DC]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#96C4B2]">Prepared by:</span>
            {isEditing ? (
              <input
                type="text"
                value={report.preparedBy}
                onChange={handlePreparedByChange}
                className="bg-black/20 text-white border border-white/30 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-[#E0A526]"
              />
            ) : (
              <span className="font-medium text-white">{report.preparedBy}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#96C4B2]">Publication Date:</span>
            {isEditing ? (
              <input
                type="text"
                value={report.date}
                onChange={handleDateChange}
                className="bg-black/20 text-white border border-white/30 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-[#E0A526]"
              />
            ) : (
              <span className="font-medium text-white">{report.date}</span>
            )}
          </div>
        </div>
      </header>

      {/* Program-Level Data Isolation Banner */}
      {currentUserAccount && parseProgramLevelScopes(currentUserAccount.programLevelScope).length > 0 && (
        <div className="bg-[#EFF6F3] border-b border-[#D0E2D9] px-6 sm:px-12 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#0F4C3A] page-break-avoid">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F7A5C] animate-pulse shrink-0" />
            <span>
              <strong>Program-Level Data Isolation Active:</strong> Displaying student metrics, faculty departments, and enrollment trends exclusively for <u>{currentUserAccount.programLevelScope}</u>.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-white border border-[#D0E2D9] font-semibold text-[11px] text-[#0F4C3A]">
            User: {currentUserAccount.name} ({currentUserAccount.roleTitle})
          </span>
        </div>
      )}

      <div className="p-6 sm:p-12 space-y-12">
        {/* Section 1: Key Performance Indicators */}
        {isSectionActive('kpi') && (
          <section className="page-break-avoid">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#5B6B70] mb-4">
              Institutional Highlights & Metric Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-5 bg-[#F4F8F6] rounded-xl border border-[#D5E2DC]">
              <div className="p-2 border-l-3 border-[#E0A526] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#0F4C3A] tabular-nums">
                  {formatNum(analytics.totalAllYears)}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  Total Entrants ({firstYear}–{latestYear})
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#0F4C3A] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#0F4C3A] tabular-nums">
                  {formatNum(analytics.totalByYear[latestIdx])}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  Entrants in {latestYear}
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#2F7F9E] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#2F7F9E] tabular-nums">
                  {formatPct(analytics.totalGrowth2018, true)}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  {latestYear} vs {prevYear} (All Programs)
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#1F7A5C] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#1F7A5C] tabular-nums">
                  {formatPct(analytics.likeForLikeGrowth2018, true)}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  Like-for-like Growth (Excl. Diploma &amp; Education)
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#B8456B] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#B8456B] tabular-nums">
                  {formatPct(analytics.femaleShareByYear[latestIdx])}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  {latestYear} Overall Female Share
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#B8456B] pl-3">
                <span className="block text-2xl font-serif font-bold text-[#6D857C] tabular-nums">
                  {formatPct(analytics.femaleShareByYear[0])}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  {firstYear} Baseline Female Share
                </span>
              </div>

              <div className="p-2 border-l-3 border-[#A05C7B] pl-3 col-span-2 md:col-span-1 lg:col-span-2">
                <span className="block text-2xl font-serif font-bold text-[#8B3B5B] tabular-nums">
                  {formatPct(analytics.femaleShare2018ExDiploma)}
                </span>
                <span className="text-xs text-[#5B6B70] block mt-0.5">
                  {latestYear} Degree Female Share (Excl. Summer Teacher Diploma/Cert)
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Executive Summary */}
        {isSectionActive('summary') && (
          <section className="page-break-avoid">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A] mb-3">
              Executive Summary
            </h2>
            {isEditing ? (
              <textarea
                value={report.customSummary || ''}
                onChange={handleSummaryChange}
                rows={5}
                className="w-full p-3 border border-[#BFCDC8] rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                placeholder="Write or edit executive summary narrative..."
              />
            ) : (
              <div className="text-sm leading-relaxed text-[#283832] space-y-3 font-normal max-w-prose">
                <p>
                  {report.customSummary && !report.customSummary.includes('enrolled 3,864 new entrants')
                    ? report.customSummary
                    : `Oromia State University enrolled ${formatNum(
                        analytics.totalAllYears
                      )} new entrants across ${analytics.departments.length} academic departments between ${years[0]} and ${analytics.latestYear}. Annual intake stands at ${formatNum(
                        analytics.totalByYear[analytics.totalByYear.length - 1]
                      )} entrants in ${analytics.latestYear}. Overall female student representation is ${formatPct(
                        analytics.overallFemaleShare
                      )} across all study modes and academic levels.`}
                </p>
                <p>
                  Over 60% of recent intake reflects the strategic introduction of Summer Diploma and Certificate programmes ({formatNum(analytics.levelBreakdown[2].counts[analytics.levelBreakdown[2].counts.length - 1])} entrants) and Education degrees ({formatNum(analytics.levelBreakdown[1].counts[analytics.levelBreakdown[1].counts.length - 1])}). Normalized like-for-like intake stands at {formatNum(analytics.likeForLikeTotalByYear[analytics.likeForLikeTotalByYear.length - 1])} entrants.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Section 3: Yearly Entrants Trend & Visual Chart */}
        {isSectionActive('yearTrend') && (
          <section className="page-break-avoid">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A] mb-2">
              Entrants by Year & Growth Trajectory
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6B70] mb-4">
              Historical multi-year enrollment progression categorized by student gender.
            </p>

            <YearlyStackedChart analytics={analytics} />

            {/* Standard Yearly Table */}
            <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg shadow-2xs mt-4">
              <table className="w-full text-xs sm:text-sm border-collapse text-left">
                <thead>
                  <tr className="bg-[#1F7A5C] text-white">
                    <th className="py-2.5 px-3 font-semibold">Entry Year</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Male</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Female</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Female %</th>
                    <th className="py-2.5 px-3 font-semibold text-right">YoY Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3ECE7]">
                  {years.map((yr, idx) => {
                    const total = analytics.totalByYear[idx];
                    const male = analytics.maleByYear[idx];
                    const female = analytics.femaleByYear[idx];
                    const femalePct = analytics.femaleShareByYear[idx];
                    const yoy =
                      idx > 0 && analytics.totalByYear[idx - 1] > 0
                        ? ((total - analytics.totalByYear[idx - 1]) /
                            analytics.totalByYear[idx - 1]) *
                          100
                        : null;

                    return (
                      <tr key={yr} className="hover:bg-[#F7FAF8]">
                        <td className="py-2 px-3 font-medium text-[#1A2E26]">{yr}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#33463F]">{formatNum(male)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#33463F]">{formatNum(female)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">{formatNum(total)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#6E4053] font-medium">{formatPct(femalePct)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium text-[#2E6B56]">{formatPct(yoy, true)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A]">
                    <td className="py-2.5 px-3 text-[#0F4C3A]">All Years Total</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(analytics.totalMaleAllYears)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(analytics.totalFemaleAllYears)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A]">{formatNum(analytics.totalAllYears)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatPct(analytics.overallFemaleShare)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-[#5B6B70]">–</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Like-for-Like Table */}
            <div className="mt-6">
              <h3 className="text-sm font-serif font-bold text-[#1C362C] mb-1">
                Like-for-Like Normalized Analysis
              </h3>
              <p className="text-xs text-[#5B6B70] mb-3">
                Excludes Summer Teacher Diploma, Certificate, and BED Education tracks to allow normalized longitudinal comparisons.
              </p>
              <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
                <table className="w-full text-xs sm:text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-[#2B6050] text-white">
                      <th className="py-2 px-3 font-semibold">Entry Year</th>
                      <th className="py-2 px-3 font-semibold text-right">Total (All Programs)</th>
                      <th className="py-2 px-3 font-semibold text-right">Diploma &amp; Education Additions</th>
                      <th className="py-2 px-3 font-semibold text-right">Total (Like-for-Like)</th>
                      <th className="py-2 px-3 font-semibold text-right">Normalized YoY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3ECE7]">
                    {years.map((yr, idx) => {
                      const total = analytics.totalByYear[idx];
                      const excluded = analytics.excludedCategoriesByYear[idx];
                      const lfl = analytics.likeForLikeTotalByYear[idx];
                      const lflPrev = idx > 0 ? analytics.likeForLikeTotalByYear[idx - 1] : null;
                      const yoy = lflPrev && lflPrev > 0 ? ((lfl - lflPrev) / lflPrev) * 100 : null;

                      return (
                        <tr key={yr} className="hover:bg-[#F7FAF8]">
                          <td className="py-2 px-3 font-medium text-[#1A2E26]">{yr}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatNum(total)}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-[#8D4258]">{formatNum(excluded)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">{formatNum(lfl)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-[#2E6B56]">{formatPct(yoy, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Program Level & Study Mode Breakdown */}
        {isSectionActive('levelMode') && (
          <section className="page-break-avoid">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A] mb-2">
              Program Level & Study Mode Distribution
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6B70] mb-4">
              Breakdown of total student admissions across credential tiers and delivery methods.
            </p>

            {/* Program Level Table */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#1F4C3B] mb-2">
                1. Admissions by Program Credential Level
              </h3>
              <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
                <table className="w-full text-xs sm:text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-[#1F7A5C] text-white">
                      <th className="py-2 px-3 font-semibold">Program Level</th>
                      {years.map((y) => (
                        <th key={y} className="py-2 px-3 font-semibold text-right">{y}</th>
                      ))}
                      <th className="py-2 px-3 font-semibold text-right">All Years</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3ECE7]">
                    {analytics.levelBreakdown.map((row) => (
                      <tr key={row.level} className="hover:bg-[#F7FAF8]">
                        <td className="py-2 px-3 font-medium text-[#1A2E26]">{row.level}</td>
                        {row.counts.map((val, i) => (
                          <td key={years[i]} className="py-2 px-3 text-right tabular-nums text-[#33463F]">
                            {formatNum(val)}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A]">
                      <td className="py-2 px-3 text-[#0F4C3A]">Total Entrants</td>
                      {years.map((_, i) => (
                        <td key={years[i]} className="py-2 px-3 text-right tabular-nums">
                          {formatNum(analytics.totalByYear[i])}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right tabular-nums text-[#0F4C3A]">
                        {formatNum(analytics.totalAllYears)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Study Mode Table */}
            <div>
              <h3 className="text-sm font-semibold text-[#1F4C3B] mb-2">
                2. Admissions by Instructional Delivery Mode
              </h3>
              <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
                <table className="w-full text-xs sm:text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-[#1F7A5C] text-white">
                      <th className="py-2 px-3 font-semibold">Study Mode</th>
                      {years.map((y) => (
                        <th key={y} className="py-2 px-3 font-semibold text-right">{y}</th>
                      ))}
                      <th className="py-2 px-3 font-semibold text-right">All Years</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3ECE7]">
                    {analytics.modeBreakdown.map((row) => (
                      <tr key={row.mode} className="hover:bg-[#F7FAF8]">
                        <td className="py-2 px-3 font-medium text-[#1A2E26]">{row.mode}</td>
                        {row.counts.map((val, i) => (
                          <td key={years[i]} className="py-2 px-3 text-right tabular-nums text-[#33463F]">
                            {formatNum(val)}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A]">
                      <td className="py-2 px-3 text-[#0F4C3A]">Total Entrants</td>
                      {years.map((_, i) => (
                        <td key={years[i]} className="py-2 px-3 text-right tabular-nums">
                          {formatNum(analytics.totalByYear[i])}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right tabular-nums text-[#0F4C3A]">
                        {formatNum(analytics.totalAllYears)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Gender Equity & Demographics */}
        {isSectionActive('gender') && (() => {
          const selectedYearData =
            activeGenderYear !== 'ALL'
              ? analytics.genderByLevelByYear.find((entry) => entry.year === activeGenderYear) || null
              : null;

          const activeGenderRows = selectedYearData
            ? selectedYearData.levels.map((l) => ({
                level: l.level,
                male: l.male,
                female: l.female,
                total: l.total,
                femalePct: l.femalePct,
                share: l.shareOfYear
              }))
            : analytics.genderByLevelAllYears.map((l) => ({
                level: l.level,
                male: l.male,
                female: l.female,
                total: l.total,
                femalePct: l.femalePct,
                share: l.shareOfAllYears
              }));

          const activeSummaryTotals = selectedYearData
            ? {
                label: String(selectedYearData.year),
                male: selectedYearData.maleTotal,
                female: selectedYearData.femaleTotal,
                total: selectedYearData.total,
                femalePct: selectedYearData.femalePct
              }
            : {
                label: `All Years (${firstYear}–${latestYear})`,
                male: analytics.totalMaleAllYears,
                female: analytics.totalFemaleAllYears,
                total: analytics.totalAllYears,
                femalePct: analytics.overallFemaleShare
              };

          return (
            <section className="page-break-avoid">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A]">
                    Gender Equity & Participation Analysis
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5B6B70] mt-1">
                    Institutional gender parity metrics across all academic years ({firstYear}–{latestYear}): Female % = Female ÷ (Male + Female).
                  </p>
                </div>

                {/* Dynamic Year Filter Chips (Automatically adds new years) */}
                <div className="flex flex-wrap items-center gap-1.5 no-print">
                  <button
                    type="button"
                    onClick={() => setSelectedGenderYear('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      activeGenderYear === 'ALL'
                        ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                        : 'bg-white text-[#0F4C3A] border-[#C5D8CF] hover:bg-[#EFF5F2]'
                    }`}
                  >
                    All Years ({firstYear}–{latestYear})
                  </button>
                  {years.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedGenderYear(yr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                        activeGenderYear === yr
                          ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                          : 'bg-white text-[#0F4C3A] border-[#C5D8CF] hover:bg-[#EFF5F2]'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <GenderShareChart analytics={analytics} selectedYear={activeGenderYear} />

              <div className="space-y-6 mt-4">
                {/* Summary Gender Breakdown by Program Level (All Years by default, or Selected Year) */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1F4C3B] mb-2">
                    {activeSummaryTotals.label} Entrants Gender Breakdown by Program Level
                  </h3>
                  <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
                    <table className="w-full text-xs sm:text-sm border-collapse text-left">
                      <thead>
                        <tr className="bg-[#1F7A5C] text-white">
                          <th className="py-2 px-3 font-semibold">Program Level</th>
                          <th className="py-2 px-3 font-semibold text-right">Male</th>
                          <th className="py-2 px-3 font-semibold text-right">Female</th>
                          <th className="py-2 px-3 font-semibold text-right">Total</th>
                          <th className="py-2 px-3 font-semibold text-right">Female %</th>
                          <th className="py-2 px-3 font-semibold text-right">
                            {selectedYearData ? `Share of ${selectedYearData.year}` : 'Share of All Years'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3ECE7]">
                        {activeGenderRows.map((row) => (
                          <tr key={row.level} className="hover:bg-[#F7FAF8]">
                            <td className="py-2 px-3 font-medium text-[#1A2E26]">{row.level}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#33463F]">{formatNum(row.male)}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#33463F]">{formatNum(row.female)}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">{formatNum(row.total)}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#8D4258] font-bold">{formatPct(row.femalePct)}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#5B6B70]">{formatPct(row.share)}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A]">
                          <td className="py-2 px-3 text-[#0F4C3A]">Total ({activeSummaryTotals.label})</td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatNum(activeSummaryTotals.male)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatNum(activeSummaryTotals.female)}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-[#0F4C3A]">{formatNum(activeSummaryTotals.total)}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-[#8D4258] font-bold">{formatPct(activeSummaryTotals.femalePct)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">100.0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Year-by-Year Entrants Gender Breakdown by Program Level (All Academic Years) */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1F4C3B] mb-1">
                    Year-by-Year Entrants Gender Breakdown by Program Level ({firstYear}–{latestYear})
                  </h3>
                  <p className="text-xs text-[#5B6B70] mb-2">
                    Complete Male, Female, Total, and Female % breakdown for every academic year — any newly added year appears automatically.
                  </p>
                  <div className="report-scroll-table overflow-x-auto border border-[#D5E2DC] rounded-lg max-h-[460px] print:max-h-none print:overflow-visible">
                    <table className="w-full text-xs sm:text-sm border-collapse text-left">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#1F7A5C] text-white">
                          <th className="py-2 px-3 font-semibold">Year</th>
                          <th className="py-2 px-3 font-semibold">Program Level</th>
                          <th className="py-2 px-3 font-semibold text-right">Male</th>
                          <th className="py-2 px-3 font-semibold text-right">Female</th>
                          <th className="py-2 px-3 font-semibold text-right">Total</th>
                          <th className="py-2 px-3 font-semibold text-right">Female %</th>
                          <th className="py-2 px-3 font-semibold text-right">Share of Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3ECE7]">
                        {analytics.genderByLevelByYear.map((yrGroup) => {
                          const visibleLevels = yrGroup.levels.filter((l) => l.total > 0);
                          return (
                            <React.Fragment key={yrGroup.year}>
                              {visibleLevels.length === 0 ? (
                                <tr className="hover:bg-[#F7FAF8]">
                                  <td className="py-2 px-3 font-mono font-bold text-[#0F4C3A]">{yrGroup.year}</td>
                                  <td className="py-2 px-3 italic text-[#6A8077]" colSpan={6}>
                                    No approved entrants recorded for {yrGroup.year}
                                  </td>
                                </tr>
                              ) : (
                                visibleLevels.map((lvlRow, idx) => (
                                  <tr key={`${yrGroup.year}-${lvlRow.level}`} className="hover:bg-[#F7FAF8]">
                                    <td className="py-1.5 px-3 font-mono font-semibold text-[#1A2E26]">
                                      {idx === 0 ? yrGroup.year : ''}
                                    </td>
                                    <td className="py-1.5 px-3 text-[#283832]">{lvlRow.level}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums text-[#33463F]">{formatNum(lvlRow.male)}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums text-[#33463F]">{formatNum(lvlRow.female)}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#0F4C3A]">{formatNum(lvlRow.total)}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums text-[#8D4258] font-semibold">{formatPct(lvlRow.femalePct)}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums text-[#5B6B70]">{formatPct(lvlRow.shareOfYear)}</td>
                                  </tr>
                                ))
                              )}
                              <tr className="bg-[#F4F8F6] font-semibold border-b border-[#C5D8CF]">
                                <td className="py-1.5 px-3 font-mono text-[#0F4C3A]">{yrGroup.year}</td>
                                <td className="py-1.5 px-3 text-[#0F4C3A]">{yrGroup.year} Subtotal</td>
                                <td className="py-1.5 px-3 text-right tabular-nums">{formatNum(yrGroup.maleTotal)}</td>
                                <td className="py-1.5 px-3 text-right tabular-nums">{formatNum(yrGroup.femaleTotal)}</td>
                                <td className="py-1.5 px-3 text-right tabular-nums text-[#0F4C3A]">{formatNum(yrGroup.total)}</td>
                                <td className="py-1.5 px-3 text-right tabular-nums text-[#8D4258]">{formatPct(yrGroup.femalePct)}</td>
                                <td className="py-1.5 px-3 text-right tabular-nums">100.0%</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                        <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A] sticky bottom-0">
                          <td className="py-2.5 px-3 text-[#0F4C3A]" colSpan={2}>
                            All Years Grand Total ({firstYear}–{latestYear})
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(analytics.totalMaleAllYears)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(analytics.totalFemaleAllYears)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A]">{formatNum(analytics.totalAllYears)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[#8D4258] font-bold">{formatPct(analytics.overallFemaleShare)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">100.0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#1F4C3B] mb-2">
                    Multi-Year Female Representation Trend by Program Level
                  </h3>
                  <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
                    <table className="w-full text-xs sm:text-sm border-collapse text-left">
                      <thead>
                        <tr className="bg-[#2B6050] text-white">
                          <th className="py-2 px-3 font-semibold">Program Level</th>
                          {years.map((y) => (
                            <th key={y} className="py-2 px-3 font-semibold text-right">{y}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3ECE7]">
                        {analytics.genderTrendByLevel.map((row) => (
                          <tr key={row.level} className="hover:bg-[#F7FAF8]">
                            <td className="py-2 px-3 font-medium text-[#1A2E26]">{row.level}</td>
                            {row.femalePctByYear.map((val, idx) => (
                              <td key={years[idx]} className="py-2 px-3 text-right tabular-nums text-[#8D4258]">
                                {formatPct(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-[#EFF5F2] font-bold border-t border-[#0F4C3A]">
                          <td className="py-2 px-3 text-[#0F4C3A]">All University Programs</td>
                          {analytics.femaleShareByYear.map((val, idx) => (
                            <td key={years[idx]} className="py-2 px-3 text-right tabular-nums text-[#8D4258] font-bold">
                              {formatPct(val)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Section 6: Department List Ledger */}
        {isSectionActive('departments') && (
          <section className="page-break-avoid">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A]">
                Department & Academic Program Intake Ledger
              </h2>
              <button
                onClick={onOpenDataLedger}
                className="text-xs text-[#0F4C3A] hover:underline font-semibold no-print"
              >
                Open Full Department Tool →
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6B70] mb-4">
              All {analytics.departments.length} department programs calculated directly from validated registrar records.
            </p>

            <div className="report-scroll-table overflow-x-auto border border-[#D5E2DC] rounded-lg max-h-[500px] print:max-h-none print:overflow-visible">
              <table className="w-full text-xs sm:text-sm border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1F7A5C] text-white">
                    <th className="py-2 px-3 font-semibold">Department / Discipline</th>
                    <th className="py-2 px-3 font-semibold">Program Level</th>
                    {years.map((y) => (
                      <th key={y} className="py-2 px-3 font-semibold text-right">{y}</th>
                    ))}
                    <th className="py-2 px-3 font-semibold text-right">All Years</th>
                    <th className="py-2 px-3 font-semibold text-right">{analytics.latestYear} Female %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3ECE7]">
                  {analytics.departments.map((d, i) => (
                    <tr key={`${d.department}-${d.program}-${i}`} className="hover:bg-[#F7FAF8]">
                      <td className="py-2 px-3 font-medium text-[#1A2E26]">{d.department}</td>
                      <td className="py-2 px-3 text-[#52665F]">{d.program}</td>
                      {d.years.map((val, yIdx) => (
                        <td key={years[yIdx]} className="py-2 px-3 text-right tabular-nums text-[#33463F]">
                          {formatNum(val)}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#0F4C3A]">
                        {formatNum(d.total)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#8D4258]">
                        {formatPct(d.femaleShare2018)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A] sticky bottom-0">
                    <td className="py-2.5 px-3 text-[#0F4C3A]" colSpan={2}>
                      Grand Total ({analytics.departments.length} Programs)
                    </td>
                    {analytics.deptTotalYears.map((tot, idx) => (
                      <td key={years[idx] ?? idx} className="py-2.5 px-3 text-right tabular-nums">
                        {formatNum(tot)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A]">
                      {formatNum(analytics.deptGrandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#8D4258]">
                      {formatPct(analytics.deptWeightedFemalePct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 7: Weekend Campuses Breakdown */}
        {isSectionActive('campuses') && (
          <section className="page-break-avoid">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A] mb-2">
              Weekend Satellite Campuses
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6B70] mb-4">
              Regional satellite branch intake across Oromia State centers (Weekend mode only).
            </p>

            <div className="overflow-x-auto border border-[#D5E2DC] rounded-lg">
              <table className="w-full text-xs sm:text-sm border-collapse text-left">
                <thead>
                  <tr className="bg-[#1F7A5C] text-white">
                    <th className="py-2.5 px-3 font-semibold">Satellite Campus</th>
                    {years.map((y) => (
                      <th key={y} className="py-2.5 px-3 font-semibold text-right">{y}</th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold text-right">All Years</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Female % (Cumulative)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3ECE7]">
                  {analytics.campuses.map((c) => {
                    const cumFemalePct =
                      c.total > 0
                        ? (c.femaleTotal / (c.maleTotal + c.femaleTotal)) * 100
                        : 0;

                    return (
                      <tr key={c.campus} className="hover:bg-[#F7FAF8]">
                        <td className="py-2 px-3 font-semibold text-[#183127]">{c.campus}</td>
                        {c.years.map((val, idx) => {
                          const intensity = val > 0 ? Math.min(1, val / 110) : 0;
                          return (
                            <td key={years[idx] ?? idx} className="py-2 px-3 text-right tabular-nums">
                              {val > 0 ? (
                                <span
                                  className="inline-block px-2 py-0.5 rounded text-[#0F4C3A] font-semibold"
                                  style={{
                                    backgroundColor: `rgba(31, 122, 92, ${0.08 + intensity * 0.45})`
                                  }}
                                >
                                  {val}
                                </span>
                              ) : (
                                <span className="text-[#9DB0AA]">–</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-[#0F4C3A]">
                          {formatNum(c.total)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#8D4258]">
                          {formatPct(cumFemalePct)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#EFF5F2] font-bold border-t-2 border-[#0F4C3A]">
                    <td className="py-2.5 px-3 text-[#0F4C3A]">Weekend Total</td>
                    {analytics.campusTotalYears.map((tot, idx) => (
                      <td key={years[idx] ?? idx} className="py-2.5 px-3 text-right tabular-nums">
                        {formatNum(tot)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#0F4C3A]">
                      {formatNum(analytics.campusGrandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#8D4258]">
                      {formatPct(analytics.campusFemalePctTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-xs text-[#5B6B70]">
              Audit Verification:{' '}
              {analytics.campusWeekendReconciliationOk ? (
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Campus total precisely matches the Weekend study mode ledger total ({formatNum(analytics.campusGrandTotal)}).
                </span>
              ) : (
                <span className="text-amber-700 font-medium">Reconciliation variance detected.</span>
              )}
            </p>
          </section>
        )}

        {/* Section 8: Main Findings & Strategic Insights */}
        {isSectionActive('findings') && (
          <section className="page-break-avoid">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C3A]">
                Key Findings & Strategic Observations
              </h2>
              {isEditing && (
                <button
                  onClick={onAddFinding}
                  className="px-3 py-1 bg-[#0F4C3A] text-white rounded text-xs font-semibold flex items-center gap-1 hover:bg-[#1A5C49]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Finding</span>
                </button>
              )}
            </div>

            <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed text-[#263832]">
              {(report.customFindings || []).map((finding, idx) => (
                <li key={idx} className="group">
                  {isEditing ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={finding}
                        onChange={(e) => handleFindingChange(idx, e.target.value)}
                        rows={2}
                        className="flex-1 p-2 border border-[#BFCDC8] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#E0A526]"
                      />
                      <button
                        onClick={() => onDeleteFinding(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                        title="Delete finding"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span>{finding}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Section 9: Notes on Data & Methodology */}
        {isSectionActive('notes') && (
          <section className="page-break-avoid pt-4 border-t border-[#D5E2DC]">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-lg font-serif font-bold text-[#0F4C3A]">
                Notes on Methodology & Institutional Data
              </h2>
              {isEditing && (
                <button
                  onClick={onAddNote}
                  className="px-2.5 py-1 bg-[#EFF5F2] text-[#0F4C3A] border border-[#C5D8CF] rounded text-xs font-semibold flex items-center gap-1 hover:bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              )}
            </div>

            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#5B6B70] leading-relaxed">
              {(report.customNotes || []).map((note, idx) => (
                <li key={idx}>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        className="flex-1 p-1.5 border border-[#BFCDC8] rounded text-xs"
                      />
                      <button
                        onClick={() => onDeleteNote(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span>{note}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Institutional Sign-off Block for Print / Senate */}
        <div className="pt-8 border-t-2 border-[#D5E2DC] page-break-avoid">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-[#5B6B70]">
            <div>
              <p className="font-semibold text-[#183127] uppercase tracking-wider mb-8">
                Prepared By:
              </p>
              <div className="border-t border-[#8FA89E] pt-1">
                <p className="font-medium text-[#183127]">{report.preparedBy}</p>
                <p>Oromia State University</p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-[#183127] uppercase tracking-wider mb-8">
                Reviewed & Verified:
              </p>
              <div className="border-t border-[#8FA89E] pt-1">
                <p className="font-medium text-[#183127]">Office of Academic Registrar</p>
                <p>Oromia State University</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold text-[#183127] uppercase tracking-wider mb-8">
                Executive Endorsement:
              </p>
              <div className="border-t border-[#8FA89E] pt-1">
                <p className="font-medium text-[#183127]">Vice President, Academic Affairs</p>
                <p>Authorized Publication</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Footer */}
      <footer className="bg-[#FAFDFB] border-t border-[#D5E2DC] px-8 py-4 text-xs text-[#6B8077] flex items-center justify-center gap-2.5">
        <img
          src="/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png"
          alt="Oromia State University Logo"
          className="w-5 h-5 object-contain shrink-0"
        />
        <span>© Oromia State University | Copyright by Abdela Kasim</span>
      </footer>
    </article>
  );
};
