'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Factory as FactoryIcon, Package, Shield, Users, CalendarDays,
  Plus, Pencil, Trash2, X, Check, Loader2, Search,
  FileSpreadsheet, Upload, Download, AlertTriangle, AlertCircle, CheckCircle2,
  Dna, Star, Layers, Globe, Database,
} from 'lucide-react';
import {
  getFactories, createFactory, updateFactory, toggleFactoryActive, Factory,
  getDepartments, createDepartment, updateDepartment, deleteDepartment, Department,
  getProducts, createProduct, updateProduct, Product,
  getBreeds, createBreed, updateBreed, deleteBreed, Breed,
  getKosherFamilies, createKosherFamily, updateKosherFamily, deleteKosherFamily, KosherFamily,
  getKosherTypes, createKosherType, updateKosherType, deleteKosherType, KosherType,
  getCustomers, createCustomer, updateCustomer, Customer,
  getSeasons, createSeason, updateSeason, deleteSeason, setCurrentSeason, Season,
  getCountries, createCountry, updateCountry, deleteCountry, Country,
} from '@/app/actions/settingsActions';
import {
  previewProductsUpload, uploadProducts,
  ProductRowPreview, ProductsPreviewResult, ProductsUploadResult,
} from '@/app/actions/uploadProductsAction';
import { getProductsSampleFile } from '@/app/actions/getSampleFile';
import { LoadingState } from '@/components/ui/LoadingState';
import { SingleDatePicker } from '@/components/SingleDatePicker';

type Tab = 'factories' | 'products' | 'departments' | 'breeds' | 'kosher' | 'customers' | 'seasons' | 'countries';
type KosherSubTab = 'families' | 'types';
type SettingsSection = 'data';

export default function SettingsPage() {
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('data');
  const [activeTab, setActiveTab] = useState<Tab>('factories');
  const [loading, setLoading] = useState(true);

  const [factories, setFactories] = useState<Factory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [kosherFamilies, setKosherFamilies] = useState<KosherFamily[]>([]);
  const [kosherTypes, setKosherTypes] = useState<KosherType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

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
    { key: 'departments' as Tab, label: 'מחלקות', icon: Layers, count: departments.length },
    { key: 'breeds' as Tab, label: 'זנים', icon: Dna, count: breeds.length },
    { key: 'kosher' as Tab, label: 'כשרות', icon: Shield, count: kosherTypes.length },
    { key: 'customers' as Tab, label: 'לקוחות', icon: Users, count: customers.length },
    { key: 'seasons' as Tab, label: 'עונות', icon: CalendarDays, count: seasons.length },
    { key: 'countries' as Tab, label: 'מדינות', icon: Globe, count: countries.length },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    const [f, p, dep, br, kf, kt, c, s, cnt] = await Promise.all([
      getFactories(), getProducts(), getDepartments(), getBreeds(),
      getKosherFamilies(), getKosherTypes(), getCustomers(), getSeasons(), getCountries(),
    ]);
    setFactories(f); setProducts(p); setDepartments(dep); setBreeds(br);
    setKosherFamilies(kf); setKosherTypes(kt); setCustomers(c); setSeasons(s); setCountries(cnt);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const closeModal = () => { setModalOpen(false); setEditingItem(null); setErrorMsg(''); };

  // ==================== FACTORIES TAB ====================
  const FactoriesTab = () => {
    const [form, setForm] = useState({ name_english: '', name_hebrew: '', country_id: null as number | null, factory_code: '' });
    useEffect(() => {
      if (editingItem) setForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '', country_id: editingItem.country_id ?? null, factory_code: editingItem.factory_code || '' });
      else setForm({ name_english: '', name_hebrew: '', country_id: null, factory_code: '' });
    }, []);
    const filtered = factories.filter(f => !search || (f.name_english || '').includes(search) || (f.name_hebrew || '').includes(search) || (f.country_name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const data = editingItem ? { ...form, factory_code: editingItem.factory_code } : form;
      const result = editingItem ? await updateFactory(editingItem.id, data) : await createFactory(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם (אנגלית)</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4">מדינה</th>
                <th className="px-6 py-4">קוד</th>
                <th className="px-6 py-4">פעיל</th>
                <th className="px-6 py-4 w-20">עריכה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(f => (
                <tr key={f.id} className={`hover:bg-slate-50 transition-colors ${!f.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{f.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{f.name_english}</td>
                  <td className="px-6 py-3 text-slate-700">{f.name_hebrew}</td>
                  <td className="px-6 py-3 text-slate-600">{f.country_name_hebrew || '—'}</td>
                  <td className="px-6 py-3 font-mono text-slate-600">{f.factory_code}</td>
                  <td className="px-6 py-3">
                    <button type="button" onClick={async () => { await toggleFactoryActive(f.id, !f.active); loadData(); }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${f.active ? 'bg-blue-500' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${f.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <button onClick={() => { setEditingItem(f); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">לא נמצאו מפעלים</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מפעל' : 'הוספת מפעל'} onClose={closeModal}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם (אנגלית)" value={form.name_english} onChange={v => setForm({ ...form, name_english: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="מדינה" value={String(form.country_id ?? '')}
                  onChange={v => setForm({ ...form, country_id: v ? Number(v) : null })}
                  options={[{ value: '', label: '(ללא)' }, ...countries.map(c => ({ value: String(c.id), label: c.name_hebrew || c.name_english }))]} />
                <Field label="קוד מפעל" value={form.factory_code} onChange={v => setForm({ ...form, factory_code: v })} disabled={!!editingItem} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name_english.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== DEPARTMENTS TAB ====================
  const DepartmentsTab = () => {
    const [form, setForm] = useState({ name_english: '', name_hebrew: '' });
    useEffect(() => {
      if (editingItem) setForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '' });
      else setForm({ name_english: '', name_hebrew: '' });
    }, []);
    const filtered = departments.filter(d => !search || (d.name_english || '').includes(search) || (d.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateDepartment(editingItem.id, form) : await createDepartment(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteDepartment(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else { setDeleteConfirm(null); setErrorMsg(result.error || 'שגיאה במחיקה'); }
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם (אנגלית)</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{d.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{d.name_english}</td>
                  <td className="px-6 py-3 text-slate-700">{d.name_hebrew}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingItem(d); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      {deleteConfirm === d.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                        </div>
                      ) : (<button onClick={() => setDeleteConfirm(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו מחלקות</td></tr>}
            </tbody>
          </table>
        </div>
        {errorMsg && !modalOpen && <p className="text-sm text-red-500 font-medium mt-2">{errorMsg}</p>}
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מחלקה' : 'הוספת מחלקה'} onClose={closeModal}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם (אנגלית)" value={form.name_english} onChange={v => setForm({ ...form, name_english: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name_english.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== PRODUCTS TAB ====================
  const ProductsTab = () => {
    const defaultForm = () => ({
      item_id: '', name_foreign: '', name_hebrew: '',
      department_id: departments[0]?.id ?? 0,
      freshness: true,
      breed_id: breeds[0]?.id ?? 1,
      is_anatomical: false, is_steak: false,
      kosher_type_id: kosherTypes[0]?.id ?? 0,
      customer_id: customers[0]?.id ?? 1,
      country_id: countries[0]?.id ?? 0,
      bone_waste_percentage: 0,
    });
    const [form, setForm] = useState(defaultForm);
    useEffect(() => {
      if (editingItem) {
        setForm({
          item_id: editingItem.item_id || '',
          name_foreign: editingItem.name_foreign || '',
          name_hebrew: editingItem.name_hebrew || '',
          department_id: editingItem.department_id || (departments[0]?.id ?? 0),
          freshness: editingItem.freshness ?? true,
          breed_id: editingItem.breed_id || (breeds[0]?.id ?? 1),
          is_anatomical: editingItem.is_anatomical || false,
          is_steak: editingItem.is_steak || false,
          kosher_type_id: editingItem.kosher_type_id || (kosherTypes[0]?.id ?? 0),
          customer_id: editingItem.customer_id || (customers[0]?.id ?? 1),
          country_id: editingItem.country_id || (countries[0]?.id ?? 0),
          bone_waste_percentage: editingItem.bone_waste_percentage || 0,
        });
      } else {
        setForm(defaultForm());
      }
    }, []);
    const [showCount, setShowCount] = useState(20);
    const filtered = products.filter(p => !search || (p.item_id || '').includes(search) || (p.name_hebrew || '').includes(search) || (p.name_foreign || '').includes(search));
    const visibleProducts = filtered.slice(0, showCount);
    const hasMore = showCount < filtered.length;
    const canSave = !!form.item_id.trim() && !!form.name_hebrew?.trim() && form.kosher_type_id > 0;
    const handleSave = async () => {
      if (!canSave) return;
      setSaving(true); setErrorMsg('');
      const { item_id, ...rest } = form;
      const result = editingItem ? await updateProduct(editingItem.item_id, rest) : await createProduct(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm min-w-[920px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-4">קוד פריט</th>
                  <th className="px-4 py-4">שם עברי</th>
                  <th className="px-4 py-4">שם זר</th>
                  <th className="px-4 py-4">מחלקה</th>
                  <th className="px-4 py-4">כשרות</th>
                  <th className="px-4 py-4">לקוח</th>
                  <th className="px-4 py-4">מדינה</th>
                  <th className="px-4 py-4">X9</th>
                  <th className="px-4 py-4">סטייק</th>
                  <th className="px-4 py-4 w-20">עריכה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.item_id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name_hebrew}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.name_foreign}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{p.department_name_hebrew || p.department_name_english}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{p.kosher_type_name_hebrew || p.kosher_family_name_hebrew}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.customer_name_hebrew}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.country_name_hebrew || '—'}</td>
                    <td className="px-4 py-3 text-xs">{p.is_anatomical ? <span className="text-blue-600 font-bold">✓</span> : '-'}</td>
                    <td className="px-4 py-3 text-xs">{p.is_steak ? <span className="text-blue-600 font-bold">✓</span> : '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditingItem(p); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">לא נמצאו מוצרים</td></tr>}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center py-4 border-t border-slate-100">
              <button onClick={() => setShowCount(c => c + 20)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                טען עוד ({filtered.length - showCount} נותרו)
              </button>
            </div>
          )}
          {!hasMore && filtered.length > 20 && (
            <div className="text-center py-3 text-xs text-slate-400">
              מציג את כל {filtered.length} המוצרים
            </div>
          )}
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מוצר' : 'הוספת מוצר'} onClose={closeModal}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <Field label="קוד פריט (EAN)" value={form.item_id} onChange={v => setForm({ ...form, item_id: v })} required disabled={!!editingItem} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם עברי *" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} required />
                <Field label="שם זר" value={form.name_foreign} onChange={v => setForm({ ...form, name_foreign: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="מחלקה" value={String(form.department_id)} onChange={v => setForm({ ...form, department_id: Number(v) })}
                  options={departments.map(d => ({ value: String(d.id), label: d.name_hebrew || d.name_english }))} />
                <SelectField label="סוג כשרות *" value={String(form.kosher_type_id)} onChange={v => setForm({ ...form, kosher_type_id: Number(v) })}
                  options={[{ value: '0', label: 'בחר...' }, ...kosherTypes.map(k => ({ value: String(k.id), label: `${k.name_hebrew} (${k.family_name_hebrew || k.family_name_english})` }))]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="טריות" value={String(form.freshness)} onChange={v => setForm({ ...form, freshness: v === 'true' })}
                  options={[{ value: 'true', label: 'טרי (fresh)' }, { value: 'false', label: 'קפוא (frozen)' }]} />
                <SelectField label="זן" value={String(form.breed_id)} onChange={v => setForm({ ...form, breed_id: Number(v) })}
                  options={breeds.map(b => ({ value: String(b.id), label: b.name_hebrew || b.name_english }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="לקוח" value={String(form.customer_id)} onChange={v => setForm({ ...form, customer_id: Number(v) })}
                  options={customers.map(c => ({ value: String(c.id), label: c.name_hebrew || c.name_english }))} />
                <SelectField label="מדינה" value={String(form.country_id)} onChange={v => setForm({ ...form, country_id: Number(v) })}
                  options={countries.map(c => ({ value: String(c.id), label: c.name_hebrew || c.name_english }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <SelectField label="X9 (אנטומי)" value={String(form.is_anatomical)} onChange={v => setForm({ ...form, is_anatomical: v === 'true' })}
                  options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]} />
                <SelectField label="סטייק" value={String(form.is_steak)} onChange={v => setForm({ ...form, is_steak: v === 'true' })}
                  options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]} />
                <Field label="אחוז פחת עצם" value={String(form.bone_waste_percentage)} onChange={v => setForm({ ...form, bone_waste_percentage: Number(v) || 0 })} />
              </div>
              {!canSave && form.item_id.trim() && <p className="text-xs text-amber-600">שם עברי וסוג כשרות הם שדות חובה</p>}
              {errorMsg && <p className="text-sm text-amber-600 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!canSave} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== BREEDS TAB ====================
  const BreedsTab = () => {
    const [form, setForm] = useState({ name_english: '', name_hebrew: '' });
    useEffect(() => {
      if (editingItem) setForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '' });
      else setForm({ name_english: '', name_hebrew: '' });
    }, []);
    const filtered = breeds.filter(b => !search || (b.name_english || '').includes(search) || (b.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateBreed(editingItem.id, form) : await createBreed(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteBreed(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else { setDeleteConfirm(null); setErrorMsg(result.error || 'שגיאה במחיקה'); }
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם (אנגלית)</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{b.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{b.name_english}</td>
                  <td className="px-6 py-3 text-slate-700">{b.name_hebrew}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingItem(b); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      {deleteConfirm === b.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                        </div>
                      ) : (<button onClick={() => setDeleteConfirm(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו זנים</td></tr>}
            </tbody>
          </table>
        </div>
        {errorMsg && !modalOpen && <p className="text-sm text-red-500 font-medium mt-2">{errorMsg}</p>}
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת זן' : 'הוספת זן'} onClose={closeModal}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם (אנגלית)" value={form.name_english} onChange={v => setForm({ ...form, name_english: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name_english.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== KOSHER TAB (2-level) ====================
  const KosherTab = () => {
    const [subTab, setSubTab] = useState<KosherSubTab>('families');
    const [familyForm, setFamilyForm] = useState({ name_english: '', name_hebrew: '' });
    const [typeForm, setTypeForm] = useState({ name_english: '', name_hebrew: '', family_id: kosherFamilies[0]?.id ?? 0 });

    useEffect(() => {
      if (editingItem) {
        if (subTab === 'families') setFamilyForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '' });
        else setTypeForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '', family_id: editingItem.family_id || (kosherFamilies[0]?.id ?? 0) });
      } else {
        setFamilyForm({ name_english: '', name_hebrew: '' });
        setTypeForm({ name_english: '', name_hebrew: '', family_id: kosherFamilies[0]?.id ?? 0 });
      }
    }, [subTab]);

    const filteredFamilies = kosherFamilies.filter(f => !search || (f.name_english || '').includes(search) || (f.name_hebrew || '').includes(search));
    const filteredTypes = kosherTypes.filter(k => !search || (k.name_english || '').includes(search) || (k.name_hebrew || '').includes(search));

    const handleSaveFamily = async () => {
      if (!familyForm.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateKosherFamily(editingItem.id, familyForm) : await createKosherFamily(familyForm);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDeleteFamily = async (id: number) => {
      const result = await deleteKosherFamily(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else { setDeleteConfirm(null); setErrorMsg(result.error || 'שגיאה במחיקה'); }
    };
    const handleSaveType = async () => {
      if (!typeForm.name_english.trim() || !typeForm.family_id) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateKosherType(editingItem.id, typeForm) : await createKosherType(typeForm);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDeleteType = async (id: number) => {
      const result = await deleteKosherType(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else { setDeleteConfirm(null); setErrorMsg(result.error || 'שגיאה במחיקה'); }
    };

    return (
      <>
        <div className="flex gap-2 mb-4">
          {(['families', 'types'] as KosherSubTab[]).map(t => (
            <button key={t} onClick={() => { setSubTab(t); closeModal(); setDeleteConfirm(null); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${subTab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {t === 'families' ? `משפחות (${kosherFamilies.length})` : `סוגים (${kosherTypes.length})`}
            </button>
          ))}
        </div>

        {subTab === 'families' && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">שם (אנגלית)</th>
                    <th className="px-6 py-4">שם עברי</th>
                    <th className="px-6 py-4 w-24">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFamilies.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-400 font-mono text-xs">{f.id}</td>
                      <td className="px-6 py-3 font-bold text-slate-800">{f.name_english}</td>
                      <td className="px-6 py-3 text-slate-700">{f.name_hebrew}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingItem(f); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                          {deleteConfirm === f.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDeleteFamily(f.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                            </div>
                          ) : (<button onClick={() => setDeleteConfirm(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFamilies.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו משפחות כשרות</td></tr>}
                </tbody>
              </table>
            </div>
            {modalOpen && (
              <Modal title={editingItem ? 'עריכת משפחת כשרות' : 'הוספת משפחת כשרות'} onClose={closeModal}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="שם (אנגלית)" value={familyForm.name_english} onChange={v => setFamilyForm({ ...familyForm, name_english: v })} required />
                    <Field label="שם עברי" value={familyForm.name_hebrew} onChange={v => setFamilyForm({ ...familyForm, name_hebrew: v })} />
                  </div>
                  {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
                  <SaveButton saving={saving} onClick={handleSaveFamily} disabled={!familyForm.name_english.trim()} />
                </div>
              </Modal>
            )}
          </>
        )}

        {subTab === 'types' && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">שם (אנגלית)</th>
                    <th className="px-6 py-4">שם עברי</th>
                    <th className="px-6 py-4">משפחה</th>
                    <th className="px-6 py-4 w-24">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-400 font-mono text-xs">{k.id}</td>
                      <td className="px-6 py-3 font-bold text-slate-800">{k.name_english}</td>
                      <td className="px-6 py-3 text-slate-700">{k.name_hebrew}</td>
                      <td className="px-6 py-3">
                        {(() => {
                          const fam = (k.family_name_english || '').toLowerCase();
                          const isHalak = fam === 'halak';
                          const isMuchshar = fam === 'muchshar' || fam === 'kosher';
                          const badgeStyle = isHalak
                            ? { color: '#cc2200', background: 'rgba(204,34,0,0.08)', borderColor: '#cc2200' }
                            : isMuchshar
                            ? { color: '#15803d', background: 'rgba(21,128,61,0.08)', borderColor: '#15803d' }
                            : { color: '#1e293b', background: 'rgba(30,41,59,0.08)', borderColor: '#64748b' };
                          return (
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-bold border"
                              style={badgeStyle}
                            >
                              {k.family_name_hebrew || k.family_name_english}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingItem(k); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                          {deleteConfirm === k.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDeleteType(k.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600"><Check size={15} /></button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={15} /></button>
                            </div>
                          ) : (<button onClick={() => setDeleteConfirm(k.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTypes.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">לא נמצאו סוגי כשרות</td></tr>}
                </tbody>
              </table>
            </div>
            {modalOpen && (
              <Modal title={editingItem ? 'עריכת סוג כשרות' : 'הוספת סוג כשרות'} onClose={closeModal}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="שם (אנגלית)" value={typeForm.name_english} onChange={v => setTypeForm({ ...typeForm, name_english: v })} required />
                    <Field label="שם עברי" value={typeForm.name_hebrew} onChange={v => setTypeForm({ ...typeForm, name_hebrew: v })} />
                  </div>
                  <SelectField label="משפחת כשרות *" value={String(typeForm.family_id)} onChange={v => setTypeForm({ ...typeForm, family_id: Number(v) })}
                    options={kosherFamilies.map(f => ({ value: String(f.id), label: `${f.name_hebrew} (${f.name_english})` }))} />
                  {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
                  <SaveButton saving={saving} onClick={handleSaveType} disabled={!typeForm.name_english.trim() || !typeForm.family_id} />
                </div>
              </Modal>
            )}
          </>
        )}
        {errorMsg && !modalOpen && <p className="text-sm text-red-500 font-medium mt-2">{errorMsg}</p>}
      </>
    );
  };

  // ==================== CUSTOMERS TAB ====================
  const CustomersTab = () => {
    const [form, setForm] = useState({ name_english: '', name_hebrew: '' });
    useEffect(() => {
      if (editingItem) setForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '' });
      else setForm({ name_english: '', name_hebrew: '' });
    }, []);
    const filtered = customers.filter(c => !search || (c.name_english || '').includes(search) || (c.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateCustomer(editingItem.id, form) : await createCustomer(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם (אנגלית)</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{c.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{c.name_english}</td>
                  <td className="px-6 py-3 text-slate-700">{c.name_hebrew}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => { setEditingItem(c); setModalOpen(true); setErrorMsg(''); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו לקוחות</td></tr>}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת לקוח' : 'הוספת לקוח'} onClose={closeModal}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם (אנגלית)" value={form.name_english} onChange={v => setForm({ ...form, name_english: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name_english.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== SEASONS TAB ====================
  const SeasonsTab = () => {
    const emptySeason = { name_hebrew: '', start_date: '', end_date: '' };
    const [form, setForm] = useState(emptySeason);
    const [settingCurrent, setSettingCurrent] = useState<number | null>(null);
    useEffect(() => {
      if (editingItem) setForm({ name_hebrew: editingItem.name_hebrew || '', start_date: editingItem.start_date || '', end_date: editingItem.end_date || '' });
      else setForm(emptySeason);
    }, []);
    const filtered = seasons.filter(s => !search || (s.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_hebrew.trim() || !form.start_date || !form.end_date) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateSeason(editingItem.id, form) : await createSeason(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteSeason(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else setErrorMsg(result.error || 'שגיאה במחיקה');
    };
    const handleSetCurrent = async (id: number) => {
      setSettingCurrent(id);
      setErrorMsg('');
      const result = await setCurrentSeason(id);
      setSettingCurrent(null);
      if (result.success) {
        await loadData();
      } else {
        setErrorMsg(result.error || 'שגיאה בעדכון עונה נוכחית');
      }
    };
    const canSaveSeason = !!form.name_hebrew.trim() && !!form.start_date && !!form.end_date;
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
                <th className="px-6 py-4 w-36">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-800">{s.name_hebrew}</td>
                  <td className="px-6 py-3 font-mono text-slate-600 text-xs">{s.start_date}</td>
                  <td className="px-6 py-3 font-mono text-slate-600 text-xs">{s.end_date}</td>
                  <td className="px-6 py-3">
                    {s.is_current ? (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 w-fit">
                        <Star size={11} fill="#1D4ED8" /> נוכחית
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      {!s.is_current && (
                        <button onClick={() => handleSetCurrent(s.id)} disabled={settingCurrent === s.id}
                                className="text-[10px] px-2 py-1 rounded font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
                          קבע כנוכחית
                        </button>
                      )}
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
          <Modal title={editingItem ? 'עריכת עונה' : 'הוספת עונה'} onClose={closeModal}>
            <div className="space-y-4">
              <Field label="שם עונה" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} required />
              <div className="grid grid-cols-2 gap-4">
                <DateField label="תאריך התחלה" value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} />
                <DateField label="תאריך סיום" value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!canSaveSeason} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  // ==================== COUNTRIES TAB ====================
  const CountriesTab = () => {
    const [form, setForm] = useState({ name_english: '', name_hebrew: '' });
    useEffect(() => {
      if (editingItem) setForm({ name_english: editingItem.name_english || '', name_hebrew: editingItem.name_hebrew || '' });
      else setForm({ name_english: '', name_hebrew: '' });
    }, []);
    const filtered = countries.filter(c => !search || (c.name_english || '').includes(search) || (c.name_hebrew || '').includes(search));
    const handleSave = async () => {
      if (!form.name_english.trim()) return;
      setSaving(true); setErrorMsg('');
      const result = editingItem ? await updateCountry(editingItem.id, form) : await createCountry(form);
      setSaving(false);
      if (result.success) { closeModal(); loadData(); } else setErrorMsg(result.error || 'שגיאה בשמירה');
    };
    const handleDelete = async (id: number) => {
      const result = await deleteCountry(id);
      if (result.success) { setDeleteConfirm(null); loadData(); }
      else { setDeleteConfirm(null); setErrorMsg(result.error || 'שגיאה במחיקה'); }
    };
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">שם (אנגלית)</th>
                <th className="px-6 py-4">שם עברי</th>
                <th className="px-6 py-4 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{c.id}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">{c.name_english}</td>
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
              {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו מדינות</td></tr>}
            </tbody>
          </table>
        </div>
        {errorMsg && !modalOpen && <p className="text-sm text-red-500 font-medium mt-2">{errorMsg}</p>}
        {modalOpen && (
          <Modal title={editingItem ? 'עריכת מדינה' : 'הוספת מדינה'} onClose={closeModal}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם (אנגלית)" value={form.name_english} onChange={v => setForm({ ...form, name_english: v })} required />
                <Field label="שם עברי" value={form.name_hebrew} onChange={v => setForm({ ...form, name_hebrew: v })} />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.name_english.trim()} />
            </div>
          </Modal>
        )}
      </>
    );
  };

  const addLabel = () => {
    const labels: Record<Tab, string> = { factories: 'מפעל', products: 'מוצר', departments: 'מחלקה', breeds: 'זן', kosher: 'כשרות', customers: 'לקוח', seasons: 'עונה', countries: 'מדינה' };
    return labels[activeTab] || 'חדש';
  };

  if (loading) return <LoadingState message="טוען הגדרות..." />;

  return (
    <div className="space-y-5 pb-24" dir="rtl">

      {/* ── Top bar: section pills + actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900">הגדרות</h1>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setSettingsSection('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                settingsSection === 'data'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Database size={15} />
              ניהול דאטה
            </button>
          </div>
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
              הוסף {addLabel()}
            </button>
          )}
        </div>
      </div>

      {settingsSection === 'data' && (
        <>
          {/* ── Tabs ── */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); setDeleteConfirm(null); closeModal(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                <tab.icon size={16} />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* ── Search ── */}
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* ── Tab content ── */}
          {activeTab === 'factories' && <FactoriesTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'breeds' && <BreedsTab />}
          {activeTab === 'kosher' && <KosherTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'seasons' && <SeasonsTab />}
          {activeTab === 'countries' && <CountriesTab />}
          {bulkProductOpen && (
            <BulkProductUploadModal
              onClose={() => setBulkProductOpen(false)}
              onSuccess={() => { setBulkProductOpen(false); loadData(); }}
            />
          )}
        </>
      )}

    </div>
  );
}

// ==================== SHARED COMPONENTS ====================

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
      <SingleDatePicker value={value} onChange={onChange} />
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
    reader.onload = (e) => { setFileBase64((e.target?.result as string).split(',')[1]); };
    reader.readAsDataURL(file);
  };

  const handlePreview = async () => {
    if (!fileBase64) return;
    setLoading(true);
    const res = await previewProductsUpload(fileBase64);
    setPreview(res); setLoading(false); setStep('preview');
  };

  const handleUpload = async () => {
    if (!fileBase64) return;
    setLoading(true);
    const res = await uploadProducts(fileBase64);
    setResult(res); setLoading(false); setStep('result');
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const b64 = await getProductsSampleFile();
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'products_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloadingTemplate(false); }
  };

  const validRows = preview?.rows.filter(r => !r.hasError) ?? [];
  const errorRows = preview?.rows.filter(r => r.hasError) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]" dir="rtl" onClick={e => e.stopPropagation()}>
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
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
          {(['upload', 'preview', 'result'] as BulkStep[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${step === s ? 'bg-blue-600 text-white' : idx < (['upload', 'preview', 'result'] as BulkStep[]).indexOf(step) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                <span>{idx + 1}</span><span>{['העלאה', 'תצוגה', 'תוצאה'][idx]}</span>
              </div>
              {idx < 2 && <div className="w-6 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${fileBase64 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}>
                <Upload size={36} className={`mx-auto mb-3 ${fileBase64 ? 'text-blue-500' : 'text-slate-300'}`} />
                {fileBase64 ? (
                  <div><p className="font-bold text-blue-700 text-sm">{fileName}</p><p className="text-xs text-blue-400 mt-1">קובץ נטען — לחץ לבחירת קובץ אחר</p></div>
                ) : (
                  <div><p className="font-bold text-slate-600 text-sm">גרור קובץ Excel לכאן, או לחץ לבחירה</p><p className="text-xs text-slate-400 mt-1">קבצים נתמכים: .xlsx, .xls</p></div>
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
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-700"><span>{preview.totalRows} שורות</span></div>
                {validRows.length > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-xs font-bold text-blue-700"><CheckCircle2 size={13} /><span>{validRows.length} תקינות</span></div>}
                {errorRows.length > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full text-xs font-bold text-orange-700"><AlertCircle size={13} /><span>{errorRows.length} שגיאות</span></div>}
                {preview.warningCount > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-xs font-bold text-amber-700"><AlertTriangle size={13} /><span>{preview.warningCount} אזהרות</span></div>}
              </div>
              {preview.globalErrors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  {preview.globalErrors.map((e, i) => <p key={i} className="text-sm text-orange-700 font-medium">{e}</p>)}
                </div>
              )}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">ברקוד</th><th className="px-3 py-2.5">שם עברי</th>
                        <th className="px-3 py-2.5">שם זר</th><th className="px-3 py-2.5">כשרות</th><th className="px-3 py-2.5">מחלקה</th>
                        <th className="px-3 py-2.5">לקוח</th><th className="px-3 py-2.5">סטטוס</th>
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
                            {r.kosher_id ? <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{r.kosher_name}</span>
                              : <span className="text-orange-500 font-bold">{r.kosher_name || 'חסר'}</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{r.department}</td>
                          <td className="px-3 py-2 text-slate-400">{r.customer_name}</td>
                          <td className="px-3 py-2">
                            {r.hasError ? <span className="flex items-center gap-1 text-orange-600 font-bold"><AlertCircle size={12} />{r.errorMsg}</span>
                              : r.isWarning ? <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={12} />{r.warningMsg}</span>
                              : <span className="flex items-center gap-1 text-blue-600"><CheckCircle2 size={12} />תקין</span>}
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
                </div>
              )}
            </div>
          )}
          {step === 'result' && result && (
            <div className="space-y-4 py-4">
              <div className={`rounded-2xl p-6 text-center border-2 ${result.success ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                {result.success ? <CheckCircle2 size={48} className="mx-auto mb-3 text-blue-500" /> : <AlertCircle size={48} className="mx-auto mb-3 text-orange-500" />}
                <p className={`text-xl font-black ${result.success ? 'text-blue-800' : 'text-orange-800'}`}>
                  {result.success ? 'ההעלאה הצליחה' : 'ההעלאה הסתיימה עם שגיאות'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center"><p className="text-3xl font-black text-blue-700">{result.inserted}</p><p className="text-xs text-blue-500 mt-1 font-bold">מוצרים נוספו</p></div>
                <div className="bg-slate-50 rounded-xl p-4 text-center"><p className="text-3xl font-black text-slate-500">{result.skipped}</p><p className="text-xs text-slate-400 mt-1 font-bold">דולגו (קיימים)</p></div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-orange-700">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">סגור</button>
          <div className="flex gap-2">
            {step === 'preview' && <button onClick={() => { setStep('upload'); setPreview(null); }} className="px-4 py-2 text-sm border border-slate-200 rounded-xl font-bold hover:bg-slate-50">חזור</button>}
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
              <button onClick={onSuccess} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">סיום</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
