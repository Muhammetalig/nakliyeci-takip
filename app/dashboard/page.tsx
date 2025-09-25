"use client"; // Client component - tarayıcıda çalışır

import React, { useEffect, useState } from "react"; // React hook'ları
import { useAuth } from "../../lib/contexts/AuthContext"; // Auth context hook
import { useRouter } from "next/navigation"; // Next.js router
import { getDashboardStats } from "../../lib/firebase-service"; // Firebase service

const DashboardPage: React.FC = () => {
  const router = useRouter(); // Sayfa yönlendirme için
  const { user, loading, logout } = useAuth(); // Auth context hook
  
  // Dashboard verilerini saklayan state
  const [stats, setStats] = useState({
    totalCarriers: 0,
    activeOperations: 0,
    completedOperations: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Kullanıcı yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Dashboard istatistiklerini yükle
  useEffect(() => {
    const loadStats = async () => {
      if (user) {
        try {
          const dashboardStats = await getDashboardStats();
          setStats(dashboardStats);
        } catch (error) {
          console.error('Dashboard stats yükleme hatası:', error);
        } finally {
          setStatsLoading(false);
        }
      }
    };

    loadStats();
  }, [user]);

  // Çıkış yapma fonksiyonu
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  // Eğer sayfa hala yükleniyorsa loading mesajı göster
  if (loading || !user) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div>Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "240px",
        background: "white",
        boxShadow: "2px 0 4px rgba(0, 0, 0, 0.1)",
        padding: "24px 0",
        position: "fixed",
        height: "100vh",
        overflowY: "auto"
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
        <nav style={{ padding: "0 16px" }}>
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
            fontSize: "28px",
            fontWeight: "600",
            color: "#1f2937",
            margin: 0
          }}>
            Ana Sayfa
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button style={{
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
            }}>
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
            }} onClick={handleLogout}>
              👤
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div style={{ padding: "32px" }}>
          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 2fr",
            gap: "24px",
            marginBottom: "32px"
          }}>
            {/* Total Nakliyeci */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              position: "relative"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  🚛
                </div>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    Total Nakliyeci
                  </p>
                  <h2 style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#1f2937",
                    margin: 0
                  }}>
                    {statsLoading ? "..." : stats.totalCarriers}
                  </h2>
                </div>
              </div>
            </div>

            {/* Aktif Operasyonlar */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  📦
                </div>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    Aktif Operasyonlar
                  </p>
                  <h2 style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#1f2937",
                    margin: 0
                  }}>
                    {statsLoading ? "..." : stats.activeOperations}
                  </h2>
                </div>
              </div>
            </div>

            {/* Tamamlanmış Operasyonlar */}
            <div style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              color: "white"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  ✅
                </div>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "rgba(255, 255, 255, 0.9)",
                    margin: "0 0 4px 0"
                  }}>
                    Tamamlanmış Operasyonlar
                  </p>
                  <h2 style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "white",
                    margin: 0
                  }}>
                    {statsLoading ? "..." : stats.completedOperations}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Yaklaşan Ödeme Tarihleri */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 24px 0"
            }}>
              Yaklaşan Ödeme Tarihleri
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Ödeme Item 1 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid #f3f4f6"
              }}>
                <div>
                  <p style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    24/07/2024
                  </p>
                  <p style={{
                    fontSize: "14px",
                    color: "#1f2937",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    Fatura #INV-20240715 Carrier Alfa'dan bekleniyor
                  </p>
                </div>
                <span style={{
                  background: "#fef3c7",
                  color: "#d97706",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  Yakında
                </span>
              </div>

              {/* Ödeme Item 2 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid #f3f4f6"
              }}>
                <div>
                  <p style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    28/07/2024
                  </p>
                  <p style={{
                    fontSize: "14px",
                    color: "#1f2937",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    İrsaliye #WB-20240718 Operasyon için ödeme #98765
                  </p>
                </div>
                <span style={{
                  background: "#dcfce7",
                  color: "#16a34a",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  Yaklaşan
                </span>
              </div>

              {/* Ödeme Item 3 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid #f3f4f6"
              }}>
                <div>
                  <p style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    01/08/2024
                  </p>
                  <p style={{
                    fontSize: "14px",
                    color: "#1f2937",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    İşlem için ödeme yapılması gerektyor #11223 (Carrier Beta)
                  </p>
                </div>
                <span style={{
                  background: "#dcfce7",
                  color: "#16a34a",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  Yaklaşan
                </span>
              </div>

              {/* Ödeme Item 4 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0"
              }}>
                <div>
                  <p style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0 0 4px 0"
                  }}>
                    15/07/2024
                  </p>
                  <p style={{
                    fontSize: "14px",
                    color: "#1f2937",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    [Sistem mesajı eksik]
                  </p>
                </div>
                <span style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  Gecikmiş
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
