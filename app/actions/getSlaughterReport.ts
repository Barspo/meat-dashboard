'use server';

import { query } from '@/lib/db';

export interface Season {
  id: number;
  name_hebrew: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface SlaughterReportRow {
  factory_id: number | null; // null = summary row
  factory_name: string;
  country_name_hebrew?: string | null;
  total: number;
  halak: number;
  muchshar: number;
  treif: number;
  without_treif: number;
  halak_pct: number;
  muchshar_pct: number;
  treif_pct: number;
  halak_of_clean_pct: number;
  muchshar_of_clean_pct: number;
}

export interface SlaughterReportData {
  season: Season | null;
  summary: SlaughterReportRow;
  rows: SlaughterReportRow[];
  recentUploads: {
    id: number;
    fileName: string;
    uploadType: string;
    factoryName: string;
    uploadMethod: string;
    status: string;
    errorDetails: string | null;
    uploadedAt: string | null;
  }[];
}

function calcPcts(row: {
  total: number; halak: number; muchshar: number; treif: number; without_treif: number;
}): Pick<SlaughterReportRow, 'halak_pct' | 'muchshar_pct' | 'treif_pct' | 'halak_of_clean_pct' | 'muchshar_of_clean_pct'> {
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
  return {
    halak_pct: pct(row.halak, row.total),
    muchshar_pct: pct(row.muchshar, row.total),
    treif_pct: pct(row.treif, row.total),
    halak_of_clean_pct: pct(row.halak, row.without_treif),
    muchshar_of_clean_pct: pct(row.muchshar, row.without_treif),
  };
}

export async function getSeasonsList(): Promise<Season[]> {
  const result = await query(
    `SELECT id, name_hebrew, start_date::text, end_date::text, is_current
     FROM seasons
     ORDER BY start_date DESC`
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    name_hebrew: r.name_hebrew,
    start_date: r.start_date,
    end_date: r.end_date,
    is_current: Boolean(r.is_current),
  }));
}

export async function getSlaughterReport(seasonId: number | null): Promise<SlaughterReportData> {
  // Resolve season
  const seasonRes = await query(
    seasonId != null
      ? `SELECT id, name_hebrew, start_date::text, end_date::text, is_current FROM seasons WHERE id = $1`
      : `SELECT id, name_hebrew, start_date::text, end_date::text, is_current FROM seasons WHERE is_current = true LIMIT 1`,
    seasonId != null ? [seasonId] : []
  );

  const season: Season | null = seasonRes.rows[0]
    ? {
        id: seasonRes.rows[0].id,
        name_hebrew: seasonRes.rows[0].name_hebrew,
        start_date: seasonRes.rows[0].start_date,
        end_date: seasonRes.rows[0].end_date,
        is_current: Boolean(seasonRes.rows[0].is_current),
      }
    : null;

  // Factory rows
  let factoryRows: SlaughterReportRow[] = [];

  if (season) {
    const res = await query(
      `SELECT f.id as factory_id,
              COALESCE(f.name_hebrew, f.name_english) as factory_name,
              c.name_hebrew as country_name_hebrew,
              COALESCE(SUM(sb.cows_count + sb.bulls_count), 0) as total,
              COALESCE(SUM(sb.halak_count), 0) as halak,
              COALESCE(SUM(sb.muchshar_count), 0) as muchshar,
              COALESCE(SUM(COALESCE(sb.waste_lungs,0) + COALESCE(sb.waste_inner,0) + COALESCE(sb.waste_outer,0)), 0) as treif
       FROM factories f
       JOIN slaughter_batches sb ON sb.factory_id = f.id
       LEFT JOIN countries c ON f.country_id = c.id
       WHERE sb.date BETWEEN $1::date AND $2::date
       GROUP BY f.id, f.name_english, f.name_hebrew, c.name_hebrew
       ORDER BY COALESCE(f.name_hebrew, f.name_english)`,
      [season.start_date, season.end_date]
    );

    factoryRows = res.rows.map((r: any) => {
      const total = Number(r.total);
      const halak = Number(r.halak);
      const muchshar = Number(r.muchshar);
      const treif = Number(r.treif);
      const without_treif = total - treif;
      return {
        factory_id: r.factory_id,
        factory_name: r.factory_name,
        country_name_hebrew: r.country_name_hebrew || null,
        total, halak, muchshar, treif, without_treif,
        ...calcPcts({ total, halak, muchshar, treif, without_treif }),
      };
    });
  }

  // Summary row
  const totals = factoryRows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      halak: acc.halak + r.halak,
      muchshar: acc.muchshar + r.muchshar,
      treif: acc.treif + r.treif,
    }),
    { total: 0, halak: 0, muchshar: 0, treif: 0 }
  );
  const without_treif = totals.total - totals.treif;
  const summary: SlaughterReportRow = {
    factory_id: null,
    factory_name: 'כלל המפעלים',
    without_treif,
    ...totals,
    ...calcPcts({ ...totals, without_treif }),
  };

  // Recent uploads — use uploaded_at
  const uploadsRes = await query(
    `SELECT il.id, il.file_name, il.upload_type,
            COALESCE(il.upload_method, 'manual') as upload_method,
            COALESCE(il.status, 'unknown') as status,
            il.error_details,
            il.uploaded_at::text as uploaded_at,
            COALESCE(f.name_hebrew, f.name_english, '-') as factory_name
     FROM import_logs il
     LEFT JOIN factories f ON il.factory_id = f.id
     ORDER BY il.id DESC
     LIMIT 10`
  );

  const recentUploads = uploadsRes.rows.map((r: any) => ({
    id: r.id,
    fileName: r.file_name,
    uploadType: r.upload_type,
    factoryName: r.factory_name,
    uploadMethod: r.upload_method,
    status: r.status,
    errorDetails: r.error_details || null,
    uploadedAt: r.uploaded_at || null,
  }));

  return { season, summary, rows: factoryRows, recentUploads };
}
