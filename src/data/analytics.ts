import { CampusSummary, DepartmentSummary, RawRecord } from '../types';

export const YEARS = [2014, 2015, 2016, 2017, 2018] as const;
export type Year = typeof YEARS[number];

export const PROGRAM_LEVELS = [
  '1st Degree (Applied)',
  '1st Degree (Education)',
  'Diploma and Certificate',
  'Masters',
  'PhD'
] as const;

export const STUDY_MODES = [
  'Regular',
  'Extension',
  'Winter',
  'Summer',
  'Weekend'
] as const;

export interface AnalyticsResult {
  years: number[];
  latestYear: number;
  maleByYear: number[];
  femaleByYear: number[];
  totalByYear: number[];
  femaleShareByYear: number[];
  totalAllYears: number;
  totalMaleAllYears: number;
  totalFemaleAllYears: number;
  overallFemaleShare: number;
  
  // Like-for-like analysis (without Diploma & Certificate and Education)
  excludedCategoriesByYear: number[];
  likeForLikeTotalByYear: number[];
  likeForLikeGrowth2018: number; // percent
  totalGrowth2018: number; // percent
  
  // Female share excluding Diploma & Certificate (latest year)
  female2018ExDiploma: number;
  total2018ExDiploma: number;
  femaleShare2018ExDiploma: number;

  // Level & Mode breakdowns
  levelBreakdown: { level: string; counts: number[]; total: number }[];
  modeBreakdown: { mode: string; counts: number[]; total: number }[];

  // Specific gender breakdowns
  genderByLevel2018: { level: string; male: number; female: number; total: number; femalePct: number; shareOf2018: number }[];
  genderByMode2018: { mode: string; male: number; female: number; total: number; femalePct: number; shareOf2018: number }[];
  genderTrendByLevel: { level: string; femalePctByYear: (number | null)[] }[];

  // Department ledger
  departments: DepartmentSummary[];
  deptTotalYears: number[];
  deptGrandTotal: number;
  deptWeightedFemalePct: number;

  // Weekend Campuses
  campuses: CampusSummary[];
  campusTotalYears: number[];
  campusGrandTotal: number;
  campusFemalePctTotal: number;
  campusWeekendReconciliationOk: boolean;
}

export function computeAnalytics(records: RawRecord[]): AnalyticsResult {
  const sum = (arr: number[]) => arr.reduce((acc, curr) => acc + curr, 0);

  // Dynamic years list from records or fallback
  const recordYears = Array.from(
    new Set(records.map((r) => r[0]))
  ).filter((y) => typeof y === 'number' && !isNaN(y)).sort((a, b) => a - b);
  
  // Guarantee base years 2014-2018 if in dataset or empty
  const activeYears = recordYears.length > 0 ? recordYears : [2014, 2015, 2016, 2017, 2018];
  const latestYear = activeYears[activeYears.length - 1] ?? 2018;
  const latestIdx = activeYears.length - 1;
  const prevIdx = Math.max(0, latestIdx - 1);

  // Group by year
  const maleByYear = activeYears.map((yr) =>
    sum(records.filter((r) => r[0] === yr).map((r) => r[5] || 0))
  );
  const femaleByYear = activeYears.map((yr) =>
    sum(records.filter((r) => r[0] === yr).map((r) => r[6] || 0))
  );
  const totalByYear = maleByYear.map((m, i) => m + femaleByYear[i]);
  const femaleShareByYear = totalByYear.map((tot, i) =>
    tot > 0 ? (femaleByYear[i] / tot) * 100 : 0
  );

  const totalAllYears = sum(totalByYear);
  const totalMaleAllYears = sum(maleByYear);
  const totalFemaleAllYears = sum(femaleByYear);
  const overallFemaleShare =
    totalAllYears > 0 ? (totalFemaleAllYears / totalAllYears) * 100 : 0;

  // Like-for-like analysis (excluding Diploma & Certificate and 1st Degree Education)
  const excludedCategoriesByYear = activeYears.map((yr) =>
    sum(
      records
        .filter(
          (r) =>
            r[0] === yr &&
            (r[1] === 'Diploma and Certificate' || r[1] === '1st Degree (Education)')
        )
        .map((r) => (r[5] || 0) + (r[6] || 0))
    )
  );

  const likeForLikeTotalByYear = totalByYear.map(
    (t, i) => t - excludedCategoriesByYear[i]
  );

  const totalGrowth2018 =
    totalByYear[prevIdx] > 0
      ? ((totalByYear[latestIdx] - totalByYear[prevIdx]) / totalByYear[prevIdx]) * 100
      : 0;

  const likeForLikeGrowth2018 =
    likeForLikeTotalByYear[prevIdx] > 0
      ? ((likeForLikeTotalByYear[latestIdx] - likeForLikeTotalByYear[prevIdx]) /
          likeForLikeTotalByYear[prevIdx]) *
        100
      : 0;

  // Latest year Ex-Diploma
  const rLatestExDiploma = records.filter(
    (r) => r[0] === latestYear && r[1] !== 'Diploma and Certificate'
  );
  const female2018ExDiploma = sum(rLatestExDiploma.map((r) => r[6] || 0));
  const total2018ExDiploma = sum(
    rLatestExDiploma.map((r) => (r[5] || 0) + (r[6] || 0))
  );
  const femaleShare2018ExDiploma =
    total2018ExDiploma > 0
      ? (female2018ExDiploma / total2018ExDiploma) * 100
      : 0;

  // Program Level Breakdown
  const levelBreakdown = PROGRAM_LEVELS.map((lvl) => {
    const counts = activeYears.map((yr) =>
      sum(
        records
          .filter((r) => r[0] === yr && r[1] === lvl)
          .map((r) => (r[5] || 0) + (r[6] || 0))
      )
    );
    return {
      level: lvl,
      counts,
      total: sum(counts)
    };
  });

  // Study Mode Breakdown
  const modeBreakdown = STUDY_MODES.map((mode) => {
    const counts = activeYears.map((yr) =>
      sum(
        records
          .filter((r) => r[0] === yr && r[3] === mode)
          .map((r) => (r[5] || 0) + (r[6] || 0))
      )
    );
    return {
      mode,
      counts,
      total: sum(counts)
    };
  });

  // Latest year Gender by Level
  const tLatest = totalByYear[latestIdx] || 1;
  const genderByLevel2018 = PROGRAM_LEVELS.map((lvl) => {
    const recs = records.filter((r) => r[0] === latestYear && r[1] === lvl);
    const m = sum(recs.map((r) => r[5] || 0));
    const f = sum(recs.map((r) => r[6] || 0));
    const tot = m + f;
    return {
      level: lvl,
      male: m,
      female: f,
      total: tot,
      femalePct: tot > 0 ? (f / tot) * 100 : 0,
      shareOf2018: (tot / tLatest) * 100
    };
  });

  // Latest year Gender by Mode
  const genderByMode2018 = STUDY_MODES.map((mode) => {
    const recs = records.filter((r) => r[0] === latestYear && r[3] === mode);
    const m = sum(recs.map((r) => r[5] || 0));
    const f = sum(recs.map((r) => r[6] || 0));
    const tot = m + f;
    return {
      mode,
      male: m,
      female: f,
      total: tot,
      femalePct: tot > 0 ? (f / tot) * 100 : 0,
      shareOf2018: (tot / tLatest) * 100
    };
  });

  // Gender Trend by Level across all active years
  const genderTrendByLevel = PROGRAM_LEVELS.map((lvl) => {
    const femalePctByYear = activeYears.map((yr) => {
      const recs = records.filter((r) => r[0] === yr && r[1] === lvl);
      const m = sum(recs.map((r) => r[5] || 0));
      const f = sum(recs.map((r) => r[6] || 0));
      const tot = m + f;
      return tot > 0 ? (f / tot) * 100 : null;
    });
    return {
      level: lvl,
      femalePctByYear
    };
  });

  // Departments aggregation - normalized key by department and program so new records link synchronously
  const deptMap = new Map<string, { dept: string; prog: string; recs: RawRecord[] }>();
  records.forEach((r) => {
    const trimmedDept = (r[2] || '').trim();
    const trimmedProg = (r[1] || '').trim();
    if (!trimmedDept) return;
    const key = `${trimmedDept.toLowerCase()}|${trimmedProg.toLowerCase()}`;
    if (!deptMap.has(key)) {
      deptMap.set(key, { dept: trimmedDept, prog: trimmedProg, recs: [] });
    }
    deptMap.get(key)!.recs.push(r);
  });

  const levelPriority = (p: string) => {
    const idx = (PROGRAM_LEVELS as readonly string[]).indexOf(p as any);
    return idx === -1 ? 99 : idx;
  };

  const departments: DepartmentSummary[] = Array.from(deptMap.values())
    .map(({ dept, prog, recs }) => {
      const years = activeYears.map((yr) =>
        sum(recs.filter((r) => r[0] === yr).map((r) => (r[5] || 0) + (r[6] || 0)))
      );
      const recsLatest = recs.filter((r) => r[0] === latestYear);
      const mLatest = sum(recsLatest.map((r) => r[5] || 0));
      const fLatest = sum(recsLatest.map((r) => r[6] || 0));
      const tLatest = mLatest + fLatest;
      const total = sum(years);
      return {
        department: dept,
        program: prog,
        years,
        total,
        femaleShare2018: tLatest > 0 ? (fLatest / tLatest) * 100 : null
      };
    })
    .sort((a, b) => {
      const pDiff = levelPriority(a.program) - levelPriority(b.program);
      if (pDiff !== 0) return pDiff;
      return b.total - a.total;
    });

  const deptTotalYears = activeYears.map((_, yIdx) =>
    sum(departments.map((d) => d.years[yIdx] || 0))
  );
  const deptGrandTotal = sum(departments.map((d) => d.total));
  const deptLatestWithData = departments.filter((d) => d.femaleShare2018 !== null);
  const deptLatestTotalW = sum(
    deptLatestWithData.map((d) => d.years[latestIdx] || 0)
  );
  const deptWeightedFemalePct =
    deptLatestTotalW > 0
      ? sum(
          deptLatestWithData.map(
            (d) => ((d.femaleShare2018 || 0) / 100) * (d.years[latestIdx] || 0)
          )
        ) /
        deptLatestTotalW *
        100
      : 0;

  // Weekend Campuses
  const weekendRecords = records.filter(
    (r) => r[3] === 'Weekend' && r[4] !== null && r[4] !== undefined && r[4].trim() !== ''
  );
  const campusMap = new Map<string, RawRecord[]>();
  weekendRecords.forEach((r) => {
    const cName = r[4]!.trim();
    if (!campusMap.has(cName)) {
      campusMap.set(cName, []);
    }
    campusMap.get(cName)!.push(r);
  });

  const campuses: CampusSummary[] = Array.from(campusMap.entries())
    .map(([cName, recs]) => {
      const years = activeYears.map((yr) =>
        sum(recs.filter((r) => r[0] === yr).map((r) => (r[5] || 0) + (r[6] || 0)))
      );
      const maleTotal = sum(recs.map((r) => r[5] || 0));
      const femaleTotal = sum(recs.map((r) => r[6] || 0));
      return {
        campus: cName,
        years,
        maleTotal,
        femaleTotal,
        total: sum(years)
      };
    })
    .sort((a, b) => b.total - a.total);

  const campusTotalYears = activeYears.map((_, yIdx) =>
    sum(campuses.map((c) => c.years[yIdx] || 0))
  );
  const campusGrandTotal = sum(campuses.map((c) => c.total));
  const campusTotalMale = sum(campuses.map((c) => c.maleTotal));
  const campusTotalFemale = sum(campuses.map((c) => c.femaleTotal));
  const campusFemalePctTotal =
    campusGrandTotal > 0
      ? (campusTotalFemale / (campusTotalMale + campusTotalFemale)) * 100
      : 0;

  // Check reconciliation against Weekend mode total
  const weekendModeTotal = modeBreakdown.find((m) => m.mode === 'Weekend')?.total || 0;
  const campusWeekendReconciliationOk = campusGrandTotal === weekendModeTotal;

  return {
    years: activeYears,
    latestYear,
    maleByYear,
    femaleByYear,
    totalByYear,
    femaleShareByYear,
    totalAllYears,
    totalMaleAllYears,
    totalFemaleAllYears,
    overallFemaleShare,
    excludedCategoriesByYear,
    likeForLikeTotalByYear,
    likeForLikeGrowth2018,
    totalGrowth2018,
    female2018ExDiploma,
    total2018ExDiploma,
    femaleShare2018ExDiploma,
    levelBreakdown,
    modeBreakdown,
    genderByLevel2018,
    genderByMode2018,
    genderTrendByLevel,
    departments,
    deptTotalYears,
    deptGrandTotal,
    deptWeightedFemalePct,
    campuses,
    campusTotalYears,
    campusGrandTotal,
    campusFemalePctTotal,
    campusWeekendReconciliationOk
  };
}

export function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '–';
  if (n === 0) return '0';
  return n.toLocaleString('en-US');
}

export function formatPct(p: number | null | undefined, includePlus = false): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return '–';
  const prefix = includePlus && p > 0 ? '+' : '';
  return `${prefix}${p.toFixed(1)}%`;
}

/**
 * Generates an institutional default Source Cell matching the OSU Registrar Excel format:
 * e.g. "'2018'!C10" for Regular, "'2018'!F10" for Extension, "'2018'!AJ10" for Weekend Sebeta.
 */
export function getDefaultSourceCell(
  year: number = 2018,
  mode: string = 'Regular',
  campus?: string | null,
  rowOffset: number = 10
): string {
  const y = year || 2018;
  const m = (mode || 'Regular').trim();
  const c = (campus || '').trim().toLowerCase();

  let col = 'C';
  if (m === 'Regular') {
    col = 'C';
  } else if (m === 'Extension') {
    col = 'F';
  } else if (m === 'Winter') {
    col = 'I';
  } else if (m === 'Summer') {
    col = 'L';
  } else if (m === 'Weekend') {
    if (c.includes('adama')) col = 'O';
    else if (c.includes('batu') || c.includes('ziway')) col = 'R';
    else if (c.includes('bishoftu') || c.includes('debre')) col = 'U';
    else if (c.includes('burayu')) col = 'X';
    else if (c.includes('fiche')) col = 'AA';
    else if (c.includes('meki')) col = 'AD';
    else if (c.includes('lega') || c.includes('tafo')) col = 'AG';
    else if (c.includes('sebeta')) col = 'AJ';
    else if (c.includes('sululta')) col = 'AM';
    else if (c.includes('shashamane') || c.includes('shashemene')) col = 'AP';
    else col = 'W';
  } else {
    col = 'C';
  }

  const row = rowOffset > 0 ? rowOffset : 10;
  return `'${y}'!${col}${row}`;
}

