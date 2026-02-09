export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { TrendChart, KosherPieChart, FactoryBarChart } from './components/DashboardCharts';

async function getData() {
  try {
    // 1. נתוני KPI ראשיים (סיכומים)
    const kpiData = await query(`
      SELECT 
        SUM(pr.weight_kg) as total_weight,
        SUM(pr.boxes) as total_boxes,
        (SELECT SUM(cow_count + bull_count) FROM slaughter_batches) as total_heads,
        -- חישוב תשואה (Yield) בסיסי: משקל יציאה חלקי משקל כניסה (אם קיים)
        ROUND((SUM(pr.weight_kg) / NULLIF((SELECT SUM(halak_kg_in + kosher_kg_in) FROM debone_batches), 0)) * 100, 1) as yield_percentage
      FROM production_records pr
    `);

    // 2. גרף מגמה (Trend) - משקל לפי תאריך
    // מכיוון שבנתונים החדשים יש לנו תאריכים דרך work_orders שמקושרים לשחיטה
    // (או שנשתמש בתאריך ייצור אם הוספנו כזה, כרגע נשתמש בתאריך השחיטה כקירוב)
    const trendData = await query(`
      SELECT 
        TO_CHAR(sb.date, 'DD/MM') as date,
        SUM(pr.weight_kg) as weight
      FROM production_records pr
      JOIN work_orders w ON pr.work_id = w.work_id
      JOIN slaughter_batches sb ON w.faena_id = sb.faena_id
      GROUP BY sb.date
      ORDER BY sb.date ASC
    `);

    // 3. התפלגות כשרות (Pie Chart) - התיקון הגדול!
    // במקום לחפש טבלת כשרות נפרדת, אנחנו לוקחים את הטקסט ישירות מטבלת המוצרים
    const kosherData = await query(`
      SELECT 
        p.kosher_type as name,
        SUM(pr.weight_kg) as value
      FROM production_records pr
      JOIN products p ON pr.item_id = p.item_id
      GROUP BY p.kosher_type
    `);

    // 4. ביצועים לפי מפעל (Bar Chart)
    const factoryData = await query(`
      SELECT 
        f.name as factory,
        SUM(pr.weight_kg) as weight
      FROM production_records pr
      JOIN work_orders w ON pr.work_id = w.work_id
      JOIN factories f ON w.factory_id = f.factory_id
      GROUP BY f.name
    `);

    return {
      kpi: kpiData.rows[0] || { total_weight: 0, total_boxes: 0, total_heads: 0, yield_percentage: 0 },
      trend: trendData.rows,
      kosher: kosherData.rows,
      factory: factoryData.rows
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      kpi: { total_weight: 0, total_boxes: 0, total_heads: 0, yield_percentage: 0 },
      trend: [],
      kosher: [],
      factory: []
    };
  }
}

export default async function Home() {
  const data = await getData();

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen text-slate-100" dir="rtl">
      
      {/* כותרת */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-400">לוח בקרה ראשי</h1>
          <p className="text-slate-400">מבט על נתוני הייצור בזמן אמת</p>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-lg shadow-lg shadow-blue-900/50">
          <span className="font-bold">סה"כ משקל: </span>
          {Number(data.kpi.total_weight).toLocaleString()} ק"ג
        </div>
      </div>

      {/* כרטיסי מידע (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="סה״כ משקל (ק״ג)" value={Number(data.kpi.total_weight).toLocaleString()} icon="⚖️" color="blue" />
        <KpiCard title="כמות ארגזים" value={Number(data.kpi.total_boxes).toLocaleString()} icon="📦" color="purple" />
        <KpiCard title="ראשים (שחיטה)" value={Number(data.kpi.total_heads).toLocaleString()} icon="🐮" color="orange" />
        <KpiCard title="תשואה (Yield)" value={`${data.kpi.yield_percentage}%`} icon="📈" color="green" />
      </div>

      {/* אזור הגרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* גרף מגמת ייצור */}
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">מגמת ייצור יומית</h3>
          <div className="h-64">
            {data.trend.length > 0 ? (
              <TrendChart data={data.trend} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">אין נתונים להצגה</div>
            )}
          </div>
        </div>

        {/* גרף כשרות + מפעלים */}
        <div className="space-y-6">
          {/* גרף עוגה - כשרות */}
          <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-4 text-slate-200">התפלגות כשרות</h3>
            <div className="h-64">
               {data.kosher.length > 0 ? (
                <KosherPieChart data={data.kosher} />
               ) : (
                <div className="h-full flex items-center justify-center text-slate-500">אין נתונים להצגה</div>
               )}
            </div>
          </div>

          {/* גרף עמודות - מפעלים */}
          <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
             <h3 className="text-xl font-semibold mb-4 text-slate-200">ייצור לפי מפעל</h3>
             <div className="h-48">
               {data.factory.length > 0 ? (
                 <FactoryBarChart data={data.factory} />
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-500">אין נתונים להצגה</div>
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// רכיב עזר לכרטיסי המידע (כדי לא לשכפל קוד)
function KpiCard({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]} shadow-md flex items-center justify-between`}>
      <div>
        <p className="text-sm opacity-80 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
      </div>
      <div className="text-3xl opacity-80">{icon}</div>
    </div>
  );
}