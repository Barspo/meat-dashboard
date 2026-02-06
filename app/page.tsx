import { query } from '@/lib/db';
import { TrendChart, KosherPieChart, FactoryBarChart } from './components/DashboardCharts';
import { Package, Scale, Activity, Beef } from 'lucide-react';

// --- פונקציה לשליפת הנתונים (Server Side) ---
async function getDashboardData() {
  const kpiQuery = await query(`
    SELECT 
      SUM(pr.weight_kg) as total_weight,
      SUM(pr.boxes) as total_boxes,
      (SELECT SUM(cow_count + bull_count) FROM slaughter_batches) as total_heads,
      ROUND((SUM(pr.weight_kg) / NULLIF((SELECT SUM(halak_kg_in + kosher_kg_in) FROM debone_batches), 0)) * 100, 1) as yield_percentage
    FROM production_records pr
  `);

  const trendQuery = await query(`
    SELECT 
      TO_CHAR(sb.date, 'DD/MM') as date,
      SUM(pr.weight_kg) as weight
    FROM production_records pr
    JOIN work_orders w ON pr.work_id = w.work_id
    JOIN slaughter_batches sb ON w.faena_id = sb.faena_id
    GROUP BY sb.date
    ORDER BY sb.date ASC
  `);

  const kosherQuery = await query(`
    SELECT 
      k.family as name,
      SUM(pr.weight_kg) as value
    FROM production_records pr
    JOIN products p ON pr.item_id = p.item_id
    JOIN kosher_registry k ON p.kosher_type = k.kosher_type
    GROUP BY k.family
  `);

  const factoryQuery = await query(`
    SELECT 
      f.name,
      SUM(pr.weight_kg) as production
    FROM production_records pr
    JOIN work_orders w ON pr.work_id = w.work_id
    JOIN factories f ON w.factory_id = f.factory_id
    GROUP BY f.name
  `);

  return {
    kpi: kpiQuery.rows[0] || { total_weight: 0, total_boxes: 0, total_heads: 0, yield_percentage: 0 },
    trend: trendQuery.rows.map((row: any) => ({ ...row, weight: Number(row.weight) })),
    kosher: kosherQuery.rows.map((row: any) => ({ ...row, value: Number(row.value) })),
    factory: factoryQuery.rows.map((row: any) => ({ ...row, production: Number(row.production) }))
  };
}

// --- רכיב התצוגה הראשי ---
export default async function Dashboard() {
  const data = await getDashboardData();

  const KpiCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        <p className="text-xs text-slate-500 mt-2">{sub}</p>
      </div>
      <div className={`p-4 rounded-full bg-opacity-20 ${color}`}>
        <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  return (
    // השינוי הוא כאן: השתמשנו ב-div פשוט במקום main
    <div className="p-8"> 
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          לוח בקרה ראשי (Executive Overview)
        </h1>
        <p className="text-slate-400 mt-2">מבט על נתוני הייצור בכל המפעלים</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="סה״כ ייצור (ק״ג)" value={Number(data.kpi.total_weight).toLocaleString()} sub="משקל נטו ארוז" icon={Scale} color="bg-blue-500 text-blue-500" />
        <KpiCard title="אחוז תשואה (Yield)" value={`${data.kpi.yield_percentage}%`} sub="יחס כניסה מול יציאה" icon={Activity} color="bg-green-500 text-green-500" />
        <KpiCard title="ארגזים מוכנים" value={Number(data.kpi.total_boxes).toLocaleString()} sub="סה״כ קרטונים במלאי" icon={Package} color="bg-purple-500 text-purple-500" />
        <KpiCard title="ראשים שנשחטו" value={Number(data.kpi.total_heads).toLocaleString()} sub="בקר שנכנס לתהליך" icon={Beef} color="bg-orange-500 text-orange-500" />
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-slate-200">מגמת ייצור יומית (ק״ג)</h3>
          <div className="h-[300px] w-full">
            <TrendChart data={data.trend} />
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-slate-200">פילוח לפי משפחת כשרות</h3>
          <div className="h-[300px] w-full flex justify-center items-center">
            <KosherPieChart data={data.kosher} />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-slate-200">ביצועים לפי מפעל (Total Production)</h3>
          <div className="h-[250px] w-full">
            <FactoryBarChart data={data.factory} />
          </div>
        </div>

      </div>
    </div>
  );
}