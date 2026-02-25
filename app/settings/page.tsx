'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Factory as FactoryIcon,
  Package,
  Shield,
  Users,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Search,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  getFactories, createFactory, updateFactory, Factory,
  getProducts, createProduct, updateProduct, Product,
  getKosherRegistry, createKosherEntry, updateKosherEntry, deleteKosherEntry, KosherEntry,
  getCustomers, createCustomer, updateCustomer, deleteCustomer, Customer,
  getSeasons, createSeason, updateSeason, deleteSeason, Season,
} from '@/app/actions/settingsActions';
import {
  previewProductsUpload, uploadProducts,
  ProductRowPreview, ProductsPreviewResult, ProductsUploadResult,
} from '@/app/actions/uploadProductsAction';
import { getProductsSampleFile } from '@/app/actions/getSampleFile';
import { LoadingState } from '@/components/ui/LoadingState';

type Tab = 'factories' | 'products' | 'kosher' | 'customers' | 'seasons';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('factories');
  const [loading, setLoading] = useState(true);

  const [factories, setFactories] = useState<Factory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kosherEntries, setKosherEntries] = useState<KosherEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [search, setSearch] = useState('');
  const [bulkProductOpen, setBulkProductOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tabs = [
    { key: 'factories' as Tab, label: 'מפעלים', icon: FactoryIcon, count: factories.length },
    { key: 'products' as Tab, label: 'מוצרים', icon: Package, count: products.length },
    { key: 'kosher' as Tab, label: 'רישום כשרות', icon: Shield, count: kosherEntries.length },
    { key: 'customers' as Tab, label: 'לקוחות', icon: Users, count: customers.length },
    { key: 'seasons' as Tab, label: 'עונות', icon: CalendarDays, count: seasons.length },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    const [f, p, k, c, s] = await Promise.all([getFactories(), getProducts(), getKosherRegistry(), getCustomers(), getSeasons()]);
    setFactories(f);
    setProducts(p);
    setKosherEntries(k);
    setCustomers(c);
    setSeasons(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ==================== FACTORIES TAB ====================
  const FactoriesTab = () => {
    const [form, setForm] = useState({ name: '', name_hebrew: '', country: '', factory_code: '' });
    useEffect(() => {
      if (editingItem) setForm({ name: editingItem.name || '', name_hebrew: editingItem.name_hebrew || '', country: editingItem.country || '', factory_code: editingItem.factory_code || '' });
      else setForm({ name: '', name_hebrew: '', country: '', factory_code: '' });
    }, []);
    const filtered = factories.filter(f => !search || (f.name || '').includes(search) || (f.name_hebrew || '').includes(search) || (f.country || '').includes(search) || (f.factory_code || '').includes(search));
    const handleSave = async () => {
      if (!form.name.trim()) return;
      setSaving(true); setErrorMsg('');
      // When editing, don't allow changing factory_code — pass only the editable fields
      const data = editingItem
        ? { name: form.name, name_hebrew: form.name_hebrew, country: form.country, factory_code: editingItem.factory_code }
        : form;
      const result = editingItem ? await updateFactory(editingItem.id, data) : await createFactory(form);
      setSaving(false);
      if (result.success) { setModalOpen(false); setEditingItem(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4">מדינה</th>
                <th className="px-6 py-4">קוד</th>
                <th className="px-6 py-4 w-20">עריכה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{f.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{f.name}</td>
                  <td className="px-6 py-3 text-slate-700">{f.name_hebrew}</td>
                  <td className="px-6 py-3 text-slate-600">{f.country}</td>
                  <td className="px-6 py-3 font-mono text-slate-600">{f.factory_code}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => { setEditingItem(f); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">לא נמצאו מפעלים</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מפעל' : 'הוספת מפעל'} onClose={() => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="מדינה" value={form.country} onChange={v => setForm({ ...form, country: v })} />
                <Field label="קוד מפעל" value={form.factory_code} onChange={v => setForm({ ...form, factory_code: v })} disabled={!!editingItem} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== PRODUCTS TAB ====================
  const ProductsTab = () => {
    const emptyProduct = { item_id: '', name_foreign: '', name_hebrew: '', department: 'carne', freshness: 'frozen', breed: 'normal', is_anatomical: false, is_steak: false, kosher_id: null as number | null, customer_id: null as number | null, bone_waste_percentage: null as number | null };
    const [form, setForm] = useState(emptyProduct);
    useEffect(() => {
      if (editingItem) setForm({ item_id: editingItem.item_id || '', name_foreign: editingItem.name_foreign || '', name_hebrew: editingItem.name_hebrew || '', department: editingItem.department || 'carne', freshness: editingItem.freshness || 'frozen', breed: editingItem.breed || 'normal', is_anatomical: editingItem.is_anatomical || false, is_steak: editingItem.is_steak || false, kosher_id: editingItem.kosher_id || null, customer_id: editingItem.customer_id || null, bone_waste_percentage: editingItem.bone_waste_percentage || null });
      else setForm(emptyProduct);
    }, []);
    const filtered = products.filter(p => !search || (p.item_id || '').includes(search) || (p.name_hebrew || '').includes(search) || (p.name_foreign || '').includes(search));
    const canSave = !!form.item_id.trim() && !!form.name_hebrew?.trim() && !!form.kosher_id;
    const handleSave = async () => {
      if (!canSave) return;
      setSaving(true); setErrorMsg('');
      const { item_id, ...rest } = form;
      const result = editingItem ? await updateProduct(editingItem.item_id, rest) : await createProduct(form);
      setSaving(false);
      if (result.success) { setModalOpen(false); setEditingItem(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-4">קוד פריט</th>
                  <th className="px-4 py-4">שם עברי</th>
                  <th className="px-4 py-4">שם זר</th>
                  <th className="px-4 py-4">מחלקה</th>
                  <th className="px-4 py-4">כשרות</th>
                  <th className="px-4 py-4">לקוח</th>
                  <th className="px-4 py-4">X9</th>
                  <th className="px-4 py-4">סטייק</th>
                  <th className="px-4 py-4 w-20">עריכה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.item_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.item_id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name_hebrew}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.name_foreign}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{p.department}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{p.kosher_type_name}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.customer_name}</td>
                    <td className="px-4 py-3 text-xs">{p.is_anatomical ? <span className="text-blue-600 font-bold">✓</span> : '-'}</td>
                    <td className="px-4 py-3 text-xs">{p.is_steak ? <span className="text-blue-600 font-bold">✓</span> : '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditingItem(p); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">לא נמצאו מוצרים</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מוצר' : 'הוספת מוצר'} onClose={() => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <Field label="קוד פריט (EAN)" value={form.item_id} onChange={v => setForm({ ...form, item_id: v })} required disabled={!!editingItem} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם עברי *" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} required />
                <Field label="שם זר" value={form.name_foreign} onChange={v => setForm({ ...form, name_foreign: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="מחלקה" value={form.department} onChange={v => setForm({ ...form, department: v })} options={[{ value: 'carne', label: 'Carne' }, { value: 'carne con hueso', label: 'Carne con Hueso' }, { value: 'menaker', label: 'Menaker' }, { value: 'menudencias', label: 'Menudencias' }]} />
                <SelectField label="סוג כשרות *" value={String(form.kosher_id || '')} onChange={v => setForm({ ...form, kosher_id: v ? Number(v) : null })} options={[{ value: '', label: 'בחר...' }, ...kosherEntries.map(k => ({ value: String(k.id), label: `${k.name_hebrew || k.name} (${k.family_hebrew || k.family})` }))]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="טריות" value={form.freshness} onChange={v => setForm({ ...form, freshness: v })} options={[{ value: 'frozen', label: 'קפוא' }, { value: 'chilled', label: 'צונן' }]} />
                <SelectField label="זן" value={form.breed} onChange={v => setForm({ ...form, breed: v })} options={[{ value: 'normal', label: 'רגיל' }, { value: 'feed lot', label: 'פידלוט' }]} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <SelectField label="לקוח" value={String(form.customer_id || '')} onChange={v => setForm({ ...form, customer_id: v ? Number(v) : null })} options={[{ value: '', label: 'בחר...' }, ...customers.map(c => ({ value: String(c.id), label: c.name_hebrew || c.name || '' }))]} />
                <SelectField label="X9 (אנטומי)" value={String(form.is_anatomical)} onChange={v => setForm({ ...form, is_anatomical: v === 'true' })} options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]} />
                <SelectField label="סטייק" value={String(form.is_steak)} onChange={v => setForm({ ...form, is_steak: v === 'true' })} options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]} />
              </div>
              <Field label="אחוז פחת עצם" value={form.bone_waste_percentage !== null ? String(form.bone_waste_percentage) : ''} onChange={v => setForm({ ...form, bone_waste_percentage: v ? Number(v) : null })} />
              {!canSave && form.item_id.trim() && <p className="text-xs text-amber-600">שם עברי וסוג כשרות הם שדות חובה</p>}
              {errorMsg && <p className="text-sm text-amber-600 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!canSave} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== KOSHER TAB ====================
  const KosherTab = () => {
    const [form, setForm] = useState({ name: '', family: 'Halak', name_hebrew: '', family_hebrew: 'חלק' });
    useEffect(() => {
      if (editingItem) setForm({ name: editingItem.name || '', family: editingItem.family || 'Halak', name_hebrew: editingItem.name_hebrew || '', family_hebrew: editingItem.family_hebrew || '' });
      else setForm({ name: '', family: 'Halak', name_hebrew: '', family_hebrew: 'חלק' });
    }, []);
    const filtered = kosherEntries.filter(k => !search || (k.name || '').includes(search) || (k.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateKosherEntry(editingItem.id, form) : await createKosherEntry(form);
      setSaving(false);
      if (result.success) { setModalOpen(false); setEditingItem(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteKosherEntry(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4">משפחה</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(k => (
                <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{k.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{k.name}</td>
                  <td className="px-6 py-3 text-slate-700">{k.name_hebrew}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${k.family === 'Halak' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {k.family_hebrew || (k.family === 'Halak' ? 'חלק' : 'מוכשר')}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingItem(k); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      {deleteConfirm === k.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(k.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                        </div>
                      ) : (<button onClick={() => setDeleteConfirm(k.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">לא נמצאו רשומות כשרות</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת רשומת כשרות' : 'הוספת רשומת כשרות'} onClose={() => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="משפחה" value={form.family} onChange={v => setForm({ ...form, family: v, family_hebrew: v === 'Halak' ? 'חלק' : 'מוכשר' })} options={[{ value: 'Halak', label: 'חלק' }, { value: 'Kosher', label: 'מוכשר' }]} />
                <Field label="משפחה עברית" value={form.family_hebrew} onChange={v => setForm({ ...form, family_hebrew: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== CUSTOMERS TAB ====================
  const CustomersTab = () => {
    const [form, setForm] = useState({ name: '', name_hebrew: '' });
    useEffect(() => {
      if (editingItem) setForm({ name: editingItem.name || '', name_hebrew: editingItem.name_hebrew || '' });
      else setForm({ name: '', name_hebrew: '' });
    }, []);
    const filtered = customers.filter(c => !search || (c.name || '').includes(search) || (c.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateCustomer(editingItem.id, form) : await createCustomer(form);
      setSaving(false);
      if (result.success) { setModalOpen(false); setEditingItem(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteCustomer(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה במחיקה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{c.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{c.name}</td>
                  <td className="px-6 py-3 text-slate-700">{c.name_hebrew}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingItem(c); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      {deleteConfirm === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                        </div>
                      ) : (<button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו לקוחות</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת לקוח' : 'הוספת לקוח'} onClose={() => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}>
            <div className="space-y-4">
              <Field label="שם" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
              <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== SEASONS TAB ====================
  const SeasonsTab = () => {
    const emptySeason = { name: '', start_date: '', end_date: '', is_active: false };
    const [form, setForm] = useState(emptySeason);
    useEffect(() => {
      if (editingItem) setForm({ name: editingItem.name || '', start_date: editingItem.start_date || '', end_date: editingItem.end_date || '', is_active: editingItem.is_active || false });
      else setForm(emptySeason);
    }, []);
    const filtered = seasons.filter(s => !search || (s.name || '').includes(search));
    const handleSave = async () => {
      if (!form.name.trim() || !form.start_date || !form.end_date) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateSeason(editingItem.id, form) : await createSeason(form);
      setSaving(false);
      if (result.success) { setModalOpen(false); setEditingItem(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteSeason(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה במחיקה');
    };
    const canSaveSeason = !!form.name.trim() && !!form.start_date && !!form.end_date;
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">שם עונה</th>
                <th className="px-6 py-4">תאריך התחלה</th>
                <th className="px-6 py-4">תאריך סיום</th>
                <th className="px-6 py-4">סטטוס</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-800">{s.name}</td>
                  <td className="px-6 py-3 font-mono text-slate-600 text-xs">{s.start_date}</td>
                  <td className="px-6 py-3 font-mono text-slate-600 text-xs">{s.end_date}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${s.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      {s.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingItem(s); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      {deleteConfirm === s.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                        </div>
                      ) : (<button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">לא נמצאו עונות</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת עונה' : 'הוספת עונה'} onClose={() => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}>
            <div className="space-y-4">
              <Field label="שם עונה" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
              <div className="grid grid-cols-2 gap-4">
                <DateField label="תאריך התחלה" value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} />
                <DateField label="תאריך סיום" value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-slate-600">{form.is_active ? 'עונה פעילה' : 'עונה לא פעילה'}</span>
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!canSaveSeason} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  if (loading) return <LoadingState message="טוען הגדרות..." />;

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">הגדרות</h1>
          <p className="text-sm text-slate-400 mt-1">ניהול מפעלים, מוצרים, כשרות, לקוחות ועונות</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button onClick={() => setBulkProductOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors border border-slate-200">
              <FileSpreadsheet size={18} />
              העלאת קובץ מוצרים
            </button>
          )}
          {activeTab !== 'factories' && (
            <button onClick={() => { setEditingItem(null); setModalOpen(true); setErrorMsg(''); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={18} />
              הוסף חדש
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); setDeleteConfirm(null); setModalOpen(false); setEditingItem(null); setErrorMsg(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <tab.icon size={18} />
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      {activeTab === 'factories' && <FactoriesTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'kosher' && <KosherTab />}
      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'seasons' && <SeasonsTab />}
      {bulkProductOpen && (
        <BulkProductUploadModal
          onClose={() => setBulkProductOpen(false)}
          onSuccess={() => { setBulkProductOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, disabled }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5">{label} {required && <span className="text-red-400">*</span>}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SaveButton({ saving, onClick, disabled }: { saving: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button onClick={onClick} disabled={disabled || saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? 'שומר...' : 'שמור'}
      </button>
    </div>
  );
}

// ==================== BULK PRODUCT UPLOAD MODAL ====================

type BulkStep = 'upload' | 'preview' | 'result';

function BulkProductUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<BulkStep>('upload');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductsPreviewResult | null>(null);
  const [result, setResult] = useState<ProductsUploadResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(',')[1];
      setFileBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePreview = async () => {
    if (!fileBase64) return;
    setLoading(true);
    const res = await previewProductsUpload(fileBase64);
    setPreview(res);
    setLoading(false);
    setStep('preview');
  };

  const handleUpload = async () => {
    if (!fileBase64) return;
    setLoading(true);
    const res = await uploadProducts(fileBase64);
    setResult(res);
    setLoading(false);
    setStep('result');
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const b64 = await getProductsSampleFile();
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'products_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const validRows = preview?.rows.filter(r => !r.hasError) ?? [];
  const errorRows = preview?.rows.filter(r => r.hasError) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]" dir="rtl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl"><FileSpreadsheet size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900">העלאת מוצרים מקובץ Excel</h2>
              <p className="text-xs text-slate-400">
                {step === 'upload' && 'בחר קובץ Excel עם רשימת המוצרים'}
                {step === 'preview' && `תצוגה מקדימה — ${preview?.totalRows ?? 0} שורות`}
                {step === 'result' && 'תוצאות ההעלאה'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
          {(['upload', 'preview', 'result'] as BulkStep[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${step === s ? 'bg-blue-600 text-white' : idx < (['upload', 'preview', 'result'] as BulkStep[]).indexOf(step) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                <span>{idx + 1}</span>
                <span>{['העלאה', 'תצוגה', 'תוצאה'][idx]}</span>
              </div>
              {idx < 2 && <div className="w-6 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ---- STEP 1: UPLOAD ---- */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${fileBase64 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={36} className={`mx-auto mb-3 ${fileBase64 ? 'text-blue-500' : 'text-slate-300'}`} />
                {fileBase64 ? (
                  <div>
                    <p className="font-bold text-blue-700 text-sm">{fileName}</p>
                    <p className="text-xs text-blue-400 mt-1">קובץ נטען — לחץ לבחירת קובץ אחר</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-600 text-sm">גרור קובץ Excel לכאן, או לחץ לבחירה</p>
                    <p className="text-xs text-slate-400 mt-1">קבצים נתמכים: .xlsx, .xls</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-700 mb-2">סדר עמודות נדרש:</p>
                <p className="font-mono text-[11px] text-slate-500">ברקוד | שם עברית | שם לועזית | כשרות | מחלקה | X9 | סטייק | ריענון | זן | אחוז עצם | לקוח</p>
                <p className="text-slate-400 mt-2">* ברקוד, שם עברית וכשרות הם שדות חובה</p>
              </div>

              <div className="flex justify-end">
                <button onClick={handleDownloadTemplate} disabled={downloadingTemplate} className="flex items-center gap-2 px-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-bold transition-colors disabled:opacity-50">
                  {downloadingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  הורד קובץ לדוגמה
                </button>
              </div>
            </div>
          )}

          {/* ---- STEP 2: PREVIEW ---- */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Summary pills */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                  <span>{preview.totalRows} שורות</span>
                </div>
                {validRows.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-xs font-bold text-blue-700">
                    <CheckCircle2 size={13} />
                    <span>{validRows.length} תקינות</span>
                  </div>
                )}
                {errorRows.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full text-xs font-bold text-orange-700">
                    <AlertCircle size={13} />
                    <span>{errorRows.length} שגיאות</span>
                  </div>
                )}
                {preview.warningCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-xs font-bold text-amber-700">
                    <AlertTriangle size={13} />
                    <span>{preview.warningCount} אזהרות</span>
                  </div>
                )}
              </div>

              {preview.globalErrors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  {preview.globalErrors.map((e, i) => <p key={i} className="text-sm text-orange-700 font-medium">{e}</p>)}
                </div>
              )}

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">ברקוד</th>
                        <th className="px-3 py-2.5">שם עברי</th>
                        <th className="px-3 py-2.5">שם זר</th>
                        <th className="px-3 py-2.5">כשרות</th>
                        <th className="px-3 py-2.5">מחלקה</th>
                        <th className="px-3 py-2.5">לקוח</th>
                        <th className="px-3 py-2.5">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map(r => (
                        <tr key={r.row} className={r.hasError ? 'bg-orange-50' : r.isWarning ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2 text-slate-400">{r.row}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.item_id || <span className="text-orange-400">חסר</span>}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{r.name_hebrew || <span className="text-orange-400">חסר</span>}</td>
                          <td className="px-3 py-2 text-slate-500">{r.name_foreign}</td>
                          <td className="px-3 py-2">
                            {r.kosher_id ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{r.kosher_name}</span>
                            ) : (
                              <span className="text-orange-500 font-bold">{r.kosher_name || 'חסר'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{r.department}</td>
                          <td className="px-3 py-2 text-slate-400">{r.customer_name}</td>
                          <td className="px-3 py-2">
                            {r.hasError ? (
                              <span className="flex items-center gap-1 text-orange-600 font-bold">
                                <AlertCircle size={12} />{r.errorMsg}
                              </span>
                            ) : r.isWarning ? (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle size={12} />{r.warningMsg}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-600">
                                <CheckCircle2 size={12} />תקין
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {validRows.length === 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-orange-700 font-bold text-sm">אין שורות תקינות להעלאה</p>
                  <p className="text-orange-500 text-xs mt-1">תקן את השגיאות בקובץ והעלה מחדש</p>
                </div>
              )}
            </div>
          )}

          {/* ---- STEP 3: RESULT ---- */}
          {step === 'result' && result && (
            <div className="space-y-4 py-4">
              <div className={`rounded-2xl p-6 text-center border-2 ${result.success ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                {result.success ? (
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-blue-500" />
                ) : (
                  <AlertCircle size={48} className="mx-auto mb-3 text-orange-500" />
                )}
                <p className={`text-xl font-black ${result.success ? 'text-blue-800' : 'text-orange-800'}`}>
                  {result.success ? 'ההעלאה הצליחה' : 'ההעלאה הסתיימה עם שגיאות'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-blue-700">{result.inserted}</p>
                  <p className="text-xs text-blue-500 mt-1 font-bold">מוצרים נוספו</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-slate-500">{result.skipped}</p>
                  <p className="text-xs text-slate-400 mt-1 font-bold">דולגו (קיימים)</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-orange-700">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">סגור</button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <button onClick={() => { setStep('upload'); setPreview(null); }} className="px-4 py-2 text-sm border border-slate-200 rounded-xl font-bold hover:bg-slate-50">חזור</button>
            )}
            {step === 'upload' && (
              <button onClick={handlePreview} disabled={!fileBase64 || loading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                {loading ? 'טוען...' : 'תצוגה מקדימה'}
              </button>
            )}
            {step === 'preview' && validRows.length > 0 && (
              <button onClick={handleUpload} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {loading ? 'מעלה...' : `העלה ${validRows.length} מוצרים`}
              </button>
            )}
            {step === 'result' && result?.success && result.inserted > 0 && (
              <button onClick={onSuccess} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                סיום
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
