'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/AuthContext';
import { getAllCarriers, deleteCarrier as deleteCarrierService, createCarrier } from '../../../lib/firebase-service';
import { Carrier, CreateCarrierData } from '../../../lib/types';
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
    firmaAdi: '',
    telefon: '',
    email: '',
    iban: '',
    plaka: '',
    adres: ''
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (user?.role !== 'admin') {
      toast.error('Bu işlem için yetkiniz bulunmamaktadır');
      return;
    }

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
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        telefon: formData.telefon.trim(),
        iban: formData.iban.trim() || 'Belirtilmemiş',
        adres: formData.adres.trim() || 'Belirtilmemiş',
        email: formData.email.trim() || undefined,
        plaka: formData.plaka.trim() || undefined
      };

      const newCarrier = await createCarrier(carrierData);
      // Listeyi yeniden yükle (Firebase'den güncel sıralama ile)
      const updatedCarriersList = await getAllCarriers();
      setCarriers(updatedCarriersList);
      
      // Formu sıfırla
      setFormData({
        firmaAdi: '',
        telefon: '',
        email: '',
        iban: '',
        plaka: '',
        adres: ''
      });

      toast.success('Nakliyeci başarıyla eklendi!');
    } catch (error) {
      console.error('Nakliyeci ekleme hatası:', error);
      toast.error('Nakliyeci eklenirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
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
          <div style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#3b82f6",
            fontStyle: "italic"
          }}>
            ✱ logo
          </div>
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
            Carrier Management
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => router.push('/dashboard/carriers/new')}
              style={{
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              + Yeni Operasyon
            </button>
            
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
              Yeni Taşıyıcı Ekle
            </h2>

            <form onSubmit={handleAddCarrier}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "16px",
                marginBottom: "16px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Adı
                  </label>
                  <input
                    type="text"
                    placeholder="Taşıyıcı Adı"
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
                    IBAN
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
                gridTemplateColumns: "1fr 2fr",
                gap: "16px",
                marginBottom: "16px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    Plaka (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Plaka giriniz"
                    value={formData.plaka}
                    onChange={(e) => handleInputChange('plaka', e.target.value)}
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

              <div style={{ textAlign: "right" }}>
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
                  {submitting ? "Ekleniyor..." : "+ Taşıyıcı Ekle"}
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
                        Plaka
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
                        Icon & Text
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
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#374151",
                          fontWeight: "600"
                        }}>
                          {carrier.vehicles?.[0]?.plaka || '-'}
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
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => router.push(`/dashboard/carriers/${carrier.id}`)}
                              style={{
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                width: "32px",
                                height: "32px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              📝
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(carrier.id, carrier.firmaAdi)}
                                style={{
                                  background: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  width: "32px",
                                  height: "32px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                🗑️
                              </button>
                            )}
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