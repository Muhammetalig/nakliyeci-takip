'use client';

import React from 'react';
import { AuthProvider } from '../lib/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

// Bu fonksiyon Next.js App Router'da ana layout komponentidir
// Tüm sayfalar bu layout'un içinde render edilir
export default function RootLayout({
  children, // Her sayfa bu children prop'u olarak gelir
}: {
  children: React.ReactNode // TypeScript tip tanımı - React bileşeni olabilir
}) {
  return (
    <html lang="tr">{/* Türkçe dil ayarı */}
      <head>{/* Tarayıcı sekmesinde görünen başlık */}
        <title>Nakliyeci Takip Sistemi</title>
        <meta name="description" content="Nakliye operasyonlarının takibi için geliştirilmiş web uygulaması" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{/* Sayfa içeriğinin bulunduğu ana body */}
        <AuthProvider>
          {children}{/* Buraya her sayfa (page.tsx) render edilir */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}