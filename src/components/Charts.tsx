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

  const barWidth = 64;
  const step = plotWidth / years.length;

  const gridSteps = 5;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => Math.round((maxVal / gridSteps) * i));

  return (
    <div className="w-full my-6 page-break-avoid">
      <div className="bg-[#FAFDFB] border border-[#D5E2DC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs text-[#52665F]">
          <span className="font-semibold text-[#0F4C3A]">Figure 1: Student Intake Trajectory by Gender (2014–2018)</span>
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
          Note: Significant acceleration in 2018 corresponds to the institutional inauguration of Summer Diploma/Certificate programs (1,484) and Education BED tracks (409).
        </p>
      </div>
    </div>
  );
};

interface GenderShareChartProps {
  analytics: AnalyticsResult;
}

export const GenderShareChart: React.FC<GenderShareChartProps> = ({ analytics }) => {
  const { genderByLevel2018 } = analytics;
  const rowHeight = 40;
  const labelWidth = 190;
  const totalWidth = 640;
  const barAreaWidth = totalWidth - labelWidth - 80;
  const height = genderByLevel2018.length * rowHeight + 20;

  return (
    <div className="w-full my-6 page-break-avoid">
      <div className="bg-[#FAFDFB] border border-[#D5E2DC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 text-xs text-[#52665F]">
          <span className="font-semibold text-[#0F4C3A]">Figure 2: 2018 Female Student Representation by Program Level</span>
          <span className="text-xs text-[#6A8077] font-medium">Target Parity: 50.0%</span>
        </div>

        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="w-full h-auto max-h-[280px] select-none"
          role="img"
          aria-label="Female share of 2018 entrants by program level"
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

          {genderByLevel2018.map((item, idx) => {
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
                  <title>{`${item.level}: ${item.female} females of ${item.total} total (${formatPct(item.femalePct)})`}</title>
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

        <div className="flex items-center justify-between mt-3 text-xs text-[#6A8077] pt-2 border-t border-[#E1ECE7]">
          <span>Dashed line denotes 50% gender parity mark</span>
          <span>Highest: Diploma & Certificate (78.0%) · Doctoral (4.5%)</span>
        </div>
      </div>
    </div>
  );
};
