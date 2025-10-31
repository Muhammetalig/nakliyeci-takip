'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/AuthContext';
import { getAllCarriers, deleteCarrier as deleteCarrierService, createCarrier, updateCarrier } from '../../../lib/firebase-service';
import { Carrier, CreateCarrierData, Vehicle } from '../../../lib/types';
import { formatDate } from '../../../lib/utils';
import toast from 'react-hot-toast';

const CarrierListPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    firmaTuru: 'Sahis' as 'Sahis' | 'Limited' | 'Anonim',
    firmaAdi: '',
    vergiDairesi: '',
    vergiNumarasi: '',
    adres: '',
    il: '',
    ilce: '',
    yetkiliKisi: '',
    telefon: '',
    email: '',
    iban: '',
    isActive: true,
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclePlaka, setVehiclePlaka] = useState('');
  const [vehicleType, setVehicleType] = useState('Tır');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Kullanıcı yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Nakliyecileri yükle
  useEffect(() => {
    const loadCarriers = async () => {
      if (user) {
        try {
          const carriersList = await getAllCarriers();
          setCarriers(carriersList);
        } catch (error) {
          console.error('Nakliyeciler yüklenirken hata:', error);
          toast.error('Nakliyeciler yüklenirken hata oluştu');
        } finally {
          setLoadingCarriers(false);
        }
      }
    };

    loadCarriers();
  }, [user]);

  // Nakliyeci silme fonksiyonu
  const handleDelete = async (carrierId: string, carrierName: string) => {
    if (window.confirm(`"${carrierName}" nakliyecisini silmek istediğinizden emin misiniz?`)) {
      try {
        await deleteCarrierService(carrierId);
        // Listeyi yeniden yükle (Firebase'den güncel sıralama ile)
        const updatedCarriersList = await getAllCarriers();
        setCarriers(updatedCarriersList);
        toast.success('Nakliyeci başarıyla silindi');
      } catch (error) {
        console.error('Nakliyeci silinirken hata:', error);
        toast.error('Nakliyeci silinirken hata oluştu');
      }
    }
  };

  // Form input değişikliklerini handle et
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddVehicle = () => {
    if (!vehiclePlaka.trim()) return;
    setVehicles(prev => [...prev, { id: crypto.randomUUID(), plaka: vehiclePlaka.trim(), aracTipi: vehicleType }]);
    setVehiclePlaka('');
    setVehicleType('Tır');
  };

  const handleRemoveVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  // Nakliyeci ekle fonksiyonu
  const handleAddCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firmaAdi.trim()) {
      toast.error('Firma adı gereklidir');
      return;
    }

    if (!formData.telefon.trim()) {
      toast.error('Telefon numarası gereklidir');
      return;
    }

    setSubmitting(true);

    try {
      const carrierData: CreateCarrierData = {
        firmaAdi: formData.firmaAdi.trim(),
        firmaTuru: formData.firmaTuru,
        vergiDairesi: formData.vergiDairesi.trim() || undefined,
        vergiNumarasi: formData.vergiNumarasi.trim() || undefined,
        adres: formData.adres.trim() || 'Belirtilmemiş',
        il: formData.il.trim() || undefined,
        ilce: formData.ilce.trim() || undefined,
        yetkiliKisi: formData.yetkiliKisi.trim() || undefined,
        telefon: formData.telefon.trim(),
        iban: formData.iban.trim() || 'Belirtilmemiş',
        email: formData.email.trim() || undefined,
        vehicles: vehicles.map(v => ({ plaka: v.plaka, aracTipi: v.aracTipi })),
        isActive: formData.isActive
      };
      if (editingId) {
        await updateCarrier(editingId, {
          ...carrierData,
          vehicles: vehicles.map(v => ({ id: v.id, plaka: v.plaka, aracTipi: v.aracTipi }))
        });
        toast.success('Nakliyeci güncellendi');
      } else {
        await createCarrier(carrierData);
        toast.success('Nakliyeci başarıyla eklendi!');
      }

      // Listeyi yeniden yükle ve formu sıfırla
      const updatedCarriersList = await getAllCarriers();
      setCarriers(updatedCarriersList);
      resetForm();
    } catch (error) {
      console.error('Nakliyeci ekleme hatası:', error);
      toast.error('Nakliyeci eklenirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firmaTuru: 'Sahis',
      firmaAdi: '',
      vergiDairesi: '',
      vergiNumarasi: '',
      adres: '',
      il: '',
      ilce: '',
      yetkiliKisi: '',
      telefon: '',
      email: '',
      iban: '',
      isActive: true,
    });
    setVehicles([]);
    setEditingId(null);
  };

  const handleEdit = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setFormData({
      firmaTuru: (carrier.firmaTuru as 'Sahis' | 'Limited' | 'Anonim') ?? 'Sahis',
      firmaAdi: carrier.firmaAdi ?? '',
      vergiDairesi: carrier.vergiDairesi ?? '',
      vergiNumarasi: carrier.vergiNumarasi ?? '',
      adres: carrier.adres ?? '',
      il: carrier.il ?? '',
      ilce: carrier.ilce ?? '',
      yetkiliKisi: carrier.yetkiliKisi ?? '',
      telefon: carrier.telefon ?? '',
      email: carrier.email ?? '',
      iban: carrier.iban ?? '',
      isActive: carrier.isActive ?? true,
    });
    setVehicles((carrier.vehicles || []).map(v => ({ id: v.id, plaka: v.plaka, aracTipi: v.aracTipi })));
    // Sayfanın üstündeki forma kaydırma (isteğe bağlı)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrelenmiş nakliyeciler
  const filteredCarriers = carriers.filter(carrier =>
    carrier.firmaAdi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    carrier.telefon.includes(searchTerm) ||
    carrier.iban.includes(searchTerm)
  );

  if (loading || !user) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div>Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'white',
        boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
        padding: '24px 0 80px 0',
        position: 'fixed',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{
          padding: "0 24px 32px 24px",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: "24px"
        }}>
          <img src="/uygulamaicon.jpeg" alt="logo" style={{ height: 56, width: 'auto' }} />
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: '0 16px', flex: 1, overflowY: 'auto' }}>
          <div style={{
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard")}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              🏠 Ana Sayfa
            </div>
          </div>

          <div style={{
            background: "#3b82f6",
            borderRadius: "8px",
            margin: "4px 0",
            color: "white"
          }}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              🚛 Nakliyeci İşlemleri
            </div>
          </div>

          <div style={{
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard/operations")}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              📊 Operasyon Yönetimi
            </div>
          </div>

          <div style={{
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard/operations/new")}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              🆕 Yeni Operasyon
            </div>
          </div>

          <div style={{
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard/customers")}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              👤 Müşteriler
            </div>
          </div>

          <div style={{
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard/personnel")}>
            <div style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              👥 Personel İşlemleri
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div style={{ padding: '0 16px 16px 16px' }}>
          <button
            onClick={async () => { await logout(); router.replace('/login'); }}
            style={{
              width: '100%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: "240px", flex: 1 }}>
        {/* Header */}
        <header style={{
          background: "white",
          padding: "16px 32px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h1 style={{
            fontSize: "18px",
            fontWeight: "500",
            color: "#1f2937",
            margin: 0
          }}>
            Taşıyıcı Yönetimi
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/** İstenildiği üzere sağ üstteki "+ Yeni Operasyon" butonu şimdilik kaldırıldı. */}
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}>
              👤
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: "32px" }}>
          {/* Yeni Taşıyıcı Ekle Formu */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            marginBottom: "32px"
          }}>
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 24px 0"
            }}>
              {editingId ? 'Taşıyıcıyı Düzenle' : 'Yeni Taşıyıcı Ekle'}
            </h2>

            <form onSubmit={handleAddCarrier}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
                marginBottom: "16px"
              }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Firma Türü</label>
                  <select value={formData.firmaTuru} onChange={(e)=>handleInputChange('firmaTuru', e.target.value)} style={{
                      width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", background:'white'
                  }}>
                    <option value="Sahis">Şahıs</option>
                    <option value="Limited">Limited</option>
                    <option value="Anonim">Anonim</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Firma Adı / Ünvan
                  </label>
                  <input
                    type="text"
                    placeholder="Firma adını giriniz"
                    value={formData.firmaAdi}
                    onChange={(e) => handleInputChange('firmaAdi', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Vergi Dairesi</label>
                  <input type="text" placeholder="Vergi dairesi" value={formData.vergiDairesi} onChange={(e)=>handleInputChange('vergiDairesi', e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Vergi Numarası</label>
                  <input type="text" placeholder="Vergi numarası" value={formData.vergiNumarasi} onChange={(e)=>handleInputChange('vergiNumarasi', e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' }} />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Telefon
                  </label>
                  <input
                    type="tel"
                    placeholder="Telefon numarası giriniz"
                    value={formData.telefon}
                    onChange={(e) => handleInputChange('telefon', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    E-mail
                  </label>
                  <input
                    type="text"
                    placeholder="ornek@eposta.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Banka IBAN
                  </label>
                  <input
                    type="text"
                    placeholder="IBAN veya hesap no"
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "16px",
                marginBottom: "16px"
              }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>İl</label>
                  <input type="text" placeholder="İl" value={formData.il} onChange={(e)=>handleInputChange('il', e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>İlçe</label>
                  <input type="text" placeholder="İlçe" value={formData.ilce} onChange={(e)=>handleInputChange('ilce', e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Yetkili Kişi (Ad Soyad)</label>
                  <input type="text" placeholder="Yetkili kişi" value={formData.yetkiliKisi} onChange={(e)=>handleInputChange('yetkiliKisi', e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Aktif / Pasif</label>
                  <select value={formData.isActive ? 'aktif' : 'pasif'} onChange={(e)=>handleInputChange('isActive', e.target.value === 'aktif')} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, background:'white' }}>
                    <option value="aktif">Aktif</option>
                    <option value="pasif">Pasif</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Adres
                  </label>
                  <input
                    type="text"
                    placeholder="Adres giriniz"
                    value={formData.adres}
                    onChange={(e) => handleInputChange('adres', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Araç Yönetimi */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', margin: '0 0 12px 0' }}>Araçlar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Plaka</label>
                    <input value={vehiclePlaka} onChange={(e)=>setVehiclePlaka(e.target.value)} placeholder="Örn: 34 ABC 123" style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Araç Tipi</label>
                    <select value={vehicleType} onChange={(e)=>setVehicleType(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, background:'white' }}>
                      <option>Tır</option>
                      <option>Kamyon</option>
                      <option>Kamyonet</option>
                    </select>
                  </div>
                  <button type="button" onClick={handleAddVehicle} style={{ background:'#10b981', color:'white', border:'none', borderRadius:6, padding:'10px 14px', fontSize:14, cursor:'pointer' }}>+ Araç Ekle</button>
                </div>
                {vehicles.length > 0 && (
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f9fafb' }}>
                          <th style={{ padding:'8px 12px', textAlign:'left', fontSize:12, color:'#374151' }}>Plaka</th>
                          <th style={{ padding:'8px 12px', textAlign:'left', fontSize:12, color:'#374151' }}>Araç Tipi</th>
                          <th style={{ padding:'8px 12px', textAlign:'center', fontSize:12, color:'#374151' }}>Sil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map(v => (
                          <tr key={v.id} style={{ borderTop:'1px solid #f3f4f6' }}>
                            <td style={{ padding:'10px 12px' }}>{v.plaka}</td>
                            <td style={{ padding:'10px 12px' }}>{v.aracTipi}</td>
                            <td style={{ padding:'10px 12px', textAlign:'center' }}>
                              <button type="button" onClick={()=>handleRemoveVehicle(v.id)} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:6, padding:'6px 10px', fontSize:12, cursor:'pointer' }}>Sil</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', justifyContent: "flex-end", gap:12 }}>
                {editingId && (
                  <button type="button" onClick={resetForm} style={{ border:'1px solid #d1d5db', background:'white', color:'#6b7280', borderRadius:6, padding:'8px 16px', cursor:'pointer' }}>İptal</button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? "#9ca3af" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  {submitting ? (editingId ? 'Güncelleniyor...' : 'Ekleniyor...') : (editingId ? 'Güncelle' : '+ Taşıyıcı Ekle')}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Carriers Table */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "24px 24px 16px 24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: 0
              }}>
                Mevcut Taşıyıcılar
              </h2>
            </div>

            {loadingCarriers ? (
              <div style={{ padding: "48px", textAlign: "center" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid #f3f4f6",
                  borderTop: "3px solid #3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px"
                }}></div>
                <p style={{ color: "#6b7280", margin: 0 }}>Nakliyeciler yükleniyor...</p>
              </div>
            ) : filteredCarriers.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center" }}>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  {searchTerm ? 'Arama kriterlerinize uygun nakliyeci bulunamadı.' : 'Henüz nakliyeci kaydı bulunmamaktadır.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        ID
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        Ad
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        Telefon
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        IBAN
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        Araç Sayısı
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        Oluşturulma Tarihi
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        Güncellenme Tarihi
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        E-posta
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb"
                      }}>
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCarriers.map((carrier, index) => (
                      <tr key={carrier.id} style={{ 
                        borderBottom: "1px solid #f3f4f6",
                        background: index % 2 === 0 ? "white" : "#f9fafb"
                      }}>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#374151"
                        }}>
                          C00{index + 1}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#374151",
                          fontWeight: "500"
                        }}>
                          {carrier.firmaAdi}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#374151"
                        }}>
                          {carrier.telefon}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "12px",
                          color: "#374151",
                          fontFamily: "monospace"
                        }}>
                          {carrier.iban}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#374151", fontWeight: 600 }}>
                          {carrier.vehicles?.length ?? 0}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#6b7280"
                        }}>
                          {formatDate(carrier.createdAt, 'yyyy-MM-dd')}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#6b7280"
                        }}>
                          {formatDate(carrier.updatedAt, 'yyyy-MM-dd')}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#3b82f6"
                        }}>
                          {carrier.email || 'Email belirtilmemiş'}
                        </td>
                        <td style={{
                          padding: "16px",
                          textAlign: "center"
                        }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => handleEdit(carrier)} style={{ background:'transparent', border:'1px solid #d1d5db', borderRadius:6, padding:'6px 10px', fontSize:12, color:'#6b7280', cursor:'pointer' }}>Düzenle</button>
                            <button onClick={() => handleDelete(carrier.id, carrier.firmaAdi)} style={{ background:'#ef4444', border:'none', borderRadius:6, padding:'6px 10px', fontSize:12, color:'white', cursor:'pointer' }}>Sil</button>
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

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CarrierListPage;