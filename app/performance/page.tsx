export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

// הגדרת טיפוסים כדי למנוע שגיאות אדומות
type YieldData = {
  in_halak: number;
  out_halak: number;
  out_halak_x9: number;
  in_kosher: number;
  out_kosher: number;
  out_kosher_x9: number;
};

async function getPerformanceData() {
  
  // 1. חישוב תשואה (Yield) וסטייקים
  // אנחנו משתמשים ב-COALESCE כדי להחזיר 0 אם אין נתונים (מונע שגיאות NULL)
  const yieldResult = await query(`
    WITH Inputs AS (
      SELECT 
        COALESCE(SUM(halak_kg_in), 0) as in_halak,
        COALESCE(SUM(kosher_kg_in), 0) as in_kosher
      FROM debone_batches
    ),
    Outputs AS (
      SELECT 
        COALESCE(SUM(CASE WHEN p.kosher_type IN ('RUBIN', 'SHERIT', 'Macfud', 'Halak SP') THEN pr.weight_kg ELSE 0 END), 0) as out_halak,
        COALESCE(SUM(CASE WHEN p.kosher_type IN ('KOSHER', 'Kosher SP') THEN pr.weight_kg ELSE 0 END), 0) as out_kosher,
        
        -- חישוב X9 (סטייקים בלבד)
        COALESCE(SUM(CASE WHEN p.is_steak = 'yes' AND p.kosher_type IN ('RUBIN', 'SHERIT', 'Macfud', 'Halak SP') THEN pr.weight_kg ELSE 0 END), 0) as out_halak_x9,
        COALESCE(SUM(CASE WHEN p.is_steak = 'yes' AND p.kosher_type IN ('KOSHER', 'Kosher SP') THEN pr.weight_kg ELSE 0 END), 0) as out_kosher_x9
      FROM production_records pr
      LEFT JOIN products p ON pr.item_id = p.item_id
    )
    SELECT * FROM Inputs, Outputs
  `);

  const rawData: YieldData = yieldResult.rows[0] || { in_halak: 1, out_halak: 0, out_halak_x9: 0, in_kosher: 1, out_kosher: 0, out_kosher_x9: 0 };

  // מניעת חילוק ב-0
  const safeInHalak = rawData.in_halak || 1;
  const safeInKosher = rawData.in_kosher || 1;

  // 2. טבלת מעקב יומית
  const dailyTable = await query(`
    SELECT 
      TO_CHAR(sb.date, 'DD/MM/YYYY') as date,
      f.name as factory,
      (sb.cow_count + sb.bull_count) as heads,
      db.halak_kg_in as in_halak,
      SUM(CASE WHEN p.kosher_type IN ('RUBIN', 'SHERIT', 'Macfud', 'Halak SP') THEN pr.weight_kg ELSE 0 END) as out_halak,
      db.kosher_kg_in as in_kosher,
      SUM(CASE WHEN p.kosher_type IN ('KOSHER', 'Kosher SP') THEN pr.weight_kg ELSE 0 END) as out_kosher
    FROM slaughter_batches sb
    JOIN debone_batches db ON sb.faena_id = db.faena_id
    JOIN work_orders w ON sb.faena_id = w.faena_id
    JOIN factories f ON w.factory_id = f.factory_id
    LEFT JOIN production_records pr ON w.work_id = pr.work_id
    LEFT JOIN products p ON pr.item_id = p.item_id
    GROUP BY sb.date, f.name, sb.cow_count, sb.bull_count, db.halak_kg_in, db.kosher_kg_in
    ORDER BY sb.date DESC
  `);

  // 3. ספירת מלאי סטייקים
  const steakCounts = await query(`
    SELECT 
      COALESCE(p.kosher_type, 'Unknown') as kosher_type,
      SUM(pr.boxes) as boxes
    FROM production_records pr
    JOIN products p ON pr.item_id = p.item_id
    WHERE p.is_steak = 'yes'
    GROUP BY p.kosher_type
  `);

  return {
    yields: {
      halak: {
        in: rawData.in_halak,
        out: rawData.out_halak,
        percent: ((rawData.out_halak / safeInHalak) * 100).toFixed(1),
        x9_percent: ((rawData.out_halak_x9 / safeInHalak) * 100).toFixed(1)
      },
      kosher: {
        in: rawData.in_kosher,
        out: rawData.out_kosher,
        percent: ((rawData.out_kosher / safeInKosher) * 100).toFixed(1),
        x9_percent: ((rawData.out_kosher_x9 / safeInKosher) * 100).toFixed(1)
      }
    },
    table: dailyTable.rows,
    steaks: steakCounts.rows
  };
}

export default async function PerformancePage() {
  const data = await getPerformanceData();

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100" dir="rtl">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-400">ביצועי מפעל ותשואות</h1>
        <p className="text-slate-400">ניתוח תשואות (Yield) בזמן אמת</p>
      </div>

      {/* כרטיסי תשואה */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* חלק (Halak) */}
        <div className="bg-slate-800 p-6 rounded-xl border-t-4 border-purple-500 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-300">תשואה - חלק (Halak)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-60">תשואה כללית</p>
              <p className="text-3xl font-bold">{data.yields.halak.percent}%</p>
            </div>
            <div>
              <p className="text-sm opacity-60">תשואת X9 (סטייקים)</p>
              <p className="text-3xl font-bold text-purple-400">{data.yields.halak.x9_percent}%</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
            נכנס: {Number(data.yields.halak.in).toLocaleString()} ק"ג | יצא: {Number(data.yields.halak.out).toLocaleString()} ק"ג
          </div>
        </div>

        {/* כשר (Kosher) */}
        <div className="bg-slate-800 p-6 rounded-xl border-t-4 border-blue-500 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-blue-300">תשואה - כשר (Kosher)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-60">תשואה כללית</p>
              <p className="text-3xl font-bold">{data.yields.kosher.percent}%</p>
            </div>
            <div>
              <p className="text-sm opacity-60">תשואת X9 (סטייקים)</p>
              <p className="text-3xl font-bold text-blue-400">{data.yields.kosher.x9_percent}%</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
            נכנס: {Number(data.yields.kosher.in).toLocaleString()} ק"ג | יצא: {Number(data.yields.kosher.out).toLocaleString()} ק"ג
          </div>
        </div>
      </div>

      {/* מלאי סטייקים */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">📦 מלאי סטייקים (קרטונים)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.steaks.length > 0 ? data.steaks.map((s: any, idx: number) => (
            <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">{s.kosher_type}</p>
              <p className="text-2xl font-bold">{s.boxes}</p>
            </div>
          )) : <p className="text-slate-500">אין נתונים</p>}
        </div>
      </div>

      {/* טבלה יומית */}
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-lg font-semibold">דוח ייצור יומי</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">תאריך</th>
                <th className="px-4 py-3">מפעל</th>
                <th className="px-4 py-3">ראשים</th>
                <th className="px-4 py-3 text-purple-300">תשואה חלק</th>
                <th className="px-4 py-3 text-blue-300">תשואה כשר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {data.table.map((row: any, i: number) => {
                const yieldHalak = row.in_halak ? ((row.out_halak / row.in_halak) * 100).toFixed(1) : '0.0';
                const yieldKosher = row.in_kosher ? ((row.out_kosher / row.in_kosher) * 100).toFixed(1) : '0.0';
                
                return (
                  <tr key={i} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.factory}</td>
                    <td className="px-4 py-3">{row.heads}</td>
                    <td className="px-4 py-3 text-purple-400 font-bold">{yieldHalak}%</td>
                    <td className="px-4 py-3 text-blue-400 font-bold">{yieldKosher}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}