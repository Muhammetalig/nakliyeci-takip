"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import { getOperation, deleteOperation as deleteOperationService, deleteFile } from '../../../../lib/firebase-service';
import { Document, Operation } from '../../../../lib/types';

const DetailsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingOp, setLoadingOp] = useState(true);

  const opId = useMemo(() => String(params?.id ?? ''), [params]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    const load = async () => {
      if (!opId) return;
      try {
        const op = await getOperation(opId);
        if (!op) {
          setError('Operasyon bulunamadı');
        } else {
          setOperation(op);
        }
      } catch (e) {
        console.error(e);
        setError('Operasyon getirilemedi');
      } finally {
        setLoadingOp(false);
      }
    };
    load();
  }, [opId]);

  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yükleniyor...</div>;
  }

  if (loadingOp) {
    return <div style={{ padding: 32 }}>Operasyon yükleniyor...</div>;
  }

  if (error || !operation) {
    return (
      <div style={{ padding: 32 }}>
        <button onClick={() => router.push('/dashboard/operations')} style={{ marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', background: 'white', color: '#374151', cursor: 'pointer' }}>← Listeye Dön</button>
        <div style={{ color: '#ef4444' }}>{error || 'Operasyon bulunamadı'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar placeholder spacing, reuse layout style */}
      <aside style={{ width: 240, background: 'white', boxShadow: '2px 0 4px rgba(0,0,0,0.1)', padding: '24px 0 80px 0', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '0 24px 32px 24px', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          <img src="/uygulamaicon.jpeg" alt="logo" style={{ height: 56, width: 'auto' }} />
        </div>
        <nav style={{ padding: '0 16px' }}>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}> <div style={{ padding: '12px 16px' }}>🏠 Ana Sayfa</div></div>
          <div style={{ borderRadius: 8, margin: '4px 0', color: '#6b7280', cursor: 'pointer' }} onClick={() => router.push('/dashboard/operations')}> <div style={{ padding: '12px 16px' }}>📊 Operasyon Yönetimi</div></div>
        </nav>
      </aside>

      <main style={{ marginLeft: 240, flex: 1 }}>
        <header style={{ background: 'white', padding: '16px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>Operasyon Detayı</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/dashboard/operations')} style={{ background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>← Listeye Dön</button>
            <button onClick={() => router.push(`/dashboard/operations/${operation.id}/edit`)} style={{ background: '#3b82f6', border: 'none', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>✏️ Düzenle</button>
            {/* Sil butonu: yalnızca admin kullanıcılar için etkinleştirmek isterseniz role kontrolünü ekleyin */}
            <button
              onClick={async () => {
                if (!operation) return;
                const ok = window.confirm(`"${operation.seferNo}" operasyonunu silmek istiyor musunuz?`);
                if (!ok) return;
                try {
                  const docs = operation.documents || [];
                  for (const d of docs) {
                    if (d.fileUrl) { try { await deleteFile(d.fileUrl); } catch {} }
                  }
                  await deleteOperationService(operation.id);
                  router.push('/dashboard/operations');
                } catch (e) {
                  console.error(e);
                  alert('Silme işlemi sırasında hata oluştu');
                }
              }}
              style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
            >
              🗑️ Sil
            </button>
          </div>
        </header>

        <div style={{ padding: 24 }}>
          {/* Top meta */}
          <section style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <Info label="Sefer No" value={operation.seferNo} />
              <Info label="Nakliyeci" value={operation.carrierName} />
              <Info label="Plaka" value={operation.vehiclePlaka} />
              <Info label="Durum" value={operation.status} />
            </div>
          </section>

          {/* Documents */}
          <section style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>Dokümanlar</h2>
            {operation.documents && operation.documents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {operation.documents.map((d: Document) => (
                  <div key={d.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{toLabel(d.type)}</div>
                    <div style={{ fontSize: 14, color: '#374151' }}>Evrak No: {d.evrakNo || '-'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Yüklendi: {new Date(d.uploadedAt).toLocaleString('tr-TR')}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" style={{ background: '#10b981', color: 'white', borderRadius: 6, padding: '6px 10px', textDecoration: 'none', fontSize: 14 }}>PDF Aç</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>Bu operasyona ait doküman bulunmuyor.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{value}</div>
  </div>
);

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

export default DetailsPage;
