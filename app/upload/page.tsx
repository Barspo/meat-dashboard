'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getFactories } from '@/app/actions/getProductionData';
import {
  previewSlaughter, uploadSlaughter,
  type SlaughterPreviewResult, type SlaughterUploadResult,
} from '@/app/actions/uploadSlaughterAction';
import {
  previewProduction, uploadProduction, getSeasons, getAvailableSlaughterBatches,
  type ProductionPreviewResult, type ProductionUploadResult, type SlaughterBatchOption,
} from '@/app/actions/uploadProductionAction';
import {
  Loader2, Upload, FileSpreadsheet, Beef, Package,
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, ArrowLeft,
  ChevronDown, RotateCcw, Home, Eye, Download, X,
} from 'lucide-react';
import { getSlaughterSampleFile, getProductionSampleFile } from '@/app/actions/getSampleFile';

// ---- Types ----
type UploadType = 'slaughter' | 'production';
type Step = 'type' | 'details' | 'link' | 'file' | 'preview' | 'result';

const SLAUGHTER_STEPS: { key: Step; label: string }[] = [
  { key: 'type', label: 'סוג דוח' },
  { key: 'details', label: 'פרטי העלאה' },
  { key: 'file', label: 'העלאת קובץ' },
  { key: 'preview', label: 'תצוגה מקדימה' },
  { key: 'result', label: 'תוצאה' },
];

const PRODUCTION_STEPS: { key: Step; label: string }[] = [
  { key: 'type', label: 'סוג דוח' },
  { key: 'details', label: 'פרטי העלאה' },
  { key: 'link', label: 'שיוך שחיטה' },
  { key: 'file', label: 'העלאת קובץ' },
  { key: 'preview', label: 'תצוגה מקדימה' },
  { key: 'result', label: 'תוצאה' },
];

export default function UploadPage() {
  // Wizard state
  const [step, setStep] = useState<Step>('type');
  const [uploadType, setUploadType] = useState<UploadType | null>(null);

  // Details state
  const [factories, setFactories] = useState<{ id: string; name: string }[]>([]);
  const [seasons, setSeasonsList] = useState<{ id: number; name: string }[]>([]);
  const [factoryId, setFactoryId] = useState<string>('');
  const [productionDate, setProductionDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [seasonId, setSeasonId] = useState<string>('');

  // Link step state (production only)
  const [availableBatches, setAvailableBatches] = useState<SlaughterBatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // File state
  const [fileName, setFileName] = useState('');
  const [base64, setBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [slaughterPreview, setSlaughterPreview] = useState<SlaughterPreviewResult | null>(null);
  const [productionPreview, setProductionPreview] = useState<ProductionPreviewResult | null>(null);

  // Result state
  const [slaughterResult, setSlaughterResult] = useState<SlaughterUploadResult | null>(null);
  const [productionResult, setProductionResult] = useState<ProductionUploadResult | null>(null);

  // Load factories + seasons on mount
  useEffect(() => {
    async function load() {
      const [f, s] = await Promise.all([getFactories(), getSeasons()]);
      setFactories(f);
      setSeasonsList(s);
    }
    load();
  }, []);

  const STEPS = uploadType === 'production' ? PRODUCTION_STEPS : SLAUGHTER_STEPS;
  const stepIndex = STEPS.findIndex(s => s.key === step);

  // ---- Handlers ----
  const handleTypeSelect = (type: UploadType) => {
    setUploadType(type);
    setStep('details');
  };

  const canAdvanceDetails = factoryId !== '' && (uploadType === 'slaughter' || productionDate !== '');

  const handleDetailsNext = async () => {
    if (uploadType === 'production') {
      setLoadingBatches(true);
      setSelectedBatchId(null);
      const batches = await getAvailableSlaughterBatches(Number(factoryId));
      setAvailableBatches(batches);
      setLoadingBatches(false);
      setStep('link');
    } else {
      setStep('file');
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setError('');
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      setBase64(b64);

      // Call preview
      if (uploadType === 'slaughter') {
        const preview = await previewSlaughter(b64);
        setSlaughterPreview(preview);
        setProductionPreview(null);
      } else {
        const preview = await previewProduction(b64);
        setProductionPreview(preview);
        setSlaughterPreview(null);
      }
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'שגיאה בקריאת הקובץ');
    } finally {
      setLoading(false);
    }
  }, [uploadType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    setLoading(true);
    setError('');
    try {
      if (uploadType === 'slaughter') {
        const result = await uploadSlaughter(Number(factoryId), base64, fileName);
        setSlaughterResult(result);
        setProductionResult(null);
      } else {
        const result = await uploadProduction(
          Number(factoryId),
          productionDate,
          selectedBatchId,
          base64,
          fileName
        );
        setProductionResult(result);
        setSlaughterResult(null);
      }
      setStep('result');
    } catch (e: any) {
      setError(e.message || 'שגיאה בהעלאת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep('type');
    setUploadType(null);
    setFactoryId('');
    setProductionDate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    setSeasonId('');
    setAvailableBatches([]);
    setSelectedBatchId(null);
    setFileName('');
    setBase64('');
    setError('');
    setSlaughterPreview(null);
    setProductionPreview(null);
    setSlaughterResult(null);
    setProductionResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">העלאת נתונים</h1>
        <p className="text-sm text-slate-400 mt-1">העלאת דוחות שחיטה וייצור מקבצי אקסל</p>
      </div>

      {/* Step Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < stepIndex ? 'bg-blue-600 text-white' :
                  i === stepIndex ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < stepIndex ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 ${
                  i <= stepIndex ? 'text-blue-700' : 'text-slate-400'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-[-14px] transition-colors ${
                  i < stepIndex ? 'bg-blue-500' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="animate-in fade-in duration-300">
        {step === 'type' && <StepType onSelect={handleTypeSelect} />}

        {step === 'details' && (
          <StepDetails
            uploadType={uploadType!}
            factories={factories}
            seasons={seasons}
            factoryId={factoryId}
            productionDate={productionDate}
            seasonId={seasonId}
            onFactoryChange={setFactoryId}
            onDateChange={setProductionDate}
            onSeasonChange={setSeasonId}
            onBack={() => { setStep('type'); setUploadType(null); }}
            onNext={handleDetailsNext}
            canAdvance={canAdvanceDetails}
            loading={loadingBatches}
          />
        )}

        {step === 'link' && (
          <StepLink
            batches={availableBatches}
            selectedBatchId={selectedBatchId}
            onSelect={setSelectedBatchId}
            onBack={() => setStep('details')}
            onNext={() => setStep('file')}
          />
        )}

        {step === 'file' && (
          <StepFile
            uploadType={uploadType!}
            fileName={fileName}
            loading={loading}
            error={error}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDrop={handleDrop}
            onBack={() => setStep(uploadType === 'production' ? 'link' : 'details')}
          />
        )}

        {step === 'preview' && (
          <StepPreview
            uploadType={uploadType!}
            slaughterPreview={slaughterPreview}
            productionPreview={productionPreview}
            loading={loading}
            error={error}
            onUpload={handleUpload}
            onBack={() => { setStep('file'); setFileName(''); setBase64(''); }}
          />
        )}

        {step === 'result' && (
          <StepResult
            uploadType={uploadType!}
            slaughterResult={slaughterResult}
            productionResult={productionResult}
            onReset={resetWizard}
          />
        )}
      </div>
    </div>
  );
}

// ==================== STEP COMPONENTS ====================

function StepType({ onSelect }: { onSelect: (t: UploadType) => void }) {
  const [sampleModal, setSampleModal] = useState<UploadType | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-700 text-center">בחר סוג דוח להעלאה</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <button
            onClick={() => onSelect('slaughter')}
            className="bg-white border-2 border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:shadow-lg transition-all group flex-1"
          >
            <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-100 transition-colors">
              <Beef size={32} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">דוח שחיטה</h3>
            <p className="text-sm text-slate-400">העלאת נתוני שחיטה יומיים - ראשים, כשרות ופחת</p>
          </button>
          <button
            onClick={() => setSampleModal('slaughter')}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <Eye size={14} /> צפה בדוגמת קובץ שחיטה
          </button>
        </div>

        <div className="flex flex-col">
          <button
            onClick={() => onSelect('production')}
            className="bg-white border-2 border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:shadow-lg transition-all group flex-1"
          >
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
              <Package size={32} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">דוח ייצור / קיצוב</h3>
            <p className="text-sm text-slate-400">העלאת נתוני ייצור - כניסה, מוצרים ומשקלים</p>
          </button>
          <button
            onClick={() => setSampleModal('production')}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <Eye size={14} /> צפה בדוגמת קובץ ייצור
          </button>
        </div>
      </div>

      {sampleModal && (
        <SampleReportModal
          type={sampleModal}
          onClose={() => setSampleModal(null)}
        />
      )}
    </div>
  );
}

function StepDetails({
  uploadType, factories, seasons, factoryId, productionDate, seasonId,
  onFactoryChange, onDateChange, onSeasonChange, onBack, onNext, canAdvance, loading,
}: {
  uploadType: UploadType;
  factories: { id: string; name: string }[];
  seasons: { id: number; name: string }[];
  factoryId: string;
  productionDate: string;
  seasonId: string;
  onFactoryChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <h2 className="text-lg font-bold text-slate-700">
        פרטי העלאה - {uploadType === 'slaughter' ? 'דוח שחיטה' : 'דוח ייצור'}
      </h2>

      <div className="space-y-4">
        {/* Factory */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            מפעל <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={factoryId}
              onChange={e => onFactoryChange(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 pr-4 pl-10 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">בחר מפעל...</option>
              {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Production-only fields */}
        {uploadType === 'production' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                תאריך ייצור <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={e => onDateChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">עונה (אופציונלי)</label>
              <div className="relative">
                <select
                  value={seasonId}
                  onChange={e => onSeasonChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 pr-4 pl-10 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">ללא</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight size={16} /> חזרה
        </button>
        <button
          onClick={onNext}
          disabled={!canAdvance || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'טוען...' : 'המשך'}
          {!loading && <ArrowLeft size={16} />}
        </button>
      </div>
    </div>
  );
}

function StepLink({
  batches, selectedBatchId, onSelect, onBack, onNext,
}: {
  batches: SlaughterBatchOption[];
  selectedBatchId: number | null;
  onSelect: (id: number | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-700">שיוך לדוח שחיטה</h2>
        <p className="text-sm text-slate-400 mt-1">בחר את דוח השחיטה שממנו הגיע חומר הגלם לייצור זה</p>
      </div>

      {batches.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">אין דוחות שחיטה פנויים למפעל זה</p>
            <p className="text-xs text-amber-600 mt-1">ניתן להמשיך ללא שיוך — הדוח ישמר ללא קישור לשחיטה</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {batches.map(batch => (
            <button
              key={batch.id}
              onClick={() => onSelect(selectedBatchId === batch.id ? null : batch.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-right transition-all ${
                selectedBatchId === batch.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedBatchId === batch.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                }`}>
                  {selectedBatchId === batch.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-black text-slate-800">{batch.date}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    חלק: {batch.halak_count.toLocaleString()} | מוכשר: {batch.muchshar_count.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xl font-black text-slate-700">{batch.total_heads.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">ראשים</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedBatchId === null && batches.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">לא נבחר דוח שחיטה — ניתן להמשיך ולשייך מאוחר יותר</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight size={16} /> חזרה
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
        >
          המשך <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}

function StepFile({
  uploadType, fileName, loading, error, fileInputRef, onFileSelect, onDrop, onBack,
}: {
  uploadType: UploadType;
  fileName: string;
  loading: boolean;
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <h2 className="text-lg font-bold text-slate-700">
        העלאת קובץ - {uploadType === 'slaughter' ? 'דוח שחיטה' : 'דוח ייצור'}
      </h2>

      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 font-medium">מעבד את הקובץ...</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-600 mb-1">גרור קובץ לכאן או לחץ לבחירה</p>
            <p className="text-xs text-slate-400">קבצים נתמכים: .xlsx, .xls</p>
            {fileName && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
                <FileSpreadsheet size={16} />
                {fileName}
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight size={16} /> חזרה
        </button>
      </div>
    </div>
  );
}

function StepPreview({
  uploadType, slaughterPreview, productionPreview, loading, error, onUpload, onBack,
}: {
  uploadType: UploadType;
  slaughterPreview: SlaughterPreviewResult | null;
  productionPreview: ProductionPreviewResult | null;
  loading: boolean;
  error: string;
  onUpload: () => void;
  onBack: () => void;
}) {
  const isSlaughter = uploadType === 'slaughter';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-700">תצוגה מקדימה</h2>

        {/* Slaughter Preview */}
        {isSlaughter && slaughterPreview && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                {slaughterPreview.rows.length} שורות נמצאו
              </div>
              {slaughterPreview.errors.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">
                  {slaughterPreview.errors.length} שגיאות
                </div>
              )}
            </div>

            {/* Errors */}
            {slaughterPreview.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1">
                {slaughterPreview.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-orange-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">תאריך</th>
                    <th className="px-3 py-2">פרות</th>
                    <th className="px-3 py-2">שוורים</th>
                    <th className="px-3 py-2">סה&quot;כ</th>
                    <th className="px-3 py-2">חלק</th>
                    <th className="px-3 py-2">מוכשר</th>
                    <th className="px-3 py-2">פחת ריאות</th>
                    <th className="px-3 py-2">פחת פנים</th>
                    <th className="px-3 py-2">פחת חוץ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slaughterPreview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono">{row.date}</td>
                      <td className="px-3 py-2 tabular-nums">{row.cows_count}</td>
                      <td className="px-3 py-2 tabular-nums">{row.bulls_count}</td>
                      <td className="px-3 py-2 tabular-nums font-bold">{row.total_heads}</td>
                      <td className="px-3 py-2 tabular-nums">{row.halak_count}</td>
                      <td className="px-3 py-2 tabular-nums">{row.muchshar_count}</td>
                      <td className="px-3 py-2 tabular-nums">{row.waste_lungs}</td>
                      <td className="px-3 py-2 tabular-nums">{row.waste_inner}</td>
                      <td className="px-3 py-2 tabular-nums">{row.waste_outer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Production Preview */}
        {!isSlaughter && productionPreview && (
          <>
            {/* Header summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="רבעי חלק" value={productionPreview.header.halak_quarters_in} />
              <MiniStat label="רבעי מוכשר" value={productionPreview.header.kosher_quarters_in} />
              <MiniStat label='משקל חלק (ק"ג)' value={productionPreview.header.halak_weight_in_kg} />
              <MiniStat label='משקל מוכשר (ק"ג)' value={productionPreview.header.kosher_weight_in_kg} />
            </div>

            {/* Summary badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                {productionPreview.rows.length} מוצרים
              </div>
              {productionPreview.unknownItemIds.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">
                  {productionPreview.unknownItemIds.length} ברקודים לא ידועים
                </div>
              )}
              {productionPreview.errors.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">
                  {productionPreview.errors.length} שגיאות
                </div>
              )}
              {productionPreview.productionDate && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                  תאריך מזוהה: {productionPreview.productionDate}
                </div>
              )}
            </div>

            {/* Unknown barcodes warning */}
            {productionPreview.unknownItemIds.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-700 mb-2">
                  <AlertTriangle size={14} />
                  ברקודים לא מוכרים במערכת (ידולגו בהעלאה):
                </div>
                <div className="flex flex-wrap gap-2">
                  {productionPreview.unknownItemIds.map(id => (
                    <span key={id} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-mono">{id}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {productionPreview.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1">
                {productionPreview.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-orange-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            {/* Product table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">ברקוד</th>
                    <th className="px-3 py-2">יחידות</th>
                    <th className="px-3 py-2">קופסאות</th>
                    <th className="px-3 py-2">משקל (ק&quot;ג)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productionPreview.rows.map((row, i) => {
                    const isUnknown = productionPreview.unknownItemIds.includes(row.item_id);
                    return (
                      <tr key={i} className={isUnknown ? 'bg-orange-50/50' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-2 font-mono">
                          {row.item_id}
                          {isUnknown && <span className="mr-2 text-[10px] text-orange-600 font-bold">לא מוכר</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.units}</td>
                        <td className="px-3 py-2 tabular-nums">{row.boxes}</td>
                        <td className="px-3 py-2 tabular-nums font-medium">{row.weight_kg.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight size={16} /> חזרה
        </button>
        <button
          onClick={onUpload}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'מעלה...' : 'העלה נתונים'}
        </button>
      </div>
    </div>
  );
}

function StepResult({
  uploadType, slaughterResult, productionResult, onReset,
}: {
  uploadType: UploadType;
  slaughterResult: SlaughterUploadResult | null;
  productionResult: ProductionUploadResult | null;
  onReset: () => void;
}) {
  const isSlaughter = uploadType === 'slaughter';
  const result = isSlaughter ? slaughterResult : productionResult;
  const success = result?.success ?? false;
  const errors = result?.errors ?? [];
  const rowsInserted = result?.rowsInserted ?? 0;

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-2xl border-2 p-8 text-center ${
        success && errors.length === 0
          ? 'bg-blue-50 border-blue-200'
          : success
          ? 'bg-orange-50 border-orange-200'
          : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex justify-center mb-4">
          {success && errors.length === 0 ? (
            <CheckCircle2 size={48} className="text-blue-500" />
          ) : success ? (
            <AlertTriangle size={48} className="text-orange-500" />
          ) : (
            <AlertCircle size={48} className="text-orange-500" />
          )}
        </div>

        <h2 className={`text-2xl font-black mb-2 ${
          success && errors.length === 0 ? 'text-blue-800' :
          success ? 'text-orange-800' : 'text-orange-800'
        }`}>
          {success && errors.length === 0 ? 'ההעלאה הושלמה בהצלחה' :
           success ? 'ההעלאה הושלמה חלקית' : 'ההעלאה נכשלה'}
        </h2>

        <p className="text-sm opacity-70">
          {rowsInserted > 0 && `${rowsInserted} שורות נטענו בהצלחה`}
          {isSlaughter && slaughterResult && slaughterResult.rowsSkipped > 0 && ` | ${slaughterResult.rowsSkipped} שורות דולגו`}
        </p>

        {!isSlaughter && productionResult?.workOrderId && (
          <p className="text-xs mt-2 opacity-60">מספר הזמנת עבודה: {productionResult.workOrderId}</p>
        )}

        {!isSlaughter && productionResult && productionResult.unknownItemIds.length > 0 && (
          <div className="mt-4 bg-white/50 rounded-xl p-3 mx-auto max-w-md">
            <p className="text-xs font-bold text-orange-700 mb-2">ברקודים לא מוכרים (דולגו):</p>
            <div className="flex flex-wrap justify-center gap-2">
              {productionResult.unknownItemIds.map(id => (
                <span key={id} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-mono">{id}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Warnings list (slaughter mismatch) */}
      {isSlaughter && slaughterResult && slaughterResult.warnings && slaughterResult.warnings.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-1.5">
          <h3 className="text-sm font-bold text-amber-700 mb-2">אזהרות אי-התאמה ({slaughterResult.warnings.length}):</h3>
          {slaughterResult.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 space-y-1.5">
          <h3 className="text-sm font-bold text-orange-700 mb-2">פירוט שגיאות:</h3>
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-orange-600">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={16} />
          העלה קובץ נוסף
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
        >
          <Home size={16} />
          חזרה לדשבורד
        </Link>
      </div>
    </div>
  );
}

// ---- Sample Report Modal ----

function SampleReportModal({ type, onClose }: { type: UploadType; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const base64 = type === 'slaughter'
        ? await getSlaughterSampleFile()
        : await getProductionSampleFile();

      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'slaughter' ? 'sample_slaughter.xlsx' : 'sample_production.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {type === 'slaughter' ? 'מבנה קובץ שחיטה' : 'מבנה קובץ ייצור'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">הפורמט הנדרש להעלאה תקינה</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {type === 'slaughter' ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 font-medium">
                גיליון Excel עם עמודת כותרת בשורה הראשונה. כל שורה מייצגת יום שחיטה אחד.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      {['Date','Cows','Bulls','Halak','Muchshar','Treif','Waste Lungs','Waste Inner','Waste Outer'].map(h => (
                        <th key={h} className="px-3 py-2 font-bold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['2024-01-15','120','80','150','40','10','5','3','2'],
                      ['2024-01-16','100','70','130','30','10','4','3','3'],
                      ['2024-01-17','110','90','160','30','10','6','2','2'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 tabular-nums">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-700">הסברים:</p>
                <ul className="space-y-1 list-none">
                  <li><span className="font-bold text-slate-800">Date</span> — תאריך בפורמט YYYY-MM-DD</li>
                  <li><span className="font-bold text-slate-800">Cows / Bulls</span> — מספר פרות / שוורים</li>
                  <li><span className="font-bold text-slate-800">Halak / Muchshar</span> — כשרות חלק / מוכשר</li>
                  <li><span className="font-bold text-slate-800">Treif</span> — טריף (מחושב, לא נשמר)</li>
                  <li><span className="font-bold text-slate-800">Waste Lungs/Inner/Outer</span> — פחת ריאות / פנים / חוץ</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 font-medium">
                קובץ Excel בעל שני חלקים: כותרת עם נתוני כניסה, ואחר-כך טבלת מוצרים לפי ברקוד.
              </div>
              {/* Header section */}
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">חלק 1 — כותרת (שורות 1-5)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border border-slate-200 rounded-xl overflow-hidden">
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Date:','2024-01-15','',''],
                        ['Halak Weight (kg):','5000','',''],
                        ['Kosher Weight (kg):','3000','',''],
                        ['Halak Quarters:','40','',''],
                        ['Kosher Quarters:','24','',''],
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 font-bold text-slate-700">{row[0]}</td>
                          <td className="px-3 py-2 text-blue-700 font-mono">{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Products section */}
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">חלק 2 — מוצרים (מוורה 7 ואילך)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        {['EAN/Barcode','Units','Boxes','Weight (kg)'].map(h => (
                          <th key={h} className="px-3 py-2 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['7290000000001','50','5','250.5'],
                        ['7290000000002','30','3','180.0'],
                        ['7290000000003','20','2','95.0'],
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 tabular-nums">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-700">הסברים:</p>
                <ul className="space-y-1 list-none">
                  <li><span className="font-bold text-slate-800">Date</span> — תאריך ייצור (ניתן להשאיר ריק אם נבחר ידנית)</li>
                  <li><span className="font-bold text-slate-800">EAN/Barcode</span> — ברקוד המוצר (חייב להיות קיים במערכת)</li>
                  <li><span className="font-bold text-slate-800">Units / Boxes / Weight</span> — יחידות, קרטונים, משקל ק&quot;ג</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <p className="text-xs text-slate-400">הורד קובץ דוגמה מלא לדפדפן שלך</p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? 'מוריד...' : 'הורד קובץ דוגמה'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Helper Components ----

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</span>
      <span className="text-lg font-black text-slate-800">{value.toLocaleString()}</span>
    </div>
  );
}
