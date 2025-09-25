"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/contexts/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Kullanıcı giriş yapmışsa dashboard'a yönlendir
        router.replace("/dashboard");
      } else {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Yönlendirme sırasında loading göster
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
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
        <p>Yönlendiriliyorsunuz...</p>
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