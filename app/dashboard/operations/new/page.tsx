'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import { app as firebaseApp } from '../../../../lib/firebaseClient';
import { Carrier, OperationFormData, Vehicle, DocumentType } from '../../../../lib/types';
import { createOperationFromForm, getAllCarriers, uploadFileResumable, updateOperation } from '../../../../lib/firebase-service';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type ExcelRow = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(',', '.').trim();
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function excelDateToJSDate(n: number): Date {
  // Excel 1900 date system: days since 1899-12-30
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + n * 86400000);
}

function asDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') return excelDateToJSDate(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

const NewOperationPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [manualVehicle, setManualVehicle] = useState<{ plaka: string; aracTipi: string }>({ plaka: '', aracTipi: 'Tır' });
  // Evraklar için lokal state
  type LocalDoc = { evrakNo?: string; file?: File; uploadedAt?: Date; progress?: number; status?: 'queued'|'uploading'|'done'|'error' };
  const docTypes: { key: DocumentType; label: string }[] = [
    { key: 'teslim_evraki', label: 'Teslim Evrakı' },
    { key: 'nakliyeci_faturasi', label: 'Nakliyeci Faturası' },
    { key: 'musteri_faturasi', label: 'Müşteri Faturası' },
    { key: 'dekont', label: 'Dekont' },
    { key: 'ellecleme_belgesi', label: 'Elleçleme Belgesi' },
    { key: 'hammaliye_belgesi', label: 'Hammaliye Belgesi' }
  ];
  const [docs, setDocs] = useState<Record<DocumentType, LocalDoc>>({
    teslim_evraki: {},
    nakliyeci_faturasi: {},
    musteri_faturasi: {},
    dekont: {},
    ellecleme_belgesi: {},
    hammaliye_belgesi: {}
  });
  const getInitialDocs = (): Record<DocumentType, LocalDoc> => ({
    teslim_evraki: {},
    nakliyeci_faturasi: {},
    musteri_faturasi: {},
    dekont: {},
    ellecleme_belgesi: {},
    hammaliye_belgesi: {}
  });

  const getInitialForm = (): Partial<OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean }> => ({
    tasimaTipi: 'FTL',
    paraBirimi: 'TRY',
    yuklemetarihi: new Date(),
    bosaltmaTarihi: new Date(),
    siparisTarihi: new Date(),
    elleclemeFaturasi: false,
    hammaliyeFaturasi: false
  });
  const [form, setForm] = useState<Partial<OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean }>>(getInitialForm());
  const [submitting, setSubmitting] = useState(false);
  const [importedRows, setImportedRows] = useState<Array<Partial<OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean }>>>([]);
  const [importedDocs, setImportedDocs] = useState<Record<number, Record<DocumentType, LocalDoc>>>({});
  // Zorunlu alanları kontrol et
  const validateForm = (data: Partial<OperationFormData>): boolean => {
    return Boolean(
      data.seferNo && String(data.seferNo).trim() &&
      data.carrierId && String(data.carrierId).trim() &&
      data.carrierName && String(data.carrierName).trim() &&
      data.vehiclePlaka && String(data.vehiclePlaka).trim() &&
      data.vehicleType && String(data.vehicleType).trim() &&
      data.yuklemetarihi &&
      data.bosaltmaTarihi &&
      data.siparisTarihi &&
      data.cikisNoktasi && String(data.cikisNoktasi).trim() &&
      data.varisNoktasi && String(data.varisNoktasi).trim() &&
      data.yuklemeAdresi && String(data.yuklemeAdresi).trim() &&
      data.varisAdresi && String(data.varisAdresi).trim() &&
      data.musteriAdi && String(data.musteriAdi).trim() &&
      data.gondericifirma && String(data.gondericifirma).trim() &&
      data.aliciirma && String(data.aliciirma).trim() &&
      data.siparisNo && String(data.siparisNo).trim() &&
      data.irsaliyeNo && String(data.irsaliyeNo).trim() &&
      data.faturaNo && String(data.faturaNo).trim() &&
      data.malzemeBilgisi && String(data.malzemeBilgisi).trim() &&
      data.soforAdi && String(data.soforAdi).trim() &&
      data.soforTelefonu && String(data.soforTelefonu).trim() &&
      typeof data.adet === 'number' && data.adet >= 0 &&
      typeof data.kg === 'number' && data.kg >= 0 &&
      typeof data.yukAgirligi === 'number' && data.yukAgirligi >= 0 &&
      typeof data.toplamTutar === 'number' && data.toplamTutar > 0 &&
      typeof data.aracMaliyeti === 'number' && data.aracMaliyeti >= 0 &&
      typeof data.navlunSatisTutari === 'number' && data.navlunSatisTutari >= 0
    );
  };

  const isSaveReady = useMemo(() => {
    return Boolean(
      form.seferNo &&
      selectedCarrierId &&
      ((form.vehicleId && String(form.vehicleId).length > 0) || (manualVehicle.plaka && manualVehicle.plaka.trim().length > 0)) &&
      validateForm({ ...form, carrierId: selectedCarrierId, carrierName: carriers.find(c => c.id === selectedCarrierId)?.firmaAdi })
    );
  }, [form, selectedCarrierId, carriers, manualVehicle.plaka]);

  // Yardımcı: Promise için zaman aşımı uygula
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

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const list = await getAllCarriers();
        setCarriers(list);
      } catch (e) {
        console.error(e);
        toast.error('Nakliyeci listesi yüklenemedi');
      }
    };
    load();
  }, [user]);

  // Araç listesi - seçilen nakliyeciye göre
  useEffect(() => {
    const c = carriers.find(c => c.id === selectedCarrierId);
    setAvailableVehicles(c?.vehicles || []);
  }, [selectedCarrierId, carriers]);

  const handleChange = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const selectedVehicle = useMemo(() => {
    if (!form.vehicleId) return undefined;
    return availableVehicles.find(v => v.id === form.vehicleId);
  }, [form.vehicleId, availableVehicles]);

  const computeProfit = () => {
    const satis = Number(form.navlunSatisTutari || 0);
    const maliyet = Number(form.aracMaliyeti || 0);
    return { kar: satis - maliyet, karYuzde: maliyet > 0 ? ((satis - maliyet) / maliyet) * 100 : 0 };
  };

  const onDownloadTemplate = () => {
    const headers = [[
      'seferNo','tasimaTipi','carrierName','vehiclePlaka','vehicleType','cekiciPlaka','dorsePlaka','yuklemeTarihi','cikisNoktasi','varisNoktasi','bosaltmaTarihi','yuklemeAdresi','varisAdresi','musteriAdi','gondericiFirma','aliciFirma','tedarikciFirma','siparisTarihi','siparisNo','irsaliyeNo','faturaNo','adet','kg','desi','yukAgirligi','malzemeBilgisi','malBedeli','toplamTutar','paraBirimi','vadeSuresi','soforAdi','soforTelefonu','aracMaliyeti','navlunSatisTutari'
    ]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'operation-template.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws);
    if (!rows.length) return toast.error('Excel boş');

    const parseRow = (r: ExcelRow) => {
      // Araç plakasına göre nakliyeci/araç eşlemesi
      let matchedCarrier: Carrier | undefined;
      let matchedVehicle: Vehicle | undefined;
      const plate = String(asString(r['vehiclePlaka']) || '').trim();
      if (plate) {
        for (const c of carriers) {
          const v = (c.vehicles || []).find(v => v.plaka === plate);
          if (v) { matchedCarrier = c; matchedVehicle = v; break; }
        }
      }

      const gS = (k: string) => asString(r[k]);
      const gN = (k: string) => asNumber(r[k]);
      const gD = (k: string) => asDate(r[k]);

      return {
        seferNo: gS('seferNo') ?? '',
        tasimaTipi: (gS('tasimaTipi') as OperationFormData['tasimaTipi'] | undefined) ?? 'FTL',
        carrierId: matchedCarrier?.id ?? '',
        carrierName: matchedCarrier?.firmaAdi ?? '',
        vehicleId: matchedVehicle?.id ?? '',
        vehiclePlaka: matchedVehicle?.plaka ?? gS('vehiclePlaka') ?? '',
        vehicleType: matchedVehicle?.aracTipi ?? gS('vehicleType') ?? 'Tır',
        cekiciPlaka: gS('cekiciPlaka') ?? '',
        dorsePlaka: gS('dorsePlaka') ?? '',
        yuklemetarihi: gD('yuklemeTarihi') ?? new Date(),
        cikisNoktasi: gS('cikisNoktasi') ?? '',
        varisNoktasi: gS('varisNoktasi') ?? '',
        bosaltmaTarihi: gD('bosaltmaTarihi') ?? new Date(),
        yuklemeAdresi: gS('yuklemeAdresi') ?? '',
        varisAdresi: gS('varisAdresi') ?? '',
        musteriAdi: gS('musteriAdi') ?? '',
        gondericifirma: gS('gondericiFirma') ?? '',
        aliciirma: gS('aliciFirma') ?? '',
        tedarikciirma: gS('tedarikciFirma') ?? '',
        siparisTarihi: gD('siparisTarihi') ?? new Date(),
        siparisNo: gS('siparisNo') ?? '',
        irsaliyeNo: gS('irsaliyeNo') ?? '',
        faturaNo: gS('faturaNo') ?? '',
        adet: gN('adet') ?? 0,
        kg: gN('kg') ?? 0,
        desi: gN('desi') ?? 0,
        yukAgirligi: gN('yukAgirligi') ?? 0,
        malzemeBilgisi: gS('malzemeBilgisi') ?? '',
        malBedeli: gN('malBedeli') ?? 0,
        toplamTutar: gN('toplamTutar') ?? 0,
        paraBirimi: (gS('paraBirimi') as OperationFormData['paraBirimi'] | undefined) ?? 'TRY',
        vadeSuresi: gN('vadeSuresi') ?? 0,
        soforAdi: gS('soforAdi') ?? '',
        soforTelefonu: gS('soforTelefonu') ?? '',
        aracMaliyeti: gN('aracMaliyeti') ?? 0,
        navlunSatisTutari: gN('navlunSatisTutari') ?? 0,
        elleclemeFaturasi: false,
        hammaliyeFaturasi: false
      };
    };

    const parsed = rows.map(parseRow);
    setImportedRows(parsed);
    toast.success(`${parsed.length} satır yüklendi`);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.seferNo) return toast.error('Sefer No zorunludur');
    if (!selectedCarrierId) return toast.error('Nakliyeci seçin');

    const vehicle = selectedVehicle || (manualVehicle.plaka ? { id: `manual-${crypto.randomUUID()}`, plaka: manualVehicle.plaka, aracTipi: manualVehicle.aracTipi } as Vehicle : undefined);

    if (!vehicle) return toast.error('Araç seçin veya manuel ekleyin');

    // Tüm zorunlu alanları kontrol et
    const formData = { ...form, carrierId: selectedCarrierId, carrierName: carriers.find(c => c.id === selectedCarrierId)?.firmaAdi, vehiclePlaka: vehicle.plaka, vehicleType: vehicle.aracTipi };
    if (!validateForm(formData)) {
      return toast.error('Lütfen tüm zorunlu alanları doldurun (Tarihler, Lokasyonlar, Firma Bilgileri, Sefer Detayları)');
    }

    try {
      if (submitting) return; // Çift tıklamayı önle
      setSubmitting(true);

      // Storage etkin mi kontrol et (env/bucket yoksa hızlı uyarı)
      const storageBucket = (firebaseApp?.options as { storageBucket?: string } | undefined)?.storageBucket;
      if (!storageBucket) {
        toast.error('Dosya yüklemek için Firebase Storage etkin değil. Firebase konsolundan Storage kurulumunu yapın.');
        return;
      }
      const payload: OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean } = {
        // Kimlik ve isimler
        seferNo: String(form.seferNo),
        tasimaTipi: (String(form.tasimaTipi || 'FTL') as OperationFormData['tasimaTipi']),
        carrierId: selectedCarrierId,
        carrierName: String(carriers.find(c => c.id === selectedCarrierId)?.firmaAdi || ''),
        vehicleId: vehicle.id,
        vehiclePlaka: vehicle.plaka,
        vehicleType: vehicle.aracTipi,
        cekiciPlaka: String(form.cekiciPlaka || ''),
        dorsePlaka: String(form.dorsePlaka || ''),
        // Tarihler
        yuklemetarihi: form.yuklemetarihi ? (form.yuklemetarihi instanceof Date ? form.yuklemetarihi : new Date(String(form.yuklemetarihi))) : new Date(),
        bosaltmaTarihi: form.bosaltmaTarihi ? (form.bosaltmaTarihi instanceof Date ? form.bosaltmaTarihi : new Date(String(form.bosaltmaTarihi))) : new Date(),
        siparisTarihi: form.siparisTarihi ? (form.siparisTarihi instanceof Date ? form.siparisTarihi : new Date(String(form.siparisTarihi))) : new Date(),
        // Lokasyon/adres
        cikisNoktasi: String(form.cikisNoktasi || ''),
        varisNoktasi: String(form.varisNoktasi || ''),
        yuklemeAdresi: String(form.yuklemeAdresi || ''),
        varisAdresi: String(form.varisAdresi || ''),
        // Firmalar
        musteriAdi: String(form.musteriAdi || ''),
        gondericifirma: String(form.gondericifirma || ''),
        aliciirma: String(form.aliciirma || ''),
        tedarikciirma: String(form.tedarikciirma || ''),
        // Sipariş ve belge no
        siparisNo: String(form.siparisNo || ''),
        irsaliyeNo: String(form.irsaliyeNo || ''),
        faturaNo: String(form.faturaNo || ''),
        // Yük ve finans
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
        // Opsiyonel anahtarlar
        elleclemeFaturasi: Boolean(form.elleclemeFaturasi),
        hammaliyeFaturasi: Boolean(form.hammaliyeFaturasi)
      };

  const created = await withTimeout(createOperationFromForm(payload), 30000, 'Operasyon oluşturma');

      // Evrakları (PDF) yükle ve operasyona ekle — paralel (eşzamanlı 3 yükleme)
      const toUpload = docTypes
        .map(d => ({ key: d.key, label: d.label }))
        .filter(({ key }) => Boolean(docs[key]?.file));

      const concurrency = 3;
      const jobs: Array<() => Promise<{ id: string; type: DocumentType; evrakNo?: string; fileName: string; fileUrl: string; uploadedAt: Date; uploadedBy: string } | null>> = toUpload.map(({ key, label }) => {
        return async () => {
          const current = docs[key];
          if (!current?.file) return null;
          if (current.file.type !== 'application/pdf') {
            toast.error(`${key} için yalnızca PDF yüklenebilir`);
            return null;
          }
          try {
            setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'uploading', progress: 0 } }));
            const start = Date.now();
            const url = await withTimeout(
              uploadFileResumable(current.file, 'operations', created.id, key, ({ percent, bytesTransferred, totalBytes }) => {
                const elapsedSec = Math.max(0.001, (Date.now() - start) / 1000);
                const speedBps = bytesTransferred / elapsedSec;
                const speedMBps = speedBps / (1024 * 1024);
                const remaining = Math.max(0, totalBytes - bytesTransferred);
                const etaSec = speedBps > 0 ? remaining / speedBps : undefined;
                setDocs(prev => ({
                  ...prev,
                  [key]: {
                    ...prev[key],
                    progress: percent,
                    status: 'uploading',
                    bytesTransferred,
                    totalBytes,
                    speedMBps,
                    etaSec
                  }
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
            };
          } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`${label} yüklenemedi: ${msg}`);
            setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'error' } }));
            return null;
          }
        };
      });

      const uploadedResults: Array<{ id: string; type: DocumentType; evrakNo?: string; fileName: string; fileUrl: string; uploadedAt: Date; uploadedBy: string } | null> = [];
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
      const uploadedDocs = uploadedResults.filter(Boolean) as Array<{ id: string; type: DocumentType; evrakNo?: string; fileName: string; fileUrl: string; uploadedAt: Date; uploadedBy: string }>;
      if (uploadedDocs.length > 0) {
        await withTimeout(updateOperation(created.id, { documents: uploadedDocs }), 60000, 'Doküman kaydetme');
      }
      toast.success('Kaydedildi');
      // Formu tamamen sıfırla, yeni boş sayfa göster
      setForm(getInitialForm());
      setSelectedCarrierId('');
      setManualVehicle({ plaka: '', aracTipi: 'Tır' });
      setDocs(getInitialDocs());
    } catch (e) {
      console.error(e);
      toast.error('Operasyon kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yükleniyor...</div>;
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
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/carriers')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>🚛 Nakliyeci İşlemleri</div></div>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/operations')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>📊 Operasyon Yönetimi</div></div>
          <div style={{ background: '#3b82f6', borderRadius: 8, margin: '4px 0', color: 'white' }}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>🆕 Yeni Operasyon</div></div>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/customers')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>👤 Müşteriler</div></div>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/personnel')}> <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>👥 Personel İşlemleri</div></div>
        </nav>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <button onClick={async () => { await logout(); router.replace('/login'); }} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>🚪 Çıkış Yap</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1 }}>
        <header style={{ background: 'white', padding: '16px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>Yeni Operasyon</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Excel Yükle
              <input type='file' accept='.xlsx,.xls' style={{ display: 'none' }} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onImportExcel(f); }} />
            </label>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>👤</div>
          </div>
        </header>

        {importedRows.length === 0 ? (
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

          {/* Evraklar */}
          <section style={section}>
            <h2 style={h2}>Evraklar</h2>
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
                        <div style={{ marginTop: 6, color: '#6b7280' }}>Hazır (Kaydet&apos;e basınca yüklenecek)</div>
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
            <button type='button' onClick={()=>router.push('/dashboard/operations')} style={{ background: 'white', border: '1px solid #d1d5db', color: '#374151', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>İptal</button>
            <button type='submit' disabled={!isSaveReady || submitting} style={{ background: (!isSaveReady || submitting) ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: (!isSaveReady || submitting) ? 'not-allowed' : 'pointer', opacity: submitting ? 0.85 : 1 }}>{submitting ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </form>
        ) : (
          <div style={{ padding: 32 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Excel&apos;den Yüklenen Operasyonlar ({importedRows.length})</h2>
                  {importedRows.some(row => !validateForm(row as OperationFormData)) && (
                    <p style={{ fontSize: 13, color: '#ef4444', margin: '4px 0 0 0', fontWeight: 500 }}>
                      ⚠️ Bazı operasyonlarda eksik bilgi var. Lütfen tüm alanları doldurun.
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setImportedRows([])} style={{ background: 'white', border: '1px solid #d1d5db', color: '#374151', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>İptal</button>
                  <button 
                    onClick={async () => {
                    if (submitting) return;
                    setSubmitting(true);
                    let successCount = 0;
                    for (let i = 0; i < importedRows.length; i++) {
                      const row = importedRows[i];
                      
                      try {
                        const payload: OperationFormData = {
                          seferNo: String(row.seferNo || ''),
                          tasimaTipi: (String(row.tasimaTipi || 'FTL') as OperationFormData['tasimaTipi']),
                          carrierId: String(row.carrierId || ''),
                          carrierName: String(row.carrierName || ''),
                          vehicleId: String(row.vehicleId || ''),
                          vehiclePlaka: String(row.vehiclePlaka || ''),
                          vehicleType: String(row.vehicleType || 'Tır'),
                          cekiciPlaka: String(row.cekiciPlaka || ''),
                          dorsePlaka: String(row.dorsePlaka || ''),
                          yuklemetarihi: row.yuklemetarihi instanceof Date ? row.yuklemetarihi : new Date(),
                          bosaltmaTarihi: row.bosaltmaTarihi instanceof Date ? row.bosaltmaTarihi : new Date(),
                          siparisTarihi: row.siparisTarihi instanceof Date ? row.siparisTarihi : new Date(),
                          cikisNoktasi: String(row.cikisNoktasi || ''),
                          varisNoktasi: String(row.varisNoktasi || ''),
                          yuklemeAdresi: String(row.yuklemeAdresi || ''),
                          varisAdresi: String(row.varisAdresi || ''),
                          musteriAdi: String(row.musteriAdi || ''),
                          gondericifirma: String(row.gondericifirma || ''),
                          aliciirma: String(row.aliciirma || ''),
                          tedarikciirma: String(row.tedarikciirma || ''),
                          siparisNo: String(row.siparisNo || ''),
                          irsaliyeNo: String(row.irsaliyeNo || ''),
                          faturaNo: String(row.faturaNo || ''),
                          adet: Number(row.adet || 0),
                          kg: Number(row.kg || 0),
                          desi: Number(row.desi || 0),
                          yukAgirligi: Number(row.yukAgirligi || 0),
                          malzemeBilgisi: String(row.malzemeBilgisi || ''),
                          malBedeli: Number(row.malBedeli || 0),
                          toplamTutar: Number(row.toplamTutar || 0),
                          paraBirimi: (String(row.paraBirimi || 'TRY') as OperationFormData['paraBirimi']),
                          vadeSuresi: Number(row.vadeSuresi || 0),
                          soforAdi: String(row.soforAdi || ''),
                          soforTelefonu: String(row.soforTelefonu || ''),
                          aracMaliyeti: Number(row.aracMaliyeti || 0),
                          navlunSatisTutari: Number(row.navlunSatisTutari || 0)
                        };
                        const created = await withTimeout(createOperationFromForm(payload), 30000, 'Operasyon oluşturma');
                        
                        // Bu satırın belgelerini yükle
                        const rowDocs = importedDocs[i] || {};
                        const docsToUpload = docTypes
                          .filter(({ key }) => rowDocs[key]?.file)
                          .map(({ key }) => ({ key, file: rowDocs[key].file!, evrakNo: rowDocs[key].evrakNo }));
                        
                        if (docsToUpload.length > 0) {
                          const uploadedDocs: Array<{ id: string; type: DocumentType; evrakNo?: string; fileName: string; fileUrl: string; uploadedAt: Date; uploadedBy: string }> = [];
                          for (const { key, file, evrakNo } of docsToUpload) {
                            try {
                              const url = await withTimeout(
                                uploadFileResumable(file, 'operations', created.id, key, () => {}),
                                120000,
                                `${key} yükleme`
                              );
                              uploadedDocs.push({
                                id: crypto.randomUUID(),
                                type: key,
                                evrakNo,
                                fileName: file.name,
                                fileUrl: url,
                                uploadedAt: new Date(),
                                uploadedBy: ''
                              });
                            } catch (err) {
                              console.error(`${key} yüklenemedi:`, err);
                            }
                          }
                          if (uploadedDocs.length > 0) {
                            await withTimeout(updateOperation(created.id, { documents: uploadedDocs }), 60000, 'Doküman kaydetme');
                          }
                        }
                        
                        successCount++;
                      } catch (e) {
                        console.error(`${row.seferNo} kaydedilemedi:`, e);
                      }
                    }
                    setSubmitting(false);
                    toast.success(`${successCount}/${importedRows.length} operasyon kaydedildi`);
                    setImportedRows([]);
                    setImportedDocs({});
                    router.push('/dashboard/operations');
                  }} 
                    disabled={submitting || importedRows.some(row => !validateForm(row as OperationFormData))} 
                    style={{ 
                      background: (submitting || importedRows.some(row => !validateForm(row as OperationFormData))) ? '#93c5fd' : '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 8, 
                      padding: '8px 16px', 
                      cursor: (submitting || importedRows.some(row => !validateForm(row as OperationFormData))) ? 'not-allowed' : 'pointer', 
                      fontWeight: 500 
                    }}
                  >
                    {submitting ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {importedRows.map((row, idx) => {
                  const isValid = validateForm(row as OperationFormData);
                  return (
                  <div key={idx} style={{ border: `2px solid ${isValid ? '#e5e7eb' : '#ef4444'}`, borderRadius: 8, padding: 16, marginBottom: 12, background: isValid ? 'white' : '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: 0 }}>#{idx + 1} - {row.seferNo || 'Sefer No Yok'}</h3>
                        {!isValid && <span style={{ background: '#ef4444', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>EKSİK BİLGİ</span>}
                      </div>
                      <button onClick={() => setImportedRows(prev => prev.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>🗑️ Sil</button>
                    </div>
                    
                    {/* Operasyon & Araç */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Operasyon & Araç</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                        <Field label='Sefer No'><input value={String(row.seferNo||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], seferNo: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Taşıma Tipi'><select value={String(row.tasimaTipi||'FTL')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], tasimaTipi: e.target.value as 'FTL' | 'LTL'}; return n; })} style={smallInput}><option value='FTL'>FTL</option><option value='LTL'>LTL</option></select></Field>
                        <Field label='Nakliyeci'><input value={String(row.carrierName||'')} disabled style={{...smallInput, background: '#f3f4f6'}} /></Field>
                        <Field label='Araç Plaka'><input value={String(row.vehiclePlaka||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], vehiclePlaka: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Araç Tipi'><input value={String(row.vehicleType||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], vehicleType: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Çekici Plaka'><input value={String(row.cekiciPlaka||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], cekiciPlaka: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Dorse Plaka'><input value={String(row.dorsePlaka||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], dorsePlaka: e.target.value}; return n; })} style={smallInput} /></Field>
                      </div>
                    </div>

                    {/* Tarih & Lokasyon */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Tarih & Lokasyon</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                        <Field label='Yükleme Tarihi'><input type='date' value={toInputDate(row.yuklemetarihi as Date)} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], yuklemetarihi: new Date(e.target.value)}; return n; })} style={smallInput} /></Field>
                        <Field label='Boşaltma Tarihi'><input type='date' value={toInputDate(row.bosaltmaTarihi as Date)} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], bosaltmaTarihi: new Date(e.target.value)}; return n; })} style={smallInput} /></Field>
                        <Field label='Çıkış Noktası / İl'><input value={String(row.cikisNoktasi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], cikisNoktasi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Varış Noktası / İl'><input value={String(row.varisNoktasi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], varisNoktasi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Yükleme Adresi'><input value={String(row.yuklemeAdresi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], yuklemeAdresi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Varış Adresi'><input value={String(row.varisAdresi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], varisAdresi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Sipariş Tarihi'><input type='date' value={toInputDate(row.siparisTarihi as Date)} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], siparisTarihi: new Date(e.target.value)}; return n; })} style={smallInput} /></Field>
                        <Field label='Sipariş No'><input value={String(row.siparisNo||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], siparisNo: e.target.value}; return n; })} style={smallInput} /></Field>
                      </div>
                    </div>

                    {/* Firma & Belgeler */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Firma & Belgeler</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                        <Field label='Müşteri Adı'><input value={String(row.musteriAdi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], musteriAdi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Gönderici Firma'><input value={String(row.gondericifirma||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], gondericifirma: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Alıcı Firma'><input value={String(row.aliciirma||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], aliciirma: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Tedarikçi Firma'><input value={String(row.tedarikciirma||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], tedarikciirma: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='İrsaliye No'><input value={String(row.irsaliyeNo||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], irsaliyeNo: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Fatura No'><input value={String(row.faturaNo||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], faturaNo: e.target.value}; return n; })} style={smallInput} /></Field>
                      </div>
                    </div>

                    {/* Yük & Finans */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Yük & Finans</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                        <Field label='Adet'><input type='number' value={row.adet ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], adet: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Kg'><input type='number' value={row.kg ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], kg: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Desi'><input type='number' value={row.desi ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], desi: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Yük Ağırlığı (kg)'><input type='number' value={row.yukAgirligi ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], yukAgirligi: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Malzeme Bilgisi'><input value={String(row.malzemeBilgisi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], malzemeBilgisi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Mal Bedeli'><input type='number' value={row.malBedeli ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], malBedeli: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Toplam Tutar'><input type='number' value={row.toplamTutar ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], toplamTutar: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Para Birimi'><select value={String(row.paraBirimi||'TRY')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], paraBirimi: e.target.value as 'TRY' | 'USD' | 'EUR'}; return n; })} style={smallInput}><option>TRY</option><option>USD</option><option>EUR</option></select></Field>
                        <Field label='Vade Süresi (gün)'><input type='number' value={row.vadeSuresi ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], vadeSuresi: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Şoför Adı'><input value={String(row.soforAdi||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], soforAdi: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Şoför Telefonu'><input value={String(row.soforTelefonu||'')} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], soforTelefonu: e.target.value}; return n; })} style={smallInput} /></Field>
                        <Field label='Araç Maliyeti'><input type='number' value={row.aracMaliyeti ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], aracMaliyeti: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                        <Field label='Navlun Satış Tutarı'><input type='number' value={row.navlunSatisTutari ?? ''} onChange={(e) => setImportedRows(prev => { const n = [...prev]; n[idx] = {...n[idx], navlunSatisTutari: e.target.value ? Number(e.target.value) : 0}; return n; })} style={smallInput} /></Field>
                      </div>
                    </div>

                    {/* Evraklar */}
                    <div style={{ marginBottom: 8 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Evraklar (PDF)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {docTypes.map(({ key, label }) => {
                          const rowDocs = importedDocs[idx] || {};
                          const doc = rowDocs[key] || {};
                          return (
                            <div key={key} style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: 10, background: '#fafafa' }}>
                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: '#374151' }}>{label}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input 
                                  placeholder='Evrak No' 
                                  value={doc.evrakNo || ''} 
                                  onChange={(e) => {
                                    setImportedDocs(prev => ({
                                      ...prev,
                                      [idx]: {
                                        ...(prev[idx] || {}),
                                        [key]: { ...(prev[idx]?.[key] || {}), evrakNo: e.target.value }
                                      }
                                    }));
                                  }}
                                  style={{ ...smallInput, fontSize: 11 }} 
                                />
                                <label style={{ display: 'inline-block', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', background: 'white', color: '#374151', fontSize: 11, textAlign: 'center', fontWeight: 500 }}>
                                  {doc.file ? '✓ PDF Seçildi' : 'PDF Seç'}
                                  <input 
                                    type='file' 
                                    accept='application/pdf' 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        setImportedDocs(prev => ({
                                          ...prev,
                                          [idx]: {
                                            ...(prev[idx] || {}),
                                            [key]: { ...(prev[idx]?.[key] || {}), file: f, uploadedAt: new Date() }
                                          }
                                        }));
                                      }
                                    }}
                                  />
                                </label>
                                {doc.file && (
                                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                    📄 {doc.file.name.substring(0, 20)}{doc.file.name.length > 20 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
const smallInput: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' };
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

export default NewOperationPage;
