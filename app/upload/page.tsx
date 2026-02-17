'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileType, 
  Database,
  History
} from 'lucide-react';

// --- סוגי קבצים מותרים ---
const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls']
};

export default function UploadPage() {
  // State לניהול הקובץ והתהליך
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'ready' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  // רפרנס לאינפוט הנסתר
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- פונקציות עזר ---

  const validateFile = (selectedFile: File) => {
    setStatus('validating');
    setErrorMessage('');
    
    // סימולציה של בדיקת קובץ (השהיה קצרה)
    setTimeout(() => {
      // 1. בדיקת סוג קובץ
      const isValidType = 
        selectedFile.name.endsWith('.csv') || 
        selectedFile.name.endsWith('.xlsx') || 
        selectedFile.name.endsWith('.xls');

      if (!isValidType) {
        setStatus('error');
        setErrorMessage('סוג קובץ לא נתמך. אנא העלה קובץ Excel או CSV בלבד.');
        return;
      }

      // 2. בדיקת גודל (למשל עד 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setStatus('error');
        setErrorMessage('הקובץ גדול מדי (מקסימום 10MB).');
        return;
      }

      // הכל תקין
      setStatus('ready');
    }, 1500); // שניה וחצי של "בדיקה"
  };

  const handleFileSelect = (newFile: File) => {
    setFile(newFile);
    setUploadProgress(0);
    validateFile(newFile);
  };

  // --- Drag & Drop Handlers ---

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  }, []);

  // --- Upload Handler ---

  const handleUpload = () => {
    if (!file || status !== 'ready') return;

    setStatus('uploading');
    
    // סימולציה של העלאה לדאטה בייס
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setStatus('success');
        // כאן בעתיד תהיה קריאה אמיתית ל-API
      }
    }, 300);
  };

  const resetUpload = () => {
    setFile(null);
    setStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- פורמט גודל קובץ ---
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* כותרת */}
      <div className="relative flex items-center justify-center mt-4">
         <div className="absolute left-0 right-0 h-px bg-slate-200 -z-10"></div>
         <h2 className="text-3xl font-black text-slate-800 bg-slate-50 px-6">העלאת קבצים</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* צד ימין: אזור העלאה */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Dropzone */}
          {!file || status === 'idle' ? (
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
                }
              `}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".csv, .xlsx, .xls"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              />
              
              <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <UploadCloud size={40} />
              </div>
              
              <h3 className="text-lg font-bold text-slate-700">לחץ להעלאה או גרור לכאן</h3>
              <p className="text-sm text-slate-400 mt-2">תומך בקבצי Excel (.xlsx) או CSV</p>
              <p className="text-xs text-slate-300 mt-1">עד 10MB לקובץ</p>
            </div>
          ) : (
            
            // 2. File Status Card (כשנבחר קובץ)
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
              
              {/* כפתור ביטול/סגירה */}
              {status !== 'uploading' && status !== 'success' && (
                <button onClick={resetUpload} className="absolute top-4 left-4 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-lg ${
                  status === 'error' ? 'bg-red-50 text-red-600' :
                  status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <FileSpreadsheet size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-800">{file.name}</h4>
                  <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                </div>
              </div>

              {/* אזור סטטוס דינמי */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                
                {/* מצב 1: בדיקת תקינות */}
                {status === 'validating' && (
                  <div className="flex items-center gap-3 text-blue-600">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="font-medium text-sm">מבצע בדיקת תקינות מבנה הקובץ...</span>
                  </div>
                )}

                {/* מצב 2: שגיאה */}
                {status === 'error' && (
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle size={18} />
                    <span className="font-medium text-sm">{errorMessage}</span>
                  </div>
                )}

                {/* מצב 3: תקין ומוכן */}
                {status === 'ready' && (
                  <div className="flex items-center gap-3 text-emerald-600">
                    <CheckCircle2 size={18} />
                    <span className="font-medium text-sm">הקובץ תקין ומוכן להעלאה.</span>
                  </div>
                )}

                {/* מצב 4: מעלה... */}
                {status === 'uploading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>מעלה לדאטה בייס...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {/* מצב 5: הצלחה */}
                {status === 'success' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-emerald-600">
                      <CheckCircle2 size={18} />
                      <span className="font-bold text-sm">הנתונים נקלטו בהצלחה!</span>
                    </div>
                    <p className="text-xs text-slate-500 mr-7">
                      נוספו 128 רשומות חדשות למערכת. ניתן לראות אותן במסך נתוני ייצור.
                    </p>
                    <button 
                      onClick={resetUpload}
                      className="mt-2 mr-7 text-sm text-blue-600 font-medium hover:underline w-fit"
                    >
                      העלה קובץ נוסף
                    </button>
                  </div>
                )}
              </div>

              {/* כפתור פעולה ראשי */}
              {status === 'ready' && (
                <button 
                  onClick={handleUpload}
                  className="mt-6 w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <Database size={18} />
                  העלה נתונים למערכת
                </button>
              )}

            </div>
          )}
        </div>

        {/* צד שמאל: היסטוריה והנחיות */}
        <div className="space-y-6">
          
          {/* הנחיות */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
            <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <FileType size={18}/> הנחיות למבנה קובץ
            </h4>
            <ul className="space-y-2 text-sm text-blue-900/70 list-disc list-inside">
              <li>חובה לכלול עמודת <strong>תאריך</strong> בפורמט DD/MM/YYYY.</li>
              <li>עמודת <strong>משקל</strong> חייבת להיות מספר בלבד (ללא "ק״ג").</li>
              <li>שדות חובה: מק"ט, שם מוצר, אצווה.</li>
              <li>קבצי CSV חייבים להיות בקידוד UTF-8.</li>
            </ul>
          </div>

          {/* היסטוריה קצרה (דמו) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <History size={18}/> העלאות אחרונות
            </h4>
            <div className="space-y-4">
              <HistoryItem name="production_feb_14.xlsx" date="היום, 08:30" status="success" />
              <HistoryItem name="shipping_data_v2.csv" date="אתמול, 16:45" status="success" />
              <HistoryItem name="errors_log.xlsx" date="12/02/2026" status="failed" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// --- רכיב עזר להיסטוריה ---
function HistoryItem({ name, date, status }: { name: string, date: string, status: 'success'|'failed' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        <div>
          <p className="font-medium text-slate-700 truncate max-w-[120px]" title={name}>{name}</p>
          <p className="text-xs text-slate-400">{date}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded ${
        status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      }`}>
        {status === 'success' ? 'נקלט' : 'נכשל'}
      </span>
    </div>
  );
}