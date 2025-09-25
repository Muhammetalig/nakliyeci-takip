'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/AuthContext';

const PersonnelPage: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Kullanıcı yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
            fontSize: "18px",
            fontWeight: "500",
            color: "#1f2937",
            margin: 0
          }}>
            Personel İşlemleri
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
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
              + Yeni Personel
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
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "48px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textAlign: "center"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "32px"
            }}>
              👥
            </div>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 16px 0"
            }}>
              Personel Yönetimi
            </h2>
            <p style={{
              fontSize: "16px",
              color: "#6b7280",
              margin: "0 0 32px 0",
              lineHeight: 1.6
            }}>
              Bu sayfa şu anda geliştirilme aşamasında. Yakında personel ekleme, düzenleme ve yönetim özellikleri burada yer alacak.
            </p>
            <div style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              <div style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "4px"
                }}>
                  Personel Listesi
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6b7280"
                }}>
                  Çalışan bilgilerini görüntüle
                </div>
              </div>
              <div style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "4px"
                }}>
                  Rol Yönetimi
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6b7280"
                }}>
                  Kullanıcı yetkilerini düzenle
                </div>
              </div>
              <div style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "4px"
                }}>
                  Sistem Logları
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6b7280"
                }}>
                  Kullanıcı aktivitelerini izle
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PersonnelPage;