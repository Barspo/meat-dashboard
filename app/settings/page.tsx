'use client';

import { useState } from 'react';
import { 
  User, 
  Users, 
  Factory, 
  Package, 
  Scroll, 
  Briefcase, 
  Lock, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle,
  CheckCircle2,
  Shield,
  Ban,
  X
} from 'lucide-react';

// --- סוגי נתונים (Types) ---
type UserRole = 'admin' | 'viewer';

interface User { id: string; name: string; email: string; role: UserRole; lastLogin: string; }
interface Factory { id: string; name: string; location: string; manager: string; }
interface Product { id: string; name: string; barcode: string; weight: number; department: string; }
interface Kosher { id: string; type: string; supervisor: string; }
interface Customer { id: string; name: string; contact: string; phone: string; }

// --- נתוני דמו (MOCK DATA) ---
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'ישראל ישראלי', email: 'israel@meatpro.co.il', role: 'admin', lastLogin: '15/02/2026' },
  { id: 'u2', name: 'דני דין', email: 'dani@meatpro.co.il', role: 'viewer', lastLogin: '10/02/2026' },
];

const MOCK_FACTORIES: Factory[] = [
  { id: 'f1', name: 'מפעל צפון (חיפה)', location: 'אזור תעשייה מבוא כרמל', manager: 'יוסי כהן' },
  { id: 'f2', name: 'מפעל דרום (באר שבע)', location: 'עמק שרה', manager: 'אבי לוי' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'צלעות עגל (Ribeye)', barcode: '7290001', weight: 1.2, department: 'פירוק' },
  { id: 'p2', name: 'סינטה (Sirloin)', barcode: '7290002', weight: 0.9, department: 'פירוק' },
];

const MOCK_KOSHER: Kosher[] = [
  { id: 'k1', type: 'חלק (בית יוסף)', supervisor: 'הרב מחפוד' },
  { id: 'k2', type: 'כשר (רבנות)', supervisor: 'הרבנות הראשית' },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'שופרסל', contact: 'רונית', phone: '050-1111111' },
  { id: 'c2', name: 'רמי לוי', contact: 'מוטי', phone: '050-2222222' },
];

// --- קבועים לתפריט ---
const MENU_ITEMS = [
  { id: 'profile', label: 'פרופיל אישי', icon: User, role: 'all' },
  { id: 'users', label: 'ניהול משתמשים', icon: Users, role: 'admin' },
  { id: 'factories', label: 'ניהול מפעלים', icon: Factory, role: 'admin' },
  { id: 'products', label: 'ניהול מוצרים', icon: Package, role: 'admin' },
  { id: 'kosher', label: 'סוגי כשרות', icon: Scroll, role: 'admin' },
  { id: 'customers', label: 'ניהול לקוחות', icon: Briefcase, role: 'admin' },
];

export default function SettingsPage() {
  // State לסימולציית תפקיד (כדי שתוכל לבדוק את המערכת)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');
  
  // State לניהול התצוגה
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* כפתור דמו להחלפת תפקיד (למחיקה בייצור) */}
      <div className="absolute top-4 left-6 z-10">
        <button 
          onClick={() => {
            setCurrentUserRole(prev => prev === 'admin' ? 'viewer' : 'admin');
            setActiveTab('profile'); // איפוס לפרופיל במעבר תפקיד
          }}
          className="text-xs bg-slate-800 text-white px-3 py-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
        >
          מצב נוכחי: {currentUserRole === 'admin' ? 'מנהל מערכת' : 'צופה בלבד'} (לחץ להחלפה)
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-full gap-6">
        
        {/* --- תפריט צד (ניווט הגדרות) --- */}
        <aside className="w-full md:w-64 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">הגדרות מערכת</h2>
            <p className="text-xs text-slate-500">ניהול נתונים והרשאות</p>
          </div>
          <nav className="p-2 space-y-1">
            {MENU_ITEMS.map((item) => {
              // הסתרת פריטים אם אין הרשאה
              if (item.role === 'admin' && currentUserRole !== 'admin') return null;

              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* --- תוכן ראשי (מתחלף) --- */}
        <main className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-y-auto">
          
          {/* תצוגה 1: פרופיל אישי */}
          {activeTab === 'profile' && <ProfileSettings />}

          {/* תצוגה 2: ניהול משתמשים (רק למנהל) */}
          {activeTab === 'users' && currentUserRole === 'admin' && <UsersManagement />}

          {/* תצוגה 3: ניהול מפעלים */}
          {activeTab === 'factories' && currentUserRole === 'admin' && (
            <GenericTableManagement 
              title="ניהול מפעלים" 
              data={MOCK_FACTORIES} 
              columns={[
                { key: 'id', label: 'מזהה (ID)', locked: true },
                { key: 'name', label: 'שם המפעל', locked: false },
                { key: 'location', label: 'כתובת/מיקום', locked: false },
                { key: 'manager', label: 'מנהל מפעל', locked: false },
              ]}
              cantDeleteIds={['f1']} // סימולציה: אי אפשר למחוק את מפעל f1 כי יש לו נתונים
            />
          )}

          {/* תצוגה 4: ניהול מוצרים */}
          {activeTab === 'products' && currentUserRole === 'admin' && (
            <GenericTableManagement 
              title="ניהול מוצרים" 
              data={MOCK_PRODUCTS} 
              columns={[
                { key: 'id', label: 'מקט (ID)', locked: true },
                { key: 'barcode', label: 'ברקוד', locked: true }, // נעול!
                { key: 'name', label: 'שם מוצר', locked: false },
                { key: 'department', label: 'מחלקה', locked: false },
                { key: 'weight', label: 'משקל בסיס', locked: false },
              ]}
              cantDeleteIds={['p1']}
            />
          )}

           {/* תצוגה 5: סוגי כשרות */}
           {activeTab === 'kosher' && currentUserRole === 'admin' && (
            <GenericTableManagement 
              title="סוגי כשרות" 
              data={MOCK_KOSHER} 
              columns={[
                { key: 'id', label: 'מזהה', locked: true },
                { key: 'type', label: 'סוג כשרות', locked: false },
                { key: 'supervisor', label: 'גוף משגיח', locked: false },
              ]}
              cantDeleteIds={['k1']}
            />
          )}

          {/* תצוגה 6: ניהול לקוחות */}
          {activeTab === 'customers' && currentUserRole === 'admin' && (
            <GenericTableManagement 
              title="ניהול לקוחות" 
              data={MOCK_CUSTOMERS} 
              columns={[
                { key: 'id', label: 'מספר לקוח', locked: true },
                { key: 'name', label: 'שם לקוח', locked: false },
                { key: 'contact', label: 'איש קשר', locked: false },
                { key: 'phone', label: 'טלפון', locked: false },
              ]}
              cantDeleteIds={[]}
            />
          )}

        </main>
      </div>
    </div>
  );
}

// ============================================================================
// --- קומפוננטות משנה (Views) ---
// ============================================================================

// 1. הגדרות פרופיל אישי
function ProfileSettings() {
  return (
    <div className="max-w-xl">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <User size={24} className="text-blue-600"/> פרופיל אישי
      </h3>
      
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">שם מלא</label>
            <input type="text" defaultValue="ישראל ישראלי" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">אימייל</label>
            <input type="email" defaultValue="israel@meatpro.co.il" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Lock size={16} /> שינוי סיסמה
          </h4>
          <div className="space-y-4">
             <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">סיסמה נוכחית</label>
              <input type="password" placeholder="••••••••" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
             <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">סיסמה חדשה</label>
              <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button type="button" className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Save size={16} /> שמור שינויים
          </button>
        </div>
      </form>
    </div>
  );
}

// 2. ניהול משתמשים (ספציפי בגלל שדה ה-Role)
function UsersManagement() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [isEditing, setIsEditing] = useState<string | null>(null); // ID של המשתמש בעריכה

  const handleDelete = (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users size={24} className="text-blue-600"/> ניהול משתמשים
        </h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus size={16} /> הוסף משתמש
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">שם מלא</th>
              <th className="px-4 py-3">אימייל</th>
              <th className="px-4 py-3">תפקיד</th>
              <th className="px-4 py-3">כניסה אחרונה</th>
              <th className="px-4 py-3 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role === 'admin' ? 'מנהל מערכת' : 'צופה'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{user.lastLogin}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="ערוך">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="מחק">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 3. רכיב ניהול טבלאות גנרי (לשימוש חוזר במפעלים, מוצרים, כשרות, לקוחות)
interface GenericTableProps {
  title: string;
  data: any[];
  columns: { key: string; label: string; locked: boolean }[];
  cantDeleteIds: string[]; // מזהים שאסור למחוק
}

function GenericTableManagement({ title, data: initialData, columns, cantDeleteIds }: GenericTableProps) {
  const [data, setData] = useState(initialData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // מחיקה
  const handleDelete = (id: string) => {
    if (cantDeleteIds.includes(id)) {
      alert('שגיאה: לא ניתן למחוק רשומה זו מכיוון שהיא מקושרת לנתונים קיימים במערכת.');
      return;
    }
    if (confirm('האם אתה בטוח? פעולה זו תשפיע על הדאטה-בייס.')) {
      setData(prev => prev.filter(item => item.id !== id));
    }
  };

  // תחילת עריכה
  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditFormData(item);
  };

  // שמירת עריכה
  const saveEdit = () => {
    setData(prev => prev.map(item => item.id === editingId ? editFormData : item));
    setEditingId(null);
  };

  // שינוי בשדות
  const handleInputChange = (key: string, value: string) => {
    setEditFormData({ ...editFormData, [key]: value });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Shield size={24} className="text-blue-600"/> {title}
        </h3>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> הוסף חדש
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              {columns.map(col => <th key={col.key} className="px-4 py-3">{col.label}</th>)}
              <th className="px-4 py-3 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(item => {
              const isEditing = editingId === item.id;
              
              return (
                <tr key={item.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editFormData[col.key]}
                          disabled={col.locked} // נעילת שדות מפתח
                          onChange={(e) => handleInputChange(col.key, e.target.value)}
                          className={`w-full px-2 py-1 rounded border ${col.locked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-200'}`}
                        />
                      ) : (
                        <span className={col.locked ? 'font-mono text-slate-500' : 'text-slate-800'}>
                          {item[col.key]}
                        </span>
                      )}
                    </td>
                  ))}
                  
                  {/* עמודת פעולות */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        // כפתורי שמירה/ביטול במצב עריכה
                        <>
                          <button onClick={saveEdit} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded"><CheckCircle2 size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={18} /></button>
                        </>
                      ) : (
                        // כפתורי עריכה/מחיקה במצב רגיל
                        <>
                          <button onClick={() => startEdit(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="ערוך">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className={`p-1 rounded transition-colors ${cantDeleteIds.includes(item.id) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                            title={cantDeleteIds.includes(item.id) ? "לא ניתן למחיקה (מקושר)" : "מחק"}
                          >
                            {cantDeleteIds.includes(item.id) ? <Ban size={16} /> : <Trash2 size={16} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* הערה למשתמש */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
        <AlertCircle size={14} className="mt-0.5 shrink-0"/>
        <p>שים לב: שדות המסומנים באפור (כגון מזהה וברקוד) הינם שדות מפתח ולא ניתן לשנותם לאחר היצירה. מחיקת רשומות אפשרית רק במידה ואין נתונים היסטוריים המקושרים אליהן.</p>
      </div>
    </div>
  );
}