"use client";
import React, { useState } from 'react';
import { createUser } from '../../lib/firebase-service';
import { User } from '../../lib/types';
import toast from 'react-hot-toast';

// Bu sayfa sadece ilk admin kullanıcısı oluşturmak için
// Kullandıktan sonra silinebilir
const SetupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    setLoading(true);
    
    try {
      const adminUser: Omit<User, 'id'> = {
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: 'admin',
        phone: '05551234567',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userId = await createUser(adminUser);
      console.log('Admin user created with ID:', userId);
      toast.success('Admin kullanıcısı başarıyla oluşturuldu!');
      
      // Personel kullanıcısı da oluşturalım
      const staffUser: Omit<User, 'id'> = {
        email: 'personel@test.com', 
        displayName: 'Personel User',
        role: 'personel',
        phone: '05551234568',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const staffUserId = await createUser(staffUser);
      console.log('Staff user created with ID:', staffUserId);
      toast.success('Personel kullanıcısı da oluşturuldu!');
      
    } catch (error: unknown) {
      console.error('Error creating admin user:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Kullanıcı oluşturulurken hata: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: "48px",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        textAlign: "center",
        maxWidth: "400px",
        width: "100%",
        margin: "20px"
      }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "16px"
        }}>
          İlk Kurulum
        </h1>
        
        <p style={{
          color: "#6b7280",
          fontSize: "14px",
          marginBottom: "32px"
        }}>
          Veritabanında test kullanıcıları oluşturmak için butona tıklayın.
        </p>

        <div style={{
          background: "#f3f4f6",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          fontSize: "12px",
          color: "#4b5563",
          textAlign: "left"
        }}>
          <strong>Oluşturulacak kullanıcılar:</strong><br/>
          • admin@test.com (Admin) - Şifre: 123456<br/>
          • personel@test.com (Personel) - Şifre: 123456
        </div>

        <button
          onClick={createAdminUser}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 24px",
            background: loading ? "#d1d5db" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid transparent",
                borderTop: "2px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
              Oluşturuluyor...
            </div>
          ) : (
            'Test Kullanıcıları Oluştur'
          )}
        </button>

        <p style={{
          fontSize: "12px",
          color: "#9ca3af",
          marginTop: "16px"
        }}>
          Bu işlemi sadece bir kez yapmanız yeterli.
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SetupPage;