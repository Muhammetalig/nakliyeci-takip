"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, user, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const validForm = isValidEmail(email) && sifre.length >= 6 && !submitting;

  useEffect(() => {
    if (user && !loading) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validForm) return;
    setSubmitting(true);
    try {
      await login(email.trim(), sifre);
      toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');
      router.push('/dashboard');
    } catch (err) {
      toast.error('Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user && loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#f8fafc 0%, #eef2f7 100%)'
      }}>
        <div style={{ color: '#334155', textAlign: 'center' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(51,65,85,0.2)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Yönlendiriliyorsunuz...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(180deg,#f8fafc 0%, #eef2f7 100%)',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      position: 'relative'
    }}>
      {/* Sol info panel (>=900px görünür) */}
      <div style={{
        flex: 1,
        display: 'none',
        padding: '64px 72px',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 30% 30%, #e0f2fe 0%, transparent 60%)',
        position: 'relative'
      }} className="login-left-panel">
        <div style={{ maxWidth: 440 }}>
          <div style={{
            fontSize: 40,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 24,
            letterSpacing: '-.5px'
          }}>Nakliye Operasyon Platformu</div>
          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: '#475569',
            margin: 0
          }}>Operasyon, nakliyeci ve finans süreçlerinizi tek bir panelden yönetin. Gerçek zamanlı takip, hızlı kayıt ve sade arayüz.</p>
        </div>
      </div>

      {/* Sağ form container */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
            // hafif cam efekti istenirse: backdropFilter: 'blur(6px)',
          borderRadius: 20,
          padding: '48px 48px 44px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 6px 20px -4px rgba(15,23,42,0.08),0 2px 4px rgba(15,23,42,0.06)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              fontSize: 30,
              fontWeight: 600,
              fontStyle: 'italic',
              color: '#3b82f6'
            }}>logo</div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 600,
              margin: '20px 0 8px',
              color: '#1e293b'
            }}>Giriş Yap</h2>
            <p style={{
              fontSize: 14,
              color: '#64748b',
              margin: 0
            }}>Nakliyeci takip sistemine hoş geldiniz</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6, letterSpacing: '.2px'
              }}>Email Adresi</label>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='ornek@firma.com'
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1.5px solid ${isValidEmail(email) || email === '' ? '#cbd5e1' : '#ef4444'}`,
                  borderRadius: 10,
                  fontSize: 15,
                  outline: 'none',
                  background: '#f8fafc',
                  transition: 'border-color .18s, background .18s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = isValidEmail(email) || email === '' ? '#cbd5e1' : '#ef4444'; e.currentTarget.style.background = '#f8fafc'; }}
              />
              {!isValidEmail(email) && email !== '' && (
                <p style={{ color: '#dc2626', fontSize: 11, margin: '6px 0 0' }}>Geçerli bir email adresi girin</p>
              )}
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6, letterSpacing: '.2px'
              }}>Şifre</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder='••••••••'
                  style={{
                    width: '100%',
                    padding: '12px 46px 12px 16px',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                    background: '#f8fafc',
                    transition: 'border-color .18s, background .18s'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                />
                <button
                  type='button'
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '4px 6px',
                    borderRadius: 6
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >{showPwd ? 'Gizle' : 'Göster'}</button>
              </div>
              {sifre !== '' && sifre.length < 6 && (
                <p style={{ color: '#dc2626', fontSize: 11, margin: '6px 0 0' }}>Şifre en az 6 karakter olmalıdır</p>
              )}
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.4
              }}>{error}</div>
            )}

            <button
              type='submit'
              disabled={!validForm}
              style={{
                width: '100%',
                padding: '14px 22px',
                background: validForm ? 'linear-gradient(90deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: validForm ? 'pointer' : 'not-allowed',
                letterSpacing: '.3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'filter .18s, transform .18s',
                boxShadow: validForm ? '0 4px 14px -4px rgba(59,130,246,0.45)' : 'none',
                opacity: submitting ? .85 : 1
              }}
              onMouseEnter={(e) => { if (validForm) e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={(e) => { if (validForm) e.currentTarget.style.filter = 'none'; }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Giriş yapılıyor...
                </>
              ) : 'Giriş Yap'}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} Nakliye Platformu</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
        @media (min-width: 900px){
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;