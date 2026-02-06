import { query } from '@/lib/db';
import PerformanceClient from './PerformanceClient';

export default async function PerformancePage() {
  // שליפת רשימת המפעלים מהדאטה-בייס (Server Side)
  // אנחנו עושים את זה כאן כדי שהדף ייטען מהר עם הרשימה מוכנה
  const result = await query('SELECT factory_id, name, country FROM factories ORDER BY name');
  const factories = result.rows;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          ביצועי מפעל (Factory Performance)
        </h1>
        <p className="text-slate-400 mt-2">ניתוח מעמיק לפי טווחי זמן ומפעלים</p>
      </div>
      
      {/* כאן אנחנו קוראים לרכיב הלקוח החכם שבנינו ומעבירים לו את המפעלים */}
      <PerformanceClient factories={factories} />
    </div>
  );
}