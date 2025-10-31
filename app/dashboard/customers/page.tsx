"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/contexts/AuthContext";
import { createCustomer, deleteCustomer, getAllCustomers, updateCustomer } from "../../../lib/firebase-service";
import { Customer, CustomerFormData } from "../../../lib/types";
import toast from "react-hot-toast";
import { formatDate } from "../../../lib/utils";

const emptyForm: CustomerFormData = {
  firmaUnvani: "",
  vergiDairesi: "",
  vergiNumarasi: "",
  adres: "",
  il: "",
  ilce: "",
  yetkiliKisi: "",
  telefon: "",
  eposta: "",
  iban: ""
};

const CustomersPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const list = await getAllCustomers();
        setCustomers(list);
      } catch (e) {
        console.error(e);
        toast.error("Müşteriler yüklenemedi");
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) =>
      c.firmaUnvani.toLowerCase().includes(q) ||
      c.vergiNumarasi.toLowerCase().includes(q) ||
      c.yetkiliKisi.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firmaUnvani.trim()) return toast.error("Firma Ünvanı zorunludur");
    if (!form.vergiNumarasi.trim()) return toast.error("Vergi Numarası zorunludur");

    setSubmitting(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        toast.success("Müşteri güncellendi");
      } else {
        await createCustomer(form);
        toast.success("Müşteri eklendi");
      }
      const list = await getAllCustomers();
      setCustomers(list);
      reset();
    } catch (err) {
      console.error(err);
      toast.error("Kayıt işlemi başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      firmaUnvani: c.firmaUnvani,
      vergiDairesi: c.vergiDairesi,
      vergiNumarasi: c.vergiNumarasi,
      adres: c.adres,
      il: c.il,
      ilce: c.ilce,
      yetkiliKisi: c.yetkiliKisi,
      telefon: c.telefon,
      eposta: c.eposta,
      iban: c.iban
    });
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`"${c.firmaUnvani}" müşterisini silmek istiyor musunuz?`)) return;
    try {
      await deleteCustomer(c.id);
      setCustomers(await getAllCustomers());
      toast.success("Silindi");
    } catch (e) {
      console.error(e);
      toast.error("Silme başarısız");
    }
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Yükleniyor...</div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "white", boxShadow: "2px 0 4px rgba(0,0,0,0.1)", padding: "24px 0 80px 0", position: "fixed", height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px 32px 24px", borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
          <img src="/uygulamaicon.jpeg" alt="logo" style={{ height: 56, width: 'auto' }} />
        </div>
        <nav style={{ padding: "0 16px", flex: 1, overflowY: "auto" }}>
          <div style={{ borderRadius: 8, margin: "4px 0", color: "#6b7280", cursor: "pointer" }} onClick={() => router.push("/dashboard")}> 
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>🏠 Ana Sayfa</div>
          </div>
          <div style={{ borderRadius: 8, margin: "4px 0", color: "#6b7280", cursor: "pointer" }} onClick={() => router.push("/dashboard/carriers")}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>🚛 Nakliyeci İşlemleri</div>
          </div>
          <div style={{ borderRadius: 8, margin: "4px 0", color: "#6b7280", cursor: "pointer" }} onClick={() => router.push("/dashboard/operations")}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>📊 Operasyon Yönetimi</div>
          </div>
          <div style={{ borderRadius: 8, margin: "4px 0", color: "#6b7280", cursor: "pointer" }} onClick={() => router.push("/dashboard/operations/new")}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>🆕 Yeni Operasyon</div>
          </div>
          <div style={{ background: "#3b82f6", borderRadius: 8, margin: "4px 0", color: "white" }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>👤 Müşteriler</div>
          </div>
          <div style={{ borderRadius: 8, margin: "4px 0", color: "#6b7280", cursor: "pointer" }} onClick={() => router.push("/dashboard/personnel")}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>👥 Personel İşlemleri</div>
          </div>
        </nav>
        <div style={{ padding: "0 16px 16px 16px" }}>
          <button onClick={async () => { await logout(); router.replace('/login'); }} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>🚪 Çıkış Yap</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1 }}>
        {/* Header */}
        <header style={{ background: 'white', padding: '16px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#1f2937', margin: 0 }}>Müşteri Yönetimi</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/** İstenildiği üzere sağ üstteki "+ Yeni Müşteri" butonu kaldırıldı. */}
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
          </div>
        </header>

        <div style={{ padding: 32 }}>
          {/* Form */}
          {showForm && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Formu'}</h2>
                <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#6b7280', cursor: 'pointer' }}>▾</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Firma Ünvanı</label>
                    <input value={form.firmaUnvani} onChange={(e) => setForm({ ...form, firmaUnvani: e.target.value })} placeholder="Örn: ABC Lojistik A.Ş." style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Adres</label>
                    <textarea value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} placeholder="Tam adresi giriniz" style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Vergi Dairesi</label>
                    <input value={form.vergiDairesi} onChange={(e) => setForm({ ...form, vergiDairesi: e.target.value })} placeholder="Örn: Büyük Mükellefler" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>İl</label>
                    <input value={form.il} onChange={(e) => setForm({ ...form, il: e.target.value })} placeholder="İl" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Vergi Numarası</label>
                    <input value={form.vergiNumarasi} onChange={(e) => setForm({ ...form, vergiNumarasi: e.target.value })} placeholder="Vergi numarası" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>İlçe</label>
                    <input value={form.ilce} onChange={(e) => setForm({ ...form, ilce: e.target.value })} placeholder="İlçe" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Yetkili Kişi (Ad Soyad)</label>
                    <input value={form.yetkiliKisi} onChange={(e) => setForm({ ...form, yetkiliKisi: e.target.value })} placeholder="Örn: Ayşe Yılmaz" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Telefon</label>
                    <input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="Örn: +90 555 123 4567" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>E-posta</label>
                    <input value={form.eposta} onChange={(e) => setForm({ ...form, eposta: e.target.value })} placeholder="ornek@sirket.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Banka IBAN</label>
                    <input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <button type="button" onClick={reset} style={{ border: '1px solid #d1d5db', background: 'white', color: '#6b7280', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}>İptal</button>
                  <button type="submit" disabled={submitting} style={{ background: submitting ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: submitting ? 'not-allowed' : 'pointer' }}>{editingId ? 'Güncelle' : 'Kaydet'}</button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 16px 8px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Müşteriler</h2>
              <div style={{ position: 'relative', minWidth: 280 }}>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Firma Ünvanı / Vergi No ara" style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
              </div>
            </div>
            {loadingList ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Kayıt bulunamadı.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['ID','Firma Ünvanı','Vergi No','Yetkili Kişi','Telefon','E-posta','Oluşturulma','Güncellenme','İşlemler'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={tdStyle}>CUS{String(i + 1).padStart(3, '0')}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.firmaUnvani}</td>
                        <td style={tdStyle}>{c.vergiNumarasi}</td>
                        <td style={tdStyle}>{c.yetkiliKisi}</td>
                        <td style={tdStyle}>{c.telefon}</td>
                        <td style={{ ...tdStyle, color: '#3b82f6' }}>{c.eposta}</td>
                        <td style={tdStyle}>{formatDate(c.createdAt, 'yyyy-MM-dd')}</td>
                        <td style={tdStyle}>{formatDate(c.updatedAt, 'yyyy-MM-dd')}</td>
                        <td style={{ ...tdStyle }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => handleEdit(c)} style={btnSecondary}>Düzenle</button>
                            <button onClick={() => handleDelete(c)} style={btnDanger}>Sil</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box'
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  borderBottom: '1px solid #e5e7eb'
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#374151'
};

const btnSecondary: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: '#6b7280',
  cursor: 'pointer'
};

const btnDanger: React.CSSProperties = {
  background: '#ef4444',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: 'white',
  cursor: 'pointer'
};

export default CustomersPage;
