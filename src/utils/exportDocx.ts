import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import { ReportDocument } from '../types';
import { AnalyticsResult, formatNum, formatPct, formatYearSpan, resolveDynamicReportTitle } from '../data/analytics';

export const OSU_LOGO_PATH = '/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png';

const BRAND_GREEN = '0F4C3A';
const ACCENT_GREEN = '1F7A5C';
const SUB_GREEN = '2B6050';
const GOLD_ACCENT = 'E0A526';
const LIGHT_BG = 'F4F8F6';
const TOTAL_BG = 'EFF5F2';
const BORDER_COLOR = 'D5E2DC';
const TEXT_DARK = '17262B';
const TEXT_MUTED = '5B6B70';

async function loadLogoBuffer(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(OSU_LOGO_PATH);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.warn('Could not load OSU logo image for DOCX export:', err);
    return null;
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sectionHeading(title: string, subtitle?: string): Paragraph[] {
  const items: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: subtitle ? 80 : 140 },
      border: {
        bottom: { color: GOLD_ACCENT, size: 8, style: BorderStyle.SINGLE }
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 28,
          color: BRAND_GREEN,
          font: 'Georgia'
        })
      ]
    })
  ];

  if (subtitle) {
    items.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: subtitle,
            size: 19,
            color: TEXT_MUTED,
            italics: true,
            font: 'Calibri'
          })
        ]
      })
    );
  }
  return items;
}

function subHeading(title: string, subtitle?: string): Paragraph[] {
  const items: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: subtitle ? 60 : 100 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 22,
          color: BRAND_GREEN,
          font: 'Calibri'
        })
      ]
    })
  ];
  if (subtitle) {
    items.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: subtitle,
            size: 18,
            color: TEXT_MUTED,
            font: 'Calibri'
          })
        ]
      })
    );
  }
  return items;
}

function makeStyledTable(
  headers: string[],
  rows: (string | number)[][],
  options?: {
    rightAlignFromCol?: number;
    headerColor?: string;
    hasTotalRow?: boolean;
  }
): Table {
  const rightFrom = options?.rightAlignFromCol ?? 1;
  const headerBg = options?.headerColor ?? ACCENT_GREEN;
  const hasTotal = options?.hasTotalRow ?? false;

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, colIdx) =>
        new TableCell({
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 100, bottom: 100, left: 110, right: 110 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: headerBg },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD_ACCENT },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          children: [
            new Paragraph({
              alignment: colIdx >= rightFrom ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                  font: 'Calibri'
                })
              ]
            })
          ]
        })
    )
  });

  const bodyRows = rows.map((row, rowIdx) => {
    const isTotal = hasTotal && rowIdx === rows.length - 1;
    const bg = isTotal ? TOTAL_BG : rowIdx % 2 === 1 ? 'FAFDFB' : 'FFFFFF';

    return new TableRow({
      children: row.map(
        (cellVal, colIdx) =>
          new TableCell({
            shading: { fill: bg, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 110, right: 110 },
            borders: {
              top: isTotal
                ? { style: BorderStyle.SINGLE, size: 12, color: BRAND_GREEN }
                : { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            children: [
              new Paragraph({
                alignment: colIdx >= rightFrom ? AlignmentType.RIGHT : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: String(cellVal),
                    bold: isTotal || colIdx === 0,
                    size: 18,
                    color: isTotal ? BRAND_GREEN : TEXT_DARK,
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
      )
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows]
  });
}

function buildLetterheadBanner(
  logoData: Uint8Array | null,
  institution: string,
  title: string,
  subtitleLine1: string,
  subtitleLine2: string
): Table {
  const logoCellChildren: Paragraph[] = [];
  if (logoData) {
    logoCellChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: 'png',
            data: logoData,
            transformation: { width: 72, height: 72 }
          })
        ]
      })
    );
  } else {
    logoCellChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'OSU',
            bold: true,
            size: 32,
            color: GOLD_ACCENT,
            font: 'Georgia'
          })
        ]
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 180, bottom: 180, left: 160, right: 120 },
            borders: {
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD_ACCENT }
            },
            children: logoCellChildren
          }),
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 180, bottom: 180, left: 140, right: 200 },
            borders: {
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD_ACCENT }
            },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `${institution.toUpperCase()}  ·  OFFICIAL REPORT`,
                    bold: true,
                    size: 18,
                    color: GOLD_ACCENT,
                    font: 'Calibri'
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 36,
                    color: 'FFFFFF',
                    font: 'Georgia'
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: subtitleLine1,
                    size: 19,
                    color: 'CFE6DC',
                    font: 'Calibri'
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: subtitleLine2,
                    size: 18,
                    color: 'A9D3C2',
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

export async function exportReportToDOCX(
  report: ReportDocument,
  analytics: AnalyticsResult,
  fileName?: string
): Promise<boolean> {
  try {
    const logoData = await loadLogoBuffer();
    const years = analytics.years;
    const firstYear = years[0] ?? 2014;
    const resolvedReportName = resolveDynamicReportTitle(report.name, years);
    const isSectionActive = (id: string) => {
      const sec = report.sections.find((s) => s.id === id);
      return sec ? sec.enabled : false;
    };

    const children: (Paragraph | Table)[] = [];

    // 1. Official Institutional Letterhead with Embedded Logo
    children.push(
      buildLetterheadBanner(
        logoData,
        report.institution || 'Oromia State University',
        resolvedReportName || 'OSU Active Student Report',
        `Prepared by: ${report.preparedBy}   |   Publication Date: ${report.date}`,
        `Document Status: ${report.status}   |   Academic Window: ${years[0]}–${analytics.latestYear}`
      )
    );

    // 2. KPI Highlights Section
    if (isSectionActive('kpi')) {
      children.push(...sectionHeading('Institutional Highlights & Metric Summary'));

      const latestIdx = years.length - 1;
      const kpiItems = [
        { label: `Total Entrants (${years[0]}–${analytics.latestYear})`, value: formatNum(analytics.totalAllYears) },
        { label: `Entrants in ${analytics.latestYear}`, value: formatNum(analytics.totalByYear[latestIdx]) },
        { label: `${analytics.latestYear} vs ${years[Math.max(0, latestIdx - 1)]} Growth`, value: formatPct(analytics.totalGrowth2018, true) },
        { label: 'Like-for-Like Growth', value: formatPct(analytics.likeForLikeGrowth2018, true) },
        { label: `${analytics.latestYear} Overall Female Share`, value: formatPct(analytics.femaleShareByYear[latestIdx]) },
        { label: `${years[0]} Baseline Female Share`, value: formatPct(analytics.femaleShareByYear[0]) },
        { label: `${analytics.latestYear} Degree Female Share (Excl. Diploma)`, value: formatPct(analytics.femaleShare2018ExDiploma) },
        { label: 'Academic Departments Covered', value: formatNum(analytics.departments.length) }
      ];

      const kpiRows: TableRow[] = [];
      for (let i = 0; i < kpiItems.length; i += 2) {
        const pair = [kpiItems[i], kpiItems[i + 1]];
        kpiRows.push(
          new TableRow({
            children: pair.map((item) =>
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
                margins: { top: 110, bottom: 110, left: 140, right: 140 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                  left: { style: BorderStyle.SINGLE, size: 18, color: GOLD_ACCENT },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR }
                },
                children: [
                  new Paragraph({
                    spacing: { after: 30 },
                    children: [
                      new TextRun({
                        text: item.value,
                        bold: true,
                        size: 28,
                        color: BRAND_GREEN,
                        font: 'Georgia'
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: item.label,
                        size: 18,
                        color: TEXT_MUTED,
                        font: 'Calibri'
                      })
                    ]
                  })
                ]
              })
            )
          })
        );
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: kpiRows
        })
      );
    }

    // 3. Executive Summary
    if (isSectionActive('summary')) {
      children.push(...sectionHeading('Executive Summary'));
      const defaultSummary1 = `Oromia State University enrolled ${formatNum(
        analytics.totalAllYears
      )} new entrants across ${analytics.departments.length} academic departments between ${years[0]} and ${analytics.latestYear}. Annual intake stands at ${formatNum(
        analytics.totalByYear[analytics.totalByYear.length - 1]
      )} entrants in ${analytics.latestYear}. Overall female student representation is ${formatPct(
        analytics.overallFemaleShare
      )} across all study modes and academic levels.`;

      const summaryText =
        report.customSummary && !report.customSummary.includes('enrolled 3,864 new entrants')
          ? report.customSummary
          : defaultSummary1;

      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: summaryText,
              size: 21,
              color: TEXT_DARK,
              font: 'Calibri'
            })
          ]
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: `Over 60% of recent intake reflects the strategic introduction of Summer Diploma and Certificate programmes (${formatNum(
                analytics.levelBreakdown[2].counts[analytics.levelBreakdown[2].counts.length - 1]
              )} entrants) and Education degrees (${formatNum(
                analytics.levelBreakdown[1].counts[analytics.levelBreakdown[1].counts.length - 1]
              )}). Normalized like-for-like intake stands at ${formatNum(
                analytics.likeForLikeTotalByYear[analytics.likeForLikeTotalByYear.length - 1]
              )} entrants.`,
              size: 21,
              color: TEXT_DARK,
              font: 'Calibri'
            })
          ]
        })
      );
    }

    // 4. Yearly Entrants Trend
    if (isSectionActive('yearTrend')) {
      children.push(
        ...sectionHeading(
          'Entrants by Year & Growth Trajectory',
          'Historical multi-year enrollment progression categorized by student gender.'
        )
      );

      const yearRows: (string | number)[][] = years.map((yr, idx) => {
        const total = analytics.totalByYear[idx];
        const male = analytics.maleByYear[idx];
        const female = analytics.femaleByYear[idx];
        const femalePct = analytics.femaleShareByYear[idx];
        const yoy =
          idx > 0 && analytics.totalByYear[idx - 1] > 0
            ? ((total - analytics.totalByYear[idx - 1]) / analytics.totalByYear[idx - 1]) * 100
            : null;
        return [yr, formatNum(male), formatNum(female), formatNum(total), formatPct(femalePct), formatPct(yoy, true)];
      });
      yearRows.push([
        'All Years Total',
        formatNum(analytics.totalMaleAllYears),
        formatNum(analytics.totalFemaleAllYears),
        formatNum(analytics.totalAllYears),
        formatPct(analytics.overallFemaleShare),
        '–'
      ]);

      children.push(
        makeStyledTable(['Entry Year', 'Male', 'Female', 'Total', 'Female %', 'YoY Change'], yearRows, {
          rightAlignFromCol: 1,
          hasTotalRow: true
        })
      );

      children.push(
        ...subHeading(
          'Like-for-Like Normalized Analysis',
          'Excludes Summer Teacher Diploma, Certificate, and BED Education tracks to allow normalized longitudinal comparisons.'
        )
      );

      const lflRows: (string | number)[][] = years.map((yr, idx) => {
        const total = analytics.totalByYear[idx];
        const excluded = analytics.excludedCategoriesByYear[idx];
        const lfl = analytics.likeForLikeTotalByYear[idx];
        const lflPrev = idx > 0 ? analytics.likeForLikeTotalByYear[idx - 1] : null;
        const yoy = lflPrev && lflPrev > 0 ? ((lfl - lflPrev) / lflPrev) * 100 : null;
        return [yr, formatNum(total), formatNum(excluded), formatNum(lfl), formatPct(yoy, true)];
      });

      children.push(
        makeStyledTable(
          ['Entry Year', 'Total (All Programs)', 'Diploma & Education Additions', 'Total (Like-for-Like)', 'Normalized YoY'],
          lflRows,
          { rightAlignFromCol: 1, headerColor: SUB_GREEN }
        )
      );
    }

    // 5. Program Level & Study Mode Distribution
    if (isSectionActive('levelMode')) {
      children.push(
        ...sectionHeading(
          'Program Level & Study Mode Distribution',
          'Breakdown of total student admissions across credential tiers and delivery methods.'
        )
      );

      children.push(...subHeading('1. Admissions by Program Credential Level'));
      const lvlRows: (string | number)[][] = analytics.levelBreakdown.map((row) => [
        row.level,
        ...row.counts.map((c) => formatNum(c)),
        formatNum(row.total)
      ]);
      lvlRows.push([
        'Total Entrants',
        ...years.map((_, i) => formatNum(analytics.totalByYear[i])),
        formatNum(analytics.totalAllYears)
      ]);

      children.push(
        makeStyledTable(['Program Level', ...years.map(String), 'All Years'], lvlRows, {
          rightAlignFromCol: 1,
          hasTotalRow: true
        })
      );

      children.push(...subHeading('2. Admissions by Instructional Delivery Mode'));
      const modeRows: (string | number)[][] = analytics.modeBreakdown.map((row) => [
        row.mode,
        ...row.counts.map((c) => formatNum(c)),
        formatNum(row.total)
      ]);
      modeRows.push([
        'Total Entrants',
        ...years.map((_, i) => formatNum(analytics.totalByYear[i])),
        formatNum(analytics.totalAllYears)
      ]);

      children.push(
        makeStyledTable(['Study Mode', ...years.map(String), 'All Years'], modeRows, {
          rightAlignFromCol: 1,
          hasTotalRow: true
        })
      );
    }

    // 6. Gender Equity & Demographics
    if (isSectionActive('gender')) {
      children.push(
        ...sectionHeading(
          'Gender Equity & Participation Analysis',
          `Institutional gender parity metrics across all academic years (${firstYear}–${analytics.latestYear}): Female % = Female ÷ (Male + Female).`
        )
      );

      children.push(
        ...subHeading(`All Years (${firstYear}–${analytics.latestYear}) Entrants Gender Breakdown by Program Level`)
      );
      const gAllRows: (string | number)[][] = analytics.genderByLevelAllYears.map((row) => [
        row.level,
        formatNum(row.male),
        formatNum(row.female),
        formatNum(row.total),
        formatPct(row.femalePct),
        formatPct(row.shareOfAllYears)
      ]);
      gAllRows.push([
        `Total (All Years ${firstYear}–${analytics.latestYear})`,
        formatNum(analytics.totalMaleAllYears),
        formatNum(analytics.totalFemaleAllYears),
        formatNum(analytics.totalAllYears),
        formatPct(analytics.overallFemaleShare),
        '100.0%'
      ]);

      children.push(
        makeStyledTable(
          ['Program Level', 'Male', 'Female', 'Total', 'Female %', 'Share of All Years'],
          gAllRows,
          { rightAlignFromCol: 1, hasTotalRow: true }
        )
      );

      children.push(
        ...subHeading(`Year-by-Year Entrants Gender Breakdown by Program Level (${firstYear}–${analytics.latestYear})`)
      );
      const gByYearRows: (string | number)[][] = [];
      analytics.genderByLevelByYear.forEach((yrGroup) => {
        const visibleLevels = yrGroup.levels.filter((l) => l.total > 0);
        visibleLevels.forEach((lvlRow, idx) => {
          gByYearRows.push([
            idx === 0 ? String(yrGroup.year) : '',
            lvlRow.level,
            formatNum(lvlRow.male),
            formatNum(lvlRow.female),
            formatNum(lvlRow.total),
            formatPct(lvlRow.femalePct),
            formatPct(lvlRow.shareOfYear)
          ]);
        });
        gByYearRows.push([
          String(yrGroup.year),
          `${yrGroup.year} Subtotal`,
          formatNum(yrGroup.maleTotal),
          formatNum(yrGroup.femaleTotal),
          formatNum(yrGroup.total),
          formatPct(yrGroup.femalePct),
          '100.0%'
        ]);
      });
      gByYearRows.push([
        `${firstYear}–${analytics.latestYear}`,
        'All Years Grand Total',
        formatNum(analytics.totalMaleAllYears),
        formatNum(analytics.totalFemaleAllYears),
        formatNum(analytics.totalAllYears),
        formatPct(analytics.overallFemaleShare),
        '100.0%'
      ]);

      children.push(
        makeStyledTable(
          ['Year', 'Program Level', 'Male', 'Female', 'Total', 'Female %', 'Share of Year'],
          gByYearRows,
          { rightAlignFromCol: 2, headerColor: SUB_GREEN, hasTotalRow: true }
        )
      );

      children.push(...subHeading('Multi-Year Female Representation Trend by Program Level'));
      const gTrendRows: (string | number)[][] = analytics.genderTrendByLevel.map((row) => [
        row.level,
        ...row.femalePctByYear.map((v) => formatPct(v))
      ]);
      gTrendRows.push(['All University Programs', ...analytics.femaleShareByYear.map((v) => formatPct(v))]);

      children.push(
        makeStyledTable(['Program Level', ...years.map(String)], gTrendRows, {
          rightAlignFromCol: 1,
          headerColor: SUB_GREEN,
          hasTotalRow: true
        })
      );
    }

    // 7. Department List Ledger
    if (isSectionActive('departments')) {
      children.push(
        ...sectionHeading(
          'Department & Academic Program Intake Ledger',
          `All ${analytics.departments.length} department programs calculated directly from validated registrar records.`
        )
      );

      const deptRows: (string | number)[][] = analytics.departments.map((d) => [
        d.department,
        d.program,
        ...d.years.map((val) => formatNum(val)),
        formatNum(d.total),
        formatPct(d.femaleShare2018)
      ]);
      deptRows.push([
        `Grand Total (${analytics.departments.length} Programs)`,
        'All Levels',
        ...analytics.deptTotalYears.map((t) => formatNum(t)),
        formatNum(analytics.deptGrandTotal),
        formatPct(analytics.deptWeightedFemalePct)
      ]);

      children.push(
        makeStyledTable(
          ['Department / Discipline', 'Program Level', ...years.map(String), 'All Years', `${analytics.latestYear} Female %`],
          deptRows,
          { rightAlignFromCol: 2, hasTotalRow: true }
        )
      );
    }

    // 8. Weekend Campuses Breakdown
    if (isSectionActive('campuses')) {
      children.push(
        ...sectionHeading(
          'Weekend Satellite Campuses',
          'Regional satellite branch intake across Oromia State centers (Weekend mode only).'
        )
      );

      const campusRows: (string | number)[][] = analytics.campuses.map((c) => {
        const cumFemalePct = c.total > 0 ? (c.femaleTotal / (c.maleTotal + c.femaleTotal)) * 100 : 0;
        return [
          c.campus,
          ...c.years.map((v) => (v > 0 ? formatNum(v) : '–')),
          formatNum(c.total),
          formatPct(cumFemalePct)
        ];
      });
      campusRows.push([
        'Weekend Total',
        ...analytics.campusTotalYears.map((t) => formatNum(t)),
        formatNum(analytics.campusGrandTotal),
        formatPct(analytics.campusFemalePctTotal)
      ]);

      children.push(
        makeStyledTable(
          ['Satellite Campus', ...years.map(String), 'All Years', 'Female % (Cumulative)'],
          campusRows,
          { rightAlignFromCol: 1, hasTotalRow: true }
        )
      );

      children.push(
        new Paragraph({
          spacing: { before: 100, after: 140 },
          children: [
            new TextRun({
              text: analytics.campusWeekendReconciliationOk
                ? `Audit Verification: Campus total precisely matches the Weekend study mode ledger total (${formatNum(analytics.campusGrandTotal)}).`
                : 'Audit Verification: Reconciliation variance detected.',
              size: 18,
              italics: true,
              color: analytics.campusWeekendReconciliationOk ? ACCENT_GREEN : 'B45309',
              font: 'Calibri'
            })
          ]
        })
      );
    }

    // 9. Key Findings
    if (isSectionActive('findings') && (report.customFindings?.length ?? 0) > 0) {
      children.push(...sectionHeading('Key Findings & Strategic Observations'));
      (report.customFindings || []).forEach((finding, idx) => {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            indent: { left: 320, hanging: 240 },
            children: [
              new TextRun({
                text: `${idx + 1}.  `,
                bold: true,
                size: 20,
                color: BRAND_GREEN,
                font: 'Calibri'
              }),
              new TextRun({
                text: finding,
                size: 20,
                color: TEXT_DARK,
                font: 'Calibri'
              })
            ]
          })
        );
      });
    }

    // 10. Notes on Methodology
    if (isSectionActive('notes') && (report.customNotes?.length ?? 0) > 0) {
      children.push(...sectionHeading('Notes on Methodology & Institutional Data'));
      (report.customNotes || []).forEach((note) => {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 320, hanging: 220 },
            children: [
              new TextRun({
                text: '•  ',
                bold: true,
                size: 20,
                color: ACCENT_GREEN,
                font: 'Calibri'
              }),
              new TextRun({
                text: note,
                size: 19,
                color: TEXT_MUTED,
                font: 'Calibri'
              })
            ]
          })
        );
      });
    }

    // 11. Institutional Sign-off Block
    children.push(
      new Paragraph({
        spacing: { before: 360, after: 120 },
        border: { top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR } },
        children: []
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              {
                role: 'PREPARED BY:',
                person: report.preparedBy || 'OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS',
                sub: 'Oromia State University'
              },
              {
                role: 'REVIEWED & VERIFIED:',
                person: 'Office of Academic Registrar',
                sub: 'Oromia State University'
              },
              {
                role: 'EXECUTIVE ENDORSEMENT:',
                person: 'Vice President, Academic Affairs',
                sub: 'Authorized Publication'
              }
            ].map(
              (sig) =>
                new TableCell({
                  width: { size: 33.3, type: WidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                  },
                  children: [
                    new Paragraph({
                      spacing: { after: 360 },
                      children: [
                        new TextRun({
                          text: sig.role,
                          bold: true,
                          size: 17,
                          color: TEXT_DARK,
                          font: 'Calibri'
                        })
                      ]
                    }),
                    new Paragraph({
                      border: { top: { style: BorderStyle.SINGLE, size: 6, color: '8FA89E' } },
                      spacing: { before: 60, after: 20 },
                      children: [
                        new TextRun({
                          text: sig.person,
                          bold: true,
                          size: 18,
                          color: TEXT_DARK,
                          font: 'Calibri'
                        })
                      ]
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: sig.sub,
                          size: 17,
                          color: TEXT_MUTED,
                          font: 'Calibri'
                        })
                      ]
                    })
                  ]
                })
            )
          })
        ]
      })
    );

    // Running Header with mini logo & institution title on subsequent pages, plus Copyright Footer
    const headerChildren: (TextRun | ImageRun)[] = [];
    if (logoData) {
      headerChildren.push(
        new ImageRun({
          type: 'png',
          data: logoData,
          transformation: { width: 20, height: 20 }
        }),
        new TextRun({ text: '  ' })
      );
    }
    headerChildren.push(
      new TextRun({
        text: `${report.institution || 'Oromia State University'}  ·  ${resolvedReportName}`,
        size: 16,
        color: TEXT_MUTED,
        font: 'Calibri'
      })
    );

    const doc = new Document({
      creator: report.preparedBy || 'Oromia State University',
      title: resolvedReportName,
      description: 'Oromia State University Active Student Institutional Report',
      sections: [
        {
          properties: {
            titlePage: true,
            page: {
              margin: { top: 900, right: 900, bottom: 900, left: 900 }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
                  spacing: { after: 100 },
                  children: headerChildren
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: '© Oromia State University | Copyright by Abdela Kasim   ·   Page ',
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    }),
                    new TextRun({
                      text: ' of ',
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    })
                  ]
                })
              ]
            }),
            first: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: '© Oromia State University | Copyright by Abdela Kasim',
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    })
                  ]
                })
              ]
            })
          },
          children
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const safeName = (fileName || resolvedReportName || 'OSU_Active_Student_Report').replace(/[^a-zA-Z0-9._-]/g, '_');
    triggerDownload(blob, safeName);
    return true;
  } catch (err) {
    console.error('Failed to generate DOCX report:', err);
    return false;
  }
}

export async function exportDocumentationToDOCX(
  fileName: string = 'Oromia_State_University_Student_Report_Documentation.docx',
  years?: number[]
): Promise<boolean> {
  try {
    const logoData = await loadLogoBuffer();
    const yearSpan = formatYearSpan(years, '–');
    const children: (Paragraph | Table)[] = [];

    children.push(
      buildLetterheadBanner(
        logoData,
        'Oromia State University',
        'Oromia State University Student Report · System & User Manual',
        `Institutional Technical & User Documentation (${yearSpan})`,
        'Comprehensive reference guide for preparing, analyzing, and exporting student statistics'
      )
    );

    const docSections = [
      {
        num: '1',
        title: 'Executive Overview & Purpose',
        paragraphs: [
          `The Oromia State University Student Report is an institutional web portal designed for the Office of Academic Registrar, departmental admission coordinators, and executive leadership. It aggregates and tracks student enrollment data across academic years (${yearSpan}), covering multiple program levels (1st Degree Applied, 1st Degree Education, Diploma & Certificate, Masters, and PhD), delivery modes (Regular, Extension, Winter, Summer, and Weekend), and regional satellite campuses.`
        ]
      },
      {
        num: '2',
        title: 'User Roles & Access Control (RBAC)',
        paragraphs: [
          '• Academic Registrar (@registrar): Full institutional enrollment authority across all faculties and program levels.',
          '• Department Admission Officers (@accounting_lead, etc.): Departmental coordinators managing intake records for specific academic departments.',
          '• Program Level Coordinators (@applied, @education, @diploma, @masters, @phd): Faculty coordinators overseeing specific degree tiers and student pathways.',
          '• University Executive Admin (@admin): System administrator managing user accounts, passwords, department assignments, and archival status.'
        ]
      },
      {
        num: '3',
        title: 'Data Ledger & Management',
        paragraphs: [
          'The Data Ledger view provides complete management for raw student enrollment records synchronized across all connected devices via the central database. Each record tracks Academic Year, Program Level, Department, Delivery Mode, Campus, Male, Female, and automatically computed Total.'
        ]
      },
      {
        num: '4',
        title: 'Analytics & Calculation Engine',
        paragraphs: [
          'The built-in analytics engine computes institutional KPIs, year-on-year growth rates, like-for-like normalized baselines, female participation shares, and faculty distribution summaries automatically from validated registrar records.'
        ]
      },
      {
        num: '5',
        title: 'Reporting, PDF & DOCX Generation (With Official Logo)',
        paragraphs: [
          'Users can customize report sections, edit executive summaries and findings, and export formatted documents in Word (.docx) and PDF (.pdf) formats embedded with the official Oromia State University emblem, structured statistical tables, executive sign-off blocks, and institutional footers.'
        ]
      }
    ];

    docSections.forEach((sec) => {
      children.push(...sectionHeading(`${sec.num}. ${sec.title}`));
      sec.paragraphs.forEach((text) => {
        children.push(
          new Paragraph({
            spacing: { after: 110 },
            children: [
              new TextRun({
                text,
                size: 21,
                color: TEXT_DARK,
                font: 'Calibri'
              })
            ]
          })
        );
      });
    });

    const doc = new Document({
      creator: 'Oromia State University',
      title: 'Oromia State University Student Report System & User Documentation',
      sections: [
        {
          properties: {
            page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } }
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: '© Oromia State University | Copyright by Abdela Kasim · Institutional Planning & Statistics',
                      size: 16,
                      color: TEXT_MUTED,
                      font: 'Calibri'
                    })
                  ]
                })
              ]
            })
          },
          children
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, fileName);
    return true;
  } catch (err) {
    console.error('Failed to generate Documentation DOCX:', err);
    return false;
  }
}
