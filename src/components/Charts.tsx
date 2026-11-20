import React from 'react';
import { formatNum, formatPct, AnalyticsResult } from '../data/analytics';

interface StackedChartProps {
  analytics: AnalyticsResult;
}

export const YearlyStackedChart: React.FC<StackedChartProps> = ({ analytics }) => {
  const { years, maleByYear, femaleByYear, totalByYear } = analytics;
  const maxVal = Math.max(500, Math.ceil(Math.max(...totalByYear, 1000) / 500) * 500);

  const width = 640;
  const height = 260;
  const paddingLeft = 52;
  const paddingBottom = 34;
  const paddingTop = 22;
  const paddingRight = 16;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const step = plotWidth / Math.max(1, years.length);
  const barWidth = Math.min(64, Math.max(20, Math.floor(step * 0.58)));
  const firstYear = years[0] ?? 2014;
  const latestYear = analytics.latestYear ?? years[years.length - 1] ?? 2018;

  const gridSteps = 5;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => Math.round((maxVal / gridSteps) * i));

  return (
    <div className="w-full my-6 page-break-avoid">
      <div className="bg-[#FAFDFB] border border-[#D5E2DC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs text-[#52665F]">
          <span className="font-semibold text-[#0F4C3A]">
            Figure 1: Student Intake Trajectory by Gender ({firstYear}–{latestYear})
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-xs bg-[#2F7F9E]" />
              <span className="font-medium text-[#1E332D]">Male Students</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-xs bg-[#B8456B]" />
              <span className="font-medium text-[#1E332D]">Female Students</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[300px] select-none"
            role="img"
            aria-label="New entrants per year split by male and female students"
          >
            {/* Gridlines & Y-Axis values */}
            {gridValues.map((val) => {
              const y = paddingTop + plotHeight * (1 - val / maxVal);
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    x2={width - paddingRight}
                    y1={y}
                    y2={y}
                    stroke="#E2EBE7"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    fill="#6A8077"
                    fontSize="11"
                    fontFamily="Public Sans, sans-serif"
                    textAnchor="end"
                    className="tabular-nums font-mono"
                  >
                    {formatNum(val)}
                  </text>
                </g>
              );
            })}

            {/* Bars for each year */}
            {years.map((year, i) => {
              const total = totalByYear[i];
              const male = maleByYear[i];
              const female = femaleByYear[i];
              const x = paddingLeft + step * i + (step - barWidth) / 2;

              const maleHeight = (male / maxVal) * plotHeight;
              const femaleHeight = (female / maxVal) * plotHeight;
              const yBase = paddingTop + plotHeight;
              const yMale = yBase - maleHeight;
              const yFemale = yMale - femaleHeight;

              return (
                <g key={year} className="group cursor-default">
                  {/* Male Rect */}
                  <rect
                    x={x}
                    y={yMale}
                    width={barWidth}
                    height={Math.max(maleHeight, 0)}
                    fill="#2F7F9E"
                    rx="1"
                    className="transition-opacity hover:opacity-90"
                  >
                    <title>{`${year} Male: ${formatNum(male)} (${formatPct((male / (total || 1)) * 100)})`}</title>
                  </rect>

                  {/* Female Rect */}
                  <rect
                    x={x}
                    y={yFemale}
                    width={barWidth}
                    height={Math.max(femaleHeight, 0)}
                    fill="#B8456B"
                    rx="1"
                    className="transition-opacity hover:opacity-90"
                  >
                    <title>{`${year} Female: ${formatNum(female)} (${formatPct((female / (total || 1)) * 100)})`}</title>
                  </rect>

                  {/* Total Value on Top */}
                  <text
                    x={x + barWidth / 2}
                    y={yFemale - 7}
                    fill="#0F4C3A"
                    fontSize="12.5"
                    fontWeight="700"
                    textAnchor="middle"
                    className="tabular-nums"
                  >
                    {formatNum(total)}
                  </text>

                  {/* Year Label */}
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    fill="#20332D"
                    fontSize="13"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="mt-2 text-xs text-[#6A8077] italic text-center">
          Note: All academic years ({firstYear}–{latestYear}) dynamically reflect verified records across all programs and campuses.
        </p>
      </div>
    </div>
  );
};

interface GenderShareChartProps {
  analytics: AnalyticsResult;
  selectedYear?: number | 'ALL';
}

export const GenderShareChart: React.FC<GenderShareChartProps> = ({ analytics, selectedYear = 'ALL' }) => {
  const { years, latestYear, genderByLevelAllYears, genderByLevelByYear } = analytics;
  const firstYear = years[0] ?? 2014;

  const yearEntry =
    selectedYear !== 'ALL'
      ? genderByLevelByYear.find((entry) => entry.year === selectedYear)
      : null;

  const items = yearEntry ? yearEntry.levels : genderByLevelAllYears;
  const periodLabel = yearEntry ? String(yearEntry.year) : `All Years (${firstYear}–${latestYear})`;

  const nonZeroItems = items.filter((item) => item.total > 0);
  const highestItem = nonZeroItems.length > 0
    ? [...nonZeroItems].sort((a, b) => b.femalePct - a.femalePct)[0]
    : null;
  const lowestItem = nonZeroItems.length > 0
    ? [...nonZeroItems].sort((a, b) => a.femalePct - b.femalePct)[0]
    : null;

  const rowHeight = 40;
  const labelWidth = 190;
  const totalWidth = 640;
  const barAreaWidth = totalWidth - labelWidth - 80;
  const height = items.length * rowHeight + 20;

  return (
    <div className="w-full my-6 page-break-avoid">
      <div className="bg-[#FAFDFB] border border-[#D5E2DC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 text-xs text-[#52665F]">
          <span className="font-semibold text-[#0F4C3A]">
            Figure 2: {periodLabel} Female Student Representation by Program Level
          </span>
          <span className="text-xs text-[#6A8077] font-medium">Target Parity: 50.0%</span>
        </div>

        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="w-full h-auto max-h-[280px] select-none"
          role="img"
          aria-label={`Female share of ${periodLabel} entrants by program level`}
        >
          {/* 50% benchmark reference line */}
          <line
            x1={labelWidth + barAreaWidth * 0.5}
            x2={labelWidth + barAreaWidth * 0.5}
            y1={8}
            y2={height - 10}
            stroke="#C4D6CD"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {items.map((item, idx) => {
            const y = idx * rowHeight + 10;
            const pct = item.femalePct / 100;
            const barWidth = Math.max(0, barAreaWidth * pct);

            return (
              <g key={item.level} className="group">
                {/* Level Title */}
                <text
                  x={labelWidth - 14}
                  y={y + 16}
                  fill="#1C2E28"
                  fontSize="12.5"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {item.level}
                </text>

                {/* Track background */}
                <rect
                  x={labelWidth}
                  y={y + 2}
                  width={barAreaWidth}
                  height={18}
                  fill="#E6EFEA"
                  rx="3"
                />

                {/* Fill bar */}
                <rect
                  x={labelWidth}
                  y={y + 2}
                  width={barWidth}
                  height={18}
                  fill="#B8456B"
                  rx="3"
                >
                  <title>{`${item.level} (${periodLabel}): ${formatNum(item.female)} females of ${formatNum(item.total)} total (${formatPct(item.femalePct)})`}</title>
                </rect>

                {/* Percentage label */}
                <text
                  x={labelWidth + barWidth + 8}
                  y={y + 15}
                  fill="#8F254B"
                  fontSize="12"
                  fontWeight="700"
                  className="tabular-nums"
                >
                  {formatPct(item.femalePct)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-[#6A8077] pt-2 border-t border-[#E1ECE7]">
          <span>Dashed line denotes 50% gender parity mark</span>
          {highestItem && lowestItem ? (
            <span>
              Highest: {highestItem.level} ({formatPct(highestItem.femalePct)}) · Lowest: {lowestItem.level} ({formatPct(lowestItem.femalePct)})
            </span>
          ) : (
            <span>No student records in selected period</span>
          )}
        </div>
      </div>
    </div>
  );
};
