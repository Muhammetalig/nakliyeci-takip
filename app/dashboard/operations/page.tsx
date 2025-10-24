'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/AuthContext';
import { getAllCarriers, createOperation, getAllOperations } from '../../../lib/firebase-service';
import { Carrier, CreateOperationData, Operation } from '../../../lib/types';
import toast from 'react-hot-toast';

const OperationsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(true);
  const [loadingOperations, setLoadingOperations] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'passive'>('active');
  const [showNewOperationForm, setShowNewOperationForm] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [operationDate, setOperationDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [waybillDocument, setWaybillDocument] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('');

  // Kullanıcı yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Nakliyecileri ve operasyonları yükle
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const [carriersList, operationsList] = await Promise.all([
            getAllCarriers(),
            getAllOperations()
          ]);
          setCarriers(carriersList);
          setOperations(operationsList);
        } catch (error) {
          console.error('Veriler yüklenirken hata:', error);
          toast.error('Veriler yüklenirken hata oluştu');
        } finally {
          setLoadingCarriers(false);
          setLoadingOperations(false);
        }
      }
    };

    loadData();
  }, [user]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setWaybillDocument(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCarrier) {
      toast.error('Lütfen bir taşıyıcı seçin');
      return;
    }

    if (!operationDate) {
      toast.error('Lütfen operasyon tarihi girin');
      return;
    }

    if (!amount) {
      toast.error('Lütfen fatura tutarı girin');
      return;
    }

    try {
      const operationData: CreateOperationData = {
        carrierId: selectedCarrier,
        operationDate: operationDate ? new Date(operationDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        amount: parseFloat(amount),
        currency: currency as 'TRY' | 'USD' | 'EUR'
      };

      await createOperation(operationData);
      
      toast.success('Operasyon başarıyla kaydedildi!');
      
      // Operasyonları yeniden yükle
      const operationsList = await getAllOperations();
      setOperations(operationsList);
      
      // Formu temizle ve kapat
      setSelectedCarrier('');
      setOperationDate('');
      setDueDate('');
      setAmount('');
      setCurrency('TRY');
      setWaybillDocument(null);
      setShowNewOperationForm(false);
      
    } catch (error) {
      console.error('Operasyon kaydedilirken hata:', error);
      toast.error('Operasyon kaydedilirken bir hata oluştu');
    }
  };

  // Operasyonları filtrele
  const filteredOperations = operations.filter(operation => {
    const matchesTab = activeTab === 'active' ? operation.isActive : !operation.isActive;
    // carrierName undefined olabilir, bu durumu güvenli şekilde ele al
    const carrierName = operation.carrierName || '';
    const matchesSearch = carrierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || operation.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter.start && dateFilter.end) {
      const operationDate = new Date(operation.yuklemetarihi);
      const startDate = new Date(dateFilter.start);
      const endDate = new Date(dateFilter.end);
      matchesDate = operationDate >= startDate && operationDate <= endDate;
    }

    return matchesTab && matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'tasima_devam_ediyor':
        return 'Taşıma devam ediyor';
      case 'nakliyeci_odeme_bekliyor':
        return 'Nakliyeci ödeme bekliyor';
      case 'tasima_tamamlandi':
        return 'Taşıma tamamlandı';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tasima_devam_ediyor':
        return '#f59e0b';
      case 'nakliyeci_odeme_bekliyor':
        return '#ef4444';
      case 'tasima_tamamlandi':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

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
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
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
            borderRadius: "8px",
            margin: "4px 0",
            color: "#6b7280",
            cursor: "pointer"
          }} onClick={() => router.push("/dashboard/carriers")}>
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
            Operasyon Yönetimi
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setShowNewOperationForm(true)}
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
        <div style={{ padding: "24px 32px" }}>
          {/* Tabs */}
          <div style={{ 
            display: "flex", 
            gap: "2px",
            background: "#f3f4f6",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "24px",
            width: "fit-content"
          }}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                padding: "8px 24px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                background: activeTab === 'active' ? "white" : "transparent",
                color: activeTab === 'active' ? "#1f2937" : "#6b7280",
                boxShadow: activeTab === 'active' ? "0 1px 2px rgba(0, 0, 0, 0.05)" : "none"
              }}
            >
              Aktif Operasyonlar
            </button>
            <button
              onClick={() => setActiveTab('passive')}
              style={{
                padding: "8px 24px",
                borderRadius: "6px",
                border: "none",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                background: activeTab === 'passive' ? "white" : "transparent",
                color: activeTab === 'passive' ? "#1f2937" : "#6b7280",
                boxShadow: activeTab === 'passive' ? "0 1px 2px rgba(0, 0, 0, 0.05)" : "none"
              }}
            >
              Pasif Operasyonlar
            </button>
          </div>

          {/* Filters */}
          <div style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap"
          }}>
            {/* Search */}
            <div style={{ position: "relative", minWidth: "280px" }}>
              <input
                type="text"
                placeholder="Taşıyıcıda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 16px 10px 40px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
              <div style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af"
              }}>
                🔍
              </div>
            </div>

            {/* Date Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Tarih Filtresi</span>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              />
              <span style={{ color: "#6b7280" }}>-</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
                minWidth: "140px"
              }}
            >
              <option value="">Durum seçin</option>
              <option value="tasima_devam_ediyor">Taşıma devam ediyor</option>
              <option value="nakliyeci_odeme_bekliyor">Nakliyeci ödeme bekliyor</option>
              <option value="tasima_tamamlandi">Taşıma tamamlandı</option>
            </select>

            {/* Apply Filters Button */}
            <button
              style={{
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                minWidth: "120px"
              }}
            >
              Filtreleri Uygula
            </button>
          </div>

          {/* Operations List */}
          {loadingOperations ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              Operasyonlar yükleniyor...
            </div>
          ) : filteredOperations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              Operasyon bulunamadı.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredOperations.map((operation) => (
                <div
                  key={operation.id}
                  style={{
                    background: "white",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    display: "grid",
                    gridTemplateColumns: "180px 160px 1fr 180px 160px",
                    alignItems: "center",
                    gap: "0px"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                    {operation.carrierName || 'Nakliyeci Bilgisi Eksik'}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#6b7280", fontSize: "14px" }}>
                    <span role="img" aria-label="Takvim">📅</span> {new Date(operation.yuklemetarihi).toLocaleDateString('tr-TR')}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                    {operation.toplamTutar.toFixed(2)} {operation.paraBirimi}
                  </div>
                  <div style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: `${getStatusColor(operation.status)}20`,
                    color: getStatusColor(operation.status),
                    minWidth: "140px",
                    textAlign: "center"
                  }}>
                    {getStatusText(operation.status)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <button
                      style={{
                        background: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "14px",
                        color: "#6b7280",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      📄 Dokümanlar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Operation Modal */}
      {showNewOperationForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "24px"
            }}>
              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#1f2937",
                margin: 0
              }}>
                Yeni Operasyon
              </h2>
              <button
                onClick={() => setShowNewOperationForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Taşıyıcı Seçimi */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px"
                }}>
                  Taşıyıcı
                </label>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "white",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="">Bir taşıyıcı seçin</option>
                  {carriers.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {carrier.firmaAdi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operasyon Tarihi */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px"
                }}>
                  Operasyon Tarihi
                </label>
                <input
                  type="date"
                  value={operationDate}
                  onChange={(e) => setOperationDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Ödeme Son Tarihi */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px"
                }}>
                  Ödeme Son Tarihi (İsteğe bağlı)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Fatura Tutarı */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px"
                }}>
                  Fatura Tutarı
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="number"
                    placeholder="Tutar giriniz"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      textAlign: "right",
                      boxSizing: "border-box"
                    }}
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      background: "white",
                      minWidth: "70px",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ 
                display: "flex", 
                gap: "12px", 
                justifyContent: "flex-end",
                marginTop: "32px"
              }}>
                <button
                  type="button"
                  onClick={() => setShowNewOperationForm(false)}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "white",
                    background: "#3b82f6",
                    cursor: "pointer"
                  }}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsPage;