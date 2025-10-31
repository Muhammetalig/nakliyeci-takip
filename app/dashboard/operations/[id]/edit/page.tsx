'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../lib/contexts/AuthContext';
import { app as firebaseApp } from '../../../../../lib/firebaseClient';
import { Carrier, Operation, OperationFormData, Vehicle, DocumentType, Document } from '../../../../../lib/types';
import { getAllCarriers, getOperation, updateOperation, uploadFileResumable } from '../../../../../lib/firebase-service';
import toast from 'react-hot-toast';

const EditOperationPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user, loading, logout } = useAuth();

  const opId = useMemo(() => String(params?.id ?? ''), [params]);

  // Data sources
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);

  // Form state
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [manualVehicle, setManualVehicle] = useState<{ plaka: string; aracTipi: string }>({ plaka: '', aracTipi: 'Tır' });
  const [form, setForm] = useState<Partial<OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);

  type LocalDoc = { evrakNo?: string; file?: File; uploadedAt?: Date; progress?: number; status?: 'queued'|'uploading'|'done'|'error'; bytesTransferred?: number; totalBytes?: number; speedMBps?: number; etaSec?: number };
  const docTypes: { key: DocumentType; label: string }[] = [
    { key: 'teslim_evraki', label: 'Teslim Evrakı' },
    { key: 'nakliyeci_faturasi', label: 'Nakliyeci Faturası' },
    { key: 'musteri_faturasi', label: 'Müşteri Faturası' },
    { key: 'dekont', label: 'Dekont' },
    { key: 'ellecleme_belgesi', label: 'Elleçleme Belgesi' },
    { key: 'hammaliye_belgesi', label: 'Hammaliye Belgesi' }
  ];
  const emptyDocs = (): Record<DocumentType, LocalDoc> => ({
    teslim_evraki: {},
    nakliyeci_faturasi: {},
    musteri_faturasi: {},
    dekont: {},
    ellecleme_belgesi: {},
    hammaliye_belgesi: {}
  });
  const [docs, setDocs] = useState<Record<DocumentType, LocalDoc>>(emptyDocs());

  const isSaveReady = useMemo(() => {
    return Boolean(
      form.seferNo &&
      selectedCarrierId &&
      ((form.vehicleId && String(form.vehicleId).length > 0) || (manualVehicle.plaka && manualVehicle.plaka.trim().length > 0))
    );
  }, [form.seferNo, selectedCarrierId, form.vehicleId, manualVehicle.plaka]);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı`)), ms);
      promise
        .then((val) => { clearTimeout(timer); resolve(val); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load carriers and operation
  useEffect(() => {
    const load = async () => {
      if (!user || !opId) return;
      try {
        const [carrierList, op] = await Promise.all([
          getAllCarriers(),
          getOperation(opId)
        ]);
        setCarriers(carrierList);
        if (!op) {
          toast.error('Operasyon bulunamadı');
          router.push('/dashboard/operations');
          return;
        }
        setOperation(op);
        // Hydrate form
        setForm({
          seferNo: op.seferNo,
          tasimaTipi: op.tasimaTipi,
          carrierId: op.carrierId,
          carrierName: op.carrierName,
          vehicleId: op.vehicleId,
          vehiclePlaka: op.vehiclePlaka,
          vehicleType: op.vehicleType,
          cekiciPlaka: op.cekiciPlaka,
          dorsePlaka: op.dorsePlaka,
          yuklemetarihi: new Date(op.yuklemetarihi),
          bosaltmaTarihi: new Date(op.bosaltmaTarihi),
          siparisTarihi: new Date(op.siparisTarihi),
          cikisNoktasi: op.cikisNoktasi,
          varisNoktasi: op.varisNoktasi,
          yuklemeAdresi: op.yuklemeAdresi,
          varisAdresi: op.varisAdresi,
          musteriAdi: op.musteriAdi,
          gondericifirma: op.gondericifirma,
          aliciirma: op.aliciirma,
          tedarikciirma: op.tedarikciirma,
          siparisNo: op.siparisNo,
          irsaliyeNo: op.irsaliyeNo,
          faturaNo: op.faturaNo,
          adet: op.adet,
          kg: op.kg,
          desi: op.desi,
          yukAgirligi: op.yukAgirligi,
          malzemeBilgisi: op.malzemeBilgisi,
          malBedeli: op.malBedeli,
          toplamTutar: op.toplamTutar,
          paraBirimi: op.paraBirimi,
          vadeSuresi: op.vadeSuresi,
          soforAdi: op.soforAdi,
          soforTelefonu: op.soforTelefonu,
          aracMaliyeti: op.aracMaliyeti,
          navlunSatisTutari: op.navlunSatisTutari,
          elleclemeFaturasi: Boolean(op.elleclemeFaturasi),
          hammaliyeFaturasi: Boolean(op.hammaliyeFaturasi)
        });
        setSelectedCarrierId(op.carrierId);
        // If vehicleId is not under the carrier vehicles, set manual
        const carrier = carrierList.find(c => c.id === op.carrierId);
        const vehicles = carrier?.vehicles || [];
        setAvailableVehicles(vehicles);
        if (!vehicles.find(v => v.id === op.vehicleId)) {
          setManualVehicle({ plaka: op.vehiclePlaka, aracTipi: op.vehicleType || 'Tır' });
        }
      } catch (e) {
        console.error(e);
        toast.error('Veriler yüklenemedi');
      }
    };
    load();
  }, [user, opId, router]);

  // Update vehicles when carrier changes
  useEffect(() => {
    const c = carriers.find(c => c.id === selectedCarrierId);
    setAvailableVehicles(c?.vehicles || []);
  }, [selectedCarrierId, carriers]);

  const handleChange = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedVehicle = useMemo(() => {
    if (!form.vehicleId) return undefined;
    return availableVehicles.find(v => v.id === form.vehicleId);
  }, [form.vehicleId, availableVehicles]);

  const computeProfit = () => {
    const satis = Number(form.navlunSatisTutari || 0);
    const maliyet = Number(form.aracMaliyeti || 0);
    return { kar: satis - maliyet, karYuzde: maliyet > 0 ? ((satis - maliyet) / maliyet) * 100 : 0 };
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operation) return;

    if (!form.seferNo) return toast.error('Sefer No zorunludur');
    if (!selectedCarrierId) return toast.error('Nakliyeci seçin');

    const vehicle = selectedVehicle || (manualVehicle.plaka ? { id: `manual-${crypto.randomUUID()}`, plaka: manualVehicle.plaka, aracTipi: manualVehicle.aracTipi } as Vehicle : undefined);
    if (!vehicle) return toast.error('Araç seçin veya manuel ekleyin');

    try {
      if (submitting) return;
      setSubmitting(true);

      // Storage preflight
      const storageBucket = (firebaseApp?.options as { storageBucket?: string } | undefined)?.storageBucket;
      if (!storageBucket) {
        toast.error('Dosya yüklemek için Firebase Storage etkin değil.');
        return;
      }

      const updates: Partial<Operation> = {
        seferNo: String(form.seferNo),
        tasimaTipi: (String(form.tasimaTipi || 'FTL') as OperationFormData['tasimaTipi']),
        carrierId: selectedCarrierId,
        carrierName: String(carriers.find(c => c.id === selectedCarrierId)?.firmaAdi || ''),
        vehicleId: vehicle.id,
        vehiclePlaka: vehicle.plaka,
        vehicleType: vehicle.aracTipi,
        cekiciPlaka: String(form.cekiciPlaka || ''),
        dorsePlaka: String(form.dorsePlaka || ''),
        yuklemetarihi: form.yuklemetarihi ? (form.yuklemetarihi instanceof Date ? form.yuklemetarihi : new Date(String(form.yuklemetarihi))) : new Date(),
        bosaltmaTarihi: form.bosaltmaTarihi ? (form.bosaltmaTarihi instanceof Date ? form.bosaltmaTarihi : new Date(String(form.bosaltmaTarihi))) : new Date(),
        siparisTarihi: form.siparisTarihi ? (form.siparisTarihi instanceof Date ? form.siparisTarihi : new Date(String(form.siparisTarihi))) : new Date(),
        cikisNoktasi: String(form.cikisNoktasi || ''),
        varisNoktasi: String(form.varisNoktasi || ''),
        yuklemeAdresi: String(form.yuklemeAdresi || ''),
        varisAdresi: String(form.varisAdresi || ''),
        musteriAdi: String(form.musteriAdi || ''),
        gondericifirma: String(form.gondericifirma || ''),
        aliciirma: String(form.aliciirma || ''),
        tedarikciirma: String(form.tedarikciirma || ''),
        siparisNo: String(form.siparisNo || ''),
        irsaliyeNo: String(form.irsaliyeNo || ''),
        faturaNo: String(form.faturaNo || ''),
        adet: Number(form.adet || 0),
        kg: Number(form.kg || 0),
        desi: Number(form.desi || 0),
        yukAgirligi: Number(form.yukAgirligi || 0),
        malzemeBilgisi: String(form.malzemeBilgisi || ''),
        malBedeli: Number(form.malBedeli || 0),
        toplamTutar: Number(form.toplamTutar || 0),
        paraBirimi: (String(form.paraBirimi || 'TRY') as OperationFormData['paraBirimi']),
        vadeSuresi: Number(form.vadeSuresi || 0),
        soforAdi: String(form.soforAdi || ''),
        soforTelefonu: String(form.soforTelefonu || ''),
        aracMaliyeti: Number(form.aracMaliyeti || 0),
        navlunSatisTutari: Number(form.navlunSatisTutari || 0),
        elleclemeFaturasi: Boolean(form.elleclemeFaturasi),
        hammaliyeFaturasi: Boolean(form.hammaliyeFaturasi)
      };

      // Kar
      const kar = (updates.navlunSatisTutari ?? 0) - (updates.aracMaliyeti ?? 0);
      const maliyet = updates.aracMaliyeti ?? 0;
      const karYuzde = maliyet > 0 ? (kar / maliyet) * 100 : 0;
      updates.kar = kar;
      updates.karYuzde = karYuzde;

      // Upload new docs if chosen
      const toUpload = docTypes
        .map(d => ({ key: d.key, label: d.label }))
        .filter(({ key }) => Boolean(docs[key]?.file));

      const concurrency = 3;
      const jobs: Array<() => Promise<Document | null>> = toUpload.map(({ key, label }) => {
        return async () => {
          const current = docs[key];
          if (!current?.file) return null;
          if (current.file.type !== 'application/pdf') {
            toast.error(`${label} için yalnızca PDF yüklenebilir`);
            return null;
          }
          try {
            setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'uploading', progress: 0 } }));
            const start = Date.now();
            const url = await withTimeout(
              uploadFileResumable(current.file, 'operations', operation.id, key, ({ percent, bytesTransferred, totalBytes }) => {
                const elapsedSec = Math.max(0.001, (Date.now() - start) / 1000);
                const speedBps = bytesTransferred / elapsedSec;
                const speedMBps = speedBps / (1024 * 1024);
                const remaining = Math.max(0, totalBytes - bytesTransferred);
                const etaSec = speedBps > 0 ? remaining / speedBps : undefined;
                setDocs(prev => ({
                  ...prev,
                  [key]: { ...prev[key], progress: percent, status: 'uploading', bytesTransferred, totalBytes, speedMBps, etaSec }
                }));
              }),
              120000,
              `${label} yükleme`
            );
            setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'done', progress: 100, speedMBps: 0, etaSec: 0 } }));
            return {
              id: crypto.randomUUID(),
              type: key,
              evrakNo: current.evrakNo,
              fileName: current.file.name,
              fileUrl: url,
              uploadedAt: new Date(),
              uploadedBy: ''
            } as Document;
          } catch (err) {
            console.error(err);
            setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'error' } }));
            toast.error(`${label} yüklenemedi`);
            return null;
          }
        };
      });

      const uploadedResults: Array<Document | null> = [];
      const executing: Promise<void>[] = [];
      for (const job of jobs) {
        const p = job().then((r) => { uploadedResults.push(r); });
        const e: Promise<void> = p.then(() => {
          const idx = executing.indexOf(e);
          if (idx > -1) executing.splice(idx, 1);
        });
        executing.push(e);
        if (executing.length >= concurrency) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);
      const uploadedDocs = uploadedResults.filter(Boolean) as Document[];

      const newDocs = uploadedDocs.length > 0
        ? [ ...(operation.documents || []), ...uploadedDocs ]
        : undefined;

      await withTimeout(updateOperation(operation.id, { ...updates, ...(newDocs ? { documents: newDocs } : {}) }), 60000, 'Operasyon güncelleme');

      toast.success('Güncellendi');
      router.push(`/dashboard/operations/${operation.id}`);
    } catch (e) {
      console.error(e);
      toast.error('Operasyon güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yükleniyor...</div>;
  }
  if (!operation) {
    return <div style={{ padding: 24 }}>Operasyon yükleniyor...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: 'white', boxShadow: '2px 0 4px rgba(0,0,0,0.1)', padding: '24px 0 80px 0', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px 32px 24px', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          <img src="/uygulamaicon.jpeg" alt="logo" style={{ height: 56, width: 'auto' }} />
        </div>
        <nav style={{ padding: '0 16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>🏠 Ana Sayfa</div></div>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/operations')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>📊 Operasyon Yönetimi</div></div>
        </nav>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <button onClick={async () => { await logout(); router.replace('/login'); }} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>🚪 Çıkış Yap</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1 }}>
        <header style={{ background: 'white', padding: '16px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>Operasyon Düzenle</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push(`/dashboard/operations/${operation.id}`)} style={{ background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>← Detaya Dön</button>
          </div>
        </header>

        <form onSubmit={onSave} style={{ padding: 32 }}>
          {/* Operasyon & Araç */}
          <section style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>Operasyon & Araç</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Field label='Sefer No'>
                <input value={String(form.seferNo||'')} onChange={(e)=>handleChange('seferNo', e.target.value)} style={input} placeholder='Örn. OP-2025-001' />
              </Field>
              <Field label='Taşıma Tipi'>
                <select value={String(form.tasimaTipi||'FTL')} onChange={(e)=>handleChange('tasimaTipi', e.target.value)} style={input}>
                  <option value='FTL'>FTL</option>
                  <option value='LTL'>LTL</option>
                </select>
              </Field>
              <Field label='Nakliyeci'>
                <select value={selectedCarrierId} onChange={(e)=>{ setSelectedCarrierId(e.target.value); }} style={input}>
                  <option value=''>Seçin</option>
                  {carriers.map(c=> (<option key={c.id} value={c.id}>{c.firmaAdi}</option>))}
                </select>
              </Field>
              <Field label='Araç'>
                <select value={String(form.vehicleId||'')} onChange={(e)=>{ const id=e.target.value; handleChange('vehicleId', id); const v=availableVehicles.find(v=>v.id===id); handleChange('vehiclePlaka', v?.plaka||''); handleChange('vehicleType', v?.aracTipi||''); }} style={input}>
                  <option value=''>Seçin</option>
                  {availableVehicles.map(v=> (<option key={v.id} value={v.id}>{v.plaka} • {v.aracTipi}</option>))}
                </select>
              </Field>
              <Field label='Manuel Plaka'>
                <input value={manualVehicle.plaka} onChange={(e)=>setManualVehicle({...manualVehicle, plaka: e.target.value})} style={input} placeholder='Örn. 34 ABC 123' />
              </Field>
              <Field label='Manuel Araç Tipi'>
                <select value={manualVehicle.aracTipi} onChange={(e)=>setManualVehicle({...manualVehicle, aracTipi: e.target.value})} style={input}>
                  <option>Tır</option>
                  <option>Kamyon</option>
                  <option>Kamyonet</option>
                </select>
              </Field>
              <Field label='Çekici Plaka'>
                <input value={String(form.cekiciPlaka||'')} onChange={(e)=>handleChange('cekiciPlaka', e.target.value)} style={input} />
              </Field>
              <Field label='Dorse Plaka'>
                <input value={String(form.dorsePlaka||'')} onChange={(e)=>handleChange('dorsePlaka', e.target.value)} style={input} />
              </Field>
            </div>
          </section>

          {/* Tarih & Lokasyon */}
          <section style={section}>
            <h2 style={h2}>Tarih & Lokasyon</h2>
            <div style={grid4}>
              <Field label='Yükleme Tarihi'><input type='date' value={toInputDate(form.yuklemetarihi as Date)} onChange={(e)=>handleChange('yuklemetarihi', new Date(e.target.value))} style={input} /></Field>
              <Field label='Boşaltma Tarihi'><input type='date' value={toInputDate(form.bosaltmaTarihi as Date)} onChange={(e)=>handleChange('bosaltmaTarihi', new Date(e.target.value))} style={input} /></Field>
              <Field label='Çıkış Noktası / İl'><input value={String(form.cikisNoktasi||'')} onChange={(e)=>handleChange('cikisNoktasi', e.target.value)} style={input} /></Field>
              <Field label='Varış Noktası / İl'><input value={String(form.varisNoktasi||'')} onChange={(e)=>handleChange('varisNoktasi', e.target.value)} style={input} /></Field>
              <Field label='Yükleme Adresi'><input value={String(form.yuklemeAdresi||'')} onChange={(e)=>handleChange('yuklemeAdresi', e.target.value)} style={input} /></Field>
              <Field label='Varış Adresi'><input value={String(form.varisAdresi||'')} onChange={(e)=>handleChange('varisAdresi', e.target.value)} style={input} /></Field>
              <Field label='Sipariş Tarihi'><input type='date' value={toInputDate(form.siparisTarihi as Date)} onChange={(e)=>handleChange('siparisTarihi', new Date(e.target.value))} style={input} /></Field>
              <Field label='Sipariş No'><input value={String(form.siparisNo||'')} onChange={(e)=>handleChange('siparisNo', e.target.value)} style={input} /></Field>
            </div>
          </section>

          {/* Firma & Belgeler */}
          <section style={section}>
            <h2 style={h2}>Firma & Belgeler</h2>
            <div style={grid4}>
              <Field label='Müşteri Adı'><input value={String(form.musteriAdi||'')} onChange={(e)=>handleChange('musteriAdi', e.target.value)} style={input} /></Field>
              <Field label='Gönderici Firma'><input value={String(form.gondericifirma||'')} onChange={(e)=>handleChange('gondericifirma', e.target.value)} style={input} /></Field>
              <Field label='Alıcı Firma'><input value={String(form.aliciirma||'')} onChange={(e)=>handleChange('aliciirma', e.target.value)} style={input} /></Field>
              <Field label='Tedarikçi Firma'><input value={String(form.tedarikciirma||'')} onChange={(e)=>handleChange('tedarikciirma', e.target.value)} style={input} /></Field>
              <Field label='İrsaliye No'><input value={String(form.irsaliyeNo||'')} onChange={(e)=>handleChange('irsaliyeNo', e.target.value)} style={input} /></Field>
              <Field label='Fatura No'><input value={String(form.faturaNo||'')} onChange={(e)=>handleChange('faturaNo', e.target.value)} style={input} /></Field>
            </div>
          </section>

          {/* Yük & Finans */}
          <section style={section}>
            <h2 style={h2}>Yük & Finans</h2>
            <div style={grid4}>
              <Field label='Adet'><input type='number' value={form.adet ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('adet', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Kg'><input type='number' value={form.kg ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('kg', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Desi'><input type='number' value={form.desi ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('desi', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Yük Ağırlığı (kg)'><input type='number' value={form.yukAgirligi ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('yukAgirligi', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Malzeme / Yük Bilgisi'><input value={String(form.malzemeBilgisi||'')} onChange={(e)=>handleChange('malzemeBilgisi', e.target.value)} style={input} /></Field>
              <Field label='Mal Bedeli'><input type='number' value={form.malBedeli ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('malBedeli', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Toplam Tutar'><input type='number' value={form.toplamTutar ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('toplamTutar', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Para Birimi'>
                <select value={String(form.paraBirimi||'TRY')} onChange={(e)=>handleChange('paraBirimi', e.target.value)} style={input}>
                  <option value='TRY'>TRY</option>
                  <option value='USD'>USD</option>
                  <option value='EUR'>EUR</option>
                </select>
              </Field>
              <Field label='Vade Süresi (gün)'><input type='number' value={form.vadeSuresi ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('vadeSuresi', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Şoför Ad Soyad'><input value={String(form.soforAdi||'')} onChange={(e)=>handleChange('soforAdi', e.target.value)} style={input} /></Field>
              <Field label='Şoför Telefonu'><input value={String(form.soforTelefonu||'')} onChange={(e)=>handleChange('soforTelefonu', e.target.value)} style={input} /></Field>
              <Field label='Araç Maliyeti (Alış maliyeti)'><input type='number' value={form.aracMaliyeti ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('aracMaliyeti', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Navlun Satış Tutarı'><input type='number' value={form.navlunSatisTutari ?? ''} onChange={(e)=>{ const v=e.target.value; handleChange('navlunSatisTutari', v === '' ? undefined : Number(v)); }} style={input} /></Field>
              <Field label='Kar (otomatik)'><input disabled value={computeProfit().kar.toFixed(2)} style={{ ...input, background: '#f9fafb' }} /></Field>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <label style={switchLabel}><input type='checkbox' checked={Boolean(form.elleclemeFaturasi)} onChange={(e)=>handleChange('elleclemeFaturasi', e.target.checked)} /> Elleçleme faturası yüklenecek</label>
              <label style={switchLabel}><input type='checkbox' checked={Boolean(form.hammaliyeFaturasi)} onChange={(e)=>handleChange('hammaliyeFaturasi', e.target.checked)} /> Hammaliye faturası yüklenecek</label>
            </div>
          </section>

          {/* Mevcut dokümanlar */}
          <section style={section}>
            <h2 style={h2}>Mevcut Dokümanlar</h2>
            {operation.documents && operation.documents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {operation.documents.map((d: Document) => (
                  <div key={d.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: 'white' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{toLabel(d.type)}</div>
                    <div style={{ fontSize: 14, color: '#374151' }}>Evrak No: {d.evrakNo || '-'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Yüklendi: {new Date(d.uploadedAt).toLocaleString('tr-TR')}</div>
                    <div style={{ marginTop: 8 }}>
                      <a href={d.fileUrl} target='_blank' rel='noreferrer' style={{ background: '#10b981', color: 'white', borderRadius: 6, padding: '6px 10px', textDecoration: 'none', fontSize: 14 }}>PDF Aç</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>Bu operasyona ait doküman bulunmuyor.</div>
            )}
          </section>

          {/* Yeni evrak ekle */}
          <section style={section}>
            <h2 style={h2}>Yeni Evrak Ekle</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {docTypes.map(({ key, label }) => (
                <div key={key} style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, background: '#fff' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input placeholder='Evrak No' value={docs[key].evrakNo || ''} onChange={(e)=> setDocs(prev=>({ ...prev, [key]: { ...prev[key], evrakNo: e.target.value } }))} style={input} />
                    <label style={{ display: 'inline-block', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', background: 'white', color: '#374151' }}>
                      PDF Seç
                      <input type='file' accept='application/pdf' style={{ display:'none' }} onChange={(e)=>{
                        const f = e.target.files?.[0];
                        if (f) setDocs(prev=>({ ...prev, [key]: { ...prev[key], file: f, uploadedAt: new Date(), progress: 0, status: 'queued' } }));
                      }} />
                    </label>
                  </div>
                  {docs[key]?.file && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                      Seçili: {docs[key].file?.name} {docs[key].uploadedAt ? `• ${docs[key].uploadedAt.toLocaleString('tr-TR')}` : ''}
                      {docs[key].status === 'queued' && (
                        <div style={{ marginTop: 6, color: '#6b7280' }}>Hazır (Kaydet'e basınca yüklenecek)</div>
                      )}
                      {docs[key].status !== 'queued' && typeof docs[key].progress === 'number' && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 6 }}>
                            <div style={{ width: `${docs[key].progress}%`, height: 6, background: docs[key].status==='error' ? '#ef4444' : '#3b82f6', borderRadius: 6 }} />
                          </div>
                          <div style={{ marginTop: 4, color: docs[key].status==='error' ? '#ef4444' : '#6b7280' }}>
                            {docs[key].status==='uploading' && `Yükleniyor... %${docs[key].progress}`}
                            {docs[key].status==='done' && 'Yüklendi'}
                            {docs[key].status==='error' && 'Yüklenemedi'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Yalnızca PDF dosyaları kabul edilir.</div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type='button' onClick={()=>router.push(`/dashboard/operations/${operation.id}`)} style={{ background: 'white', border: '1px solid #d1d5db', color: '#374151', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>İptal</button>
            <button type='submit' disabled={!isSaveReady || submitting} style={{ background: (!isSaveReady || submitting) ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: (!isSaveReady || submitting) ? 'not-allowed' : 'pointer', opacity: submitting ? 0.85 : 1 }}>{submitting ? 'Güncelleniyor…' : 'Güncelle'}</button>
          </div>
        </form>
      </main>
    </div>
  );
};

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const section: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' };
const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 };
const switchLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' };

function toInputDate(d?: Date) {
  const date = d instanceof Date ? d : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLabel(type: string) {
  switch (type) {
    case 'teslim_evraki': return 'Teslim Evrakı';
    case 'nakliyeci_faturasi': return 'Nakliyeci Faturası';
    case 'musteri_faturasi': return 'Müşteri Faturası';
    case 'dekont': return 'Dekont';
    case 'ellecleme_belgesi': return 'Elleçleme Belgesi';
    case 'hammaliye_belgesi': return 'Hammaliye Belgesi';
    default: return type;
  }
}

export default EditOperationPage;
