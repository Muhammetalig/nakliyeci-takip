'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/AuthContext';

const PersonnelPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
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
        <header style={{
          background: "white",
          padding: "16px 32px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: 0 }}>Profil</h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 80px)',
          background: 'linear-gradient(120deg,#f8fafc 60%,#e0e7ff 100%)',
        }}>
          <div style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 24,
            boxShadow: '0 8px 32px -8px rgba(59,130,246,0.10)',
            padding: '48px 32px 36px',
            minWidth: 340,
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            {/* Dekoratif üst arka plan */}
            <div style={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 180,
              height: 80,
              background: 'linear-gradient(90deg,#6366f1 0%,#3b82f6 100%)',
              borderRadius: '0 0 90px 90px',
              filter: 'blur(8px)',
              opacity: 0.18,
              zIndex: 0
            }} />
            {/* Avatar */}
            <div style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1 0%,#3b82f6 100%)',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              color: '#fff',
              fontWeight: 700,
              border: '4px solid #fff',
              boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
              transition: 'transform .18s',
              zIndex: 1
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              👤
            </div>
            {/* İsim ve email */}
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Ahmet Yılmaz</div>
            <div style={{ fontSize: 15, color: '#64748b', marginBottom: 14 }}>ahmet.yilmaz@firma.com</div>
            {/* Rol badge */}
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg,#6366f1 0%,#3b82f6 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 12,
              padding: '4px 16px',
              marginBottom: 18,
              boxShadow: '0 1px 4px rgba(99,102,241,0.08)'
            }}>Personel</span>
            {/* Bilgiler grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 10,
              marginBottom: 22,
              justifyItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#334155' }}>
                <span style={{ fontSize: 18, color: '#3b82f6' }}>📱</span>
                <span>0532 123 45 67</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#334155' }}>
                <span style={{ fontSize: 18, color: '#3b82f6' }}>🏢</span>
                <span>Firma: Nakliye A.Ş.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#334155' }}>
                <span style={{ fontSize: 18, color: '#3b82f6' }}>🗓️</span>
                <span>Katılım: 2022-03-15</span>
              </div>
            </div>
            {/* Düzenle butonu */}
            <button
              style={{
                background: 'linear-gradient(90deg,#6366f1 0%,#3b82f6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '12px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99,102,241,0.10)',
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'filter .18s',
                justifyContent: 'center',
                margin: '0 auto'
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              <span style={{ fontSize: 18 }}>✏️</span> Profili Düzenle
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PersonnelPage;