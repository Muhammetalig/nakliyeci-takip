"use client"; // Client component - tarayıcıda çalışır

import React, { useState, useEffect } from "react"; // React hook'ları
import { useAuth } from "../../lib/contexts/AuthContext"; // Auth context hook
import { useRouter } from "next/navigation"; // Next.js router (App Router versiyonu)
import toast from 'react-hot-toast'; // Toast notifications

const LoginPage: React.FC = () => {
  const router = useRouter(); // Sayfa yönlendirme için
  const { login, user, loading, error } = useAuth(); // Auth context hook
  
  // Form state'leri
  const [email, setEmail] = useState(""); // Email input değeri
  const [sifre, setSifre] = useState(""); // Şifre input değeri
  const [submitting, setSubmitting] = useState(false); // Loading durumu
  const [showPwd, setShowPwd] = useState(false); // Şifre göster/gizle

  // Email formatını kontrol eden fonksiyon
  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()); // Regex ile email kontrolü

  // Form geçerlilik kontrolü - email valid ve şifre 6+ karakter olmalı
  const validForm = isValidEmail(email) && sifre.length >= 6 && !submitting;

  // Kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (user && !loading) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Form submit fonksiyonu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Sayfanın yenilenmesini engelle
    if (!validForm) return; // Form geçersizse çık
    
    setSubmitting(true); // Loading başlat
    
    try {
      await login(email.trim(), sifre);
      toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');
      router.push("/dashboard");
    } catch (error) {
      toast.error('Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setSubmitting(false); // Loading'i durdur
    }
  };

  // Eğer kullanıcı varsa yükleniyor göster
  if (user && loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <div style={{ color: "white", textAlign: "center" }}>
          <div style={{
            width: "32px",
            height: "32px",
            border: "3px solid rgba(255, 255, 255, 0.3)",
            borderTop: "3px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }}></div>
          Yönlendiriliyorsunuz...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    // Ana container - tam ekran gradient background
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Gradient arkaplan
      display: "flex",
      alignItems: "center", // Dikey ortala
      justifyContent: "center", // Yatay ortala
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Login kartı */}
      <div style={{
        background: "white", // Beyaz arkaplan
        borderRadius: "16px", // Yuvarlatılmış köşeler
        padding: "48px", // İç boşluk
        width: "100%",
        maxWidth: "420px", // Maksimum genişlik
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", // Gölge efekti
        margin: "20px" // Dış boşluk
      }}>
        {/* Logo ve başlık bölümü */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "32px",
            fontWeight: "600",
            color: "#4f46e5", // Mavi renk
            fontStyle: "italic"
          }}>
            logo {/* Logo metni */}
          </div>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1f2937", // Koyu gri
            margin: "16px 0 8px 0"
          }}>
            Giriş Yap
          </h2>
          <p style={{
            color: "#6b7280", // Açık gri
            fontSize: "14px",
            margin: "0"
          }}>
            Nakliyeci takip sistemine hoş geldiniz
          </p>
        </div>

        {/* Login formu */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Email input alanı */}
          <div>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Email Adresi
            </label>
            <input
              type="email" // Email input tipi
              required // Zorunlu alan
              value={email}
              onChange={(e) => setEmail(e.target.value)} // State güncelleme
              style={{
                width: "100%",
                padding: "12px 16px",
                // Email geçerliliğine göre border rengi
                border: isValidEmail(email) || email === "" ? "2px solid #e5e7eb" : "2px solid #ef4444",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s", // Geçiş efekti
                boxSizing: "border-box"
              }}
              // Focus olduğunda border mavi yap
              onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
              // Focus kaybolduğunda normale döndür
              onBlur={(e) => e.target.style.borderColor = isValidEmail(email) || email === "" ? "#e5e7eb" : "#ef4444"}
              placeholder="ornek@email.com" // Placeholder metni
            />
            {/* Email geçersizse hata mesajı göster */}
            {!isValidEmail(email) && email !== "" && (
              <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0 0" }}>
                Geçerli bir email adresi girin
              </p>
            )}
          </div>

          {/* Şifre input alanı */}
          <div>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Şifre
            </label>
            {/* Şifre input ve göster/gizle butonu container'ı */}
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"} // Şifre gösterme durumuna göre tip
                required
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 50px 12px 16px", // Sağda buton için yer bırak
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                placeholder="••••••••"
              />
              {/* Şifre göster/gizle butonu */}
              <button
                type="button" // Submit olmasın
                onClick={() => setShowPwd(!showPwd)} // State değiştir
                style={{
                  position: "absolute", // Input'un içinde konumlandır
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)", // Dikey ortala
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px"
                }}
              >
                {showPwd ? "Gizle" : "Göster"}
              </button>
            </div>
            {/* Şifre çok kısaysa uyarı */}
            {sifre !== "" && sifre.length < 6 && (
              <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0 0" }}>
                Şifre en az 6 karakter olmalıdır
              </p>
            )}
          </div>

          {/* Hata mesajı alanı */}
          {error && (
            <div style={{
              background: "#fef2f2", // Açık kırmızı arkaplan
              border: "1px solid #fecaca", // Kırmızı border
              color: "#dc2626", // Kırmızı metin
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          {/* Submit butonu */}
          <button
            type="submit"
            disabled={!validForm} // Form geçersizse disable et
            style={{
              width: "100%",
              padding: "12px 24px",
              // Form durumuna göre background
              background: validForm 
                ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" // Gradient mavi
                : "#d1d5db", // Gri (disabled)
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: validForm ? "pointer" : "not-allowed", // Cursor durumu
              transition: "all 0.2s",
              opacity: submitting ? 0.8 : 1 // Loading sırasında şeffaflık
            }}
          >
            {submitting ? (
              // Loading durumunda spinner ve metin
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid transparent",
                  borderTop: "2px solid white", // Sadece üst kısım beyaz
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite" // CSS animasyonu
                }}></div>
                Giriş yapılıyor...
              </div>
            ) : "Giriş Yap"}
          </button>
        </form>
      </div>

      {/* CSS animasyon tanımı */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;