export const dynamic = 'force-dynamic'; // חובה! מבטיח שהנתונים תמיד טריים מהדאטה בייס
import { query } from '@/lib/db';

// הגדרת מבנה ההתראה
type Alert = {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: string;
};

async function getRealTimeAlerts() {
  const alerts: Alert[] = []; // מתחילים רשימה ריקה לחלוטין

  try {
    // --- בדיקה 1: נתוני ייצור יתומים (ללא שיוך לעבודה) ---
    // מחפש בטבלת production_records שורות שאין להן work_id או שה-work_id שלהן לא קיים בטבלת work_orders
    const orphansQuery = await query(`
      SELECT COUNT(*) as count 
      FROM production_records 
      WHERE work_id IS NULL 
         OR work_id NOT IN (SELECT work_id FROM work_orders)
    `);
    
    const orphanCount = parseInt(orphansQuery.rows[0]?.count || '0');

    if (orphanCount > 0) {
      alerts.push({
        id: 'orphans_alert',
        severity: 'high',
        title: 'נתוני ייצור ללא שיוך',
        message: `זוהו ${orphanCount} רשומות ייצור (קרטונים/יחידות) שלא משויכות להזמנת עבודה קיימת.`,
        action: 'שייך ידנית'
      });
    }

    // --- בדיקה 2: הזמנות עבודה לא שלמות ---
    // מחפש בטבלת work_orders שורות שאין להן קישור לשחיטה (faena) או פירוק (debone)
    const incompleteOrdersQuery = await query(`
      SELECT work_id 
      FROM work_orders 
      WHERE faena_id IS NULL OR debone_id IS NULL
    `);

    incompleteOrdersQuery.rows.forEach((order: any) => {
      alerts.push({
        id: `missing_data_${order.work_id}`,
        severity: 'medium',
        title: 'חסרים נתוני שחיטה/פירוק',
        message: `הזמנת עבודה מס' ${order.work_id} פתוחה אך חסרים לה נתוני מקור (Faena ID או Debone ID).`,
        action: 'השלם נתונים'
      });
    });

    // --- בדיקה 3: פערים בין שחיטה לפירוק (בדיקת האיכות הקריטית) ---
    // משווה: (כמות ראשים * 2) מול (כמות רבעים שנכנסו לפירוק)
    const gapsQuery = await query(`
      SELECT 
        sb.date,
        sb.faena_id,
        (sb.cow_count + sb.bull_count) as total_heads,
        (COALESCE(db.halak_quarters_in, 0) + COALESCE(db.kosher_quarters_in, 0)) as total_quarters
      FROM slaughter_batches sb
      JOIN debone_batches db ON sb.faena_id = db.faena_id
    `);

    gapsQuery.rows.forEach((row: any) => {
      const expectedQuarters = row.total_heads * 2; // כל ראש = 2 רבעים קדמיים
      const actualQuarters = parseInt(row.total_quarters);
      
      // אם יש פער כלשהו (אפילו רבע אחד)
      if (expectedQuarters !== actualQuarters) {
        const diff = Math.abs(expectedQuarters - actualQuarters);
        alerts.push({
          id: `gap_alert_${row.faena_id}`,
          severity: 'critical', // חמור מאוד
          title: 'חריגה: פער בין שחיטה לפירוק',
          message: `בתאריך ${new Date(row.date).toLocaleDateString('he-IL')}: נשחטו ${row.total_heads} ראשים (צפי ל-${expectedQuarters} רבעים), אך נכנסו לפירוק ${actualQuarters}. פער של ${diff} רבעים!`,
          action: 'חקירה מיידית'
        });
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    // רק במקרה של קריסה טכנית של הדאטה בייס נוסיף הודעת שגיאה
    alerts.push({
      id: 'db_error',
      severity: 'low',
      title: 'שגיאת התחברות',
      message: 'לא ניתן לקרוא נתונים מהשרת כרגע.',
      action: 'נסה שוב'
    });
  }

  return alerts;
}

export default async function NotificationsPage() {
  const alerts = await getRealTimeAlerts();

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100" dir="rtl">
      <h1 className="text-3xl font-bold text-red-400 mb-2">מרכז התראות ובקרה</h1>
      <p className="text-slate-400 mb-8">ניטור חריגות בזמן אמת (Live Data Only)</p>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          // מצב "הכל תקין" - יוצג רק אם המערכת נקייה מבעיות
          <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-xl text-center flex flex-col items-center justify-center">
            <span className="text-6xl mb-4">✅</span>
            <h3 className="text-2xl font-bold text-green-400">המערכת תקינה לחלוטין</h3>
            <p className="text-slate-400 mt-2">לא נמצאו חריגות, פערים או נתונים יתומים.</p>
          </div>
        ) : (
          // רשימת ההתראות האמיתיות
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
}

// רכיב תצוגה לכרטיס התראה בודד
function AlertCard({ alert }: { alert: Alert }) {
  const styles = {
    critical: "bg-red-900/20 border-red-500 text-red-100",
    high: "bg-orange-900/20 border-orange-500 text-orange-100",
    medium: "bg-yellow-900/20 border-yellow-500 text-yellow-100",
    low: "bg-blue-900/20 border-blue-500 text-blue-100",
  };

  const icons = {
    critical: "🚨",
    high: "⚠️",
    medium: "📝",
    low: "ℹ️"
  };

  return (
    <div className={`p-4 rounded-xl border-r-4 ${styles[alert.severity]} shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
      <div className="flex gap-4 items-start">
        <div className="text-2xl mt-1">{icons[alert.severity]}</div>
        <div>
          <h3 className="font-bold text-lg">{alert.title}</h3>
          <p className="opacity-90 text-sm">{alert.message}</p>
        </div>
      </div>
      <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm border border-slate-600 transition-colors whitespace-nowrap">
        {alert.action}
      </button>
    </div>
  );
}