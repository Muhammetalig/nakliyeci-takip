// Firebase SDK'dan gerekli fonksiyonları import ediyoruz
import { initializeApp, getApps, getApp } from "firebase/app"; // Firebase app başlatma
import { getAuth } from "firebase/auth"; // Authentication (kimlik doğrulama) servisi
import { getFirestore } from "firebase/firestore"; // Firestore veritabanı
import { getStorage } from "firebase/storage"; // Firebase Storage (dosya yükleme)

// Firebase projesinin ayarları - .env.local dosyasından alınır
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Firebase API anahtarı
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Authentication domain'i
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Proje ID'si
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Dosya depolama
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Mesajlaşma ID
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Uygulama ID'si
};

// Config validation
if (!firebaseConfig.apiKey) {
  throw new Error("Firebase API key eksik! .env.local dosyasını kontrol edin.");
}

// Firebase uygulamasını başlatır - eğer zaten başlatılmışsa mevcut olanı kullanır
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Authentication servisini başlatır - kullanıcı giriş/çıkış işlemleri için
export const auth = getAuth(app);

// Firestore veritabanını başlatır
export const db = getFirestore(app);

// Storage servisini başlatır - dosya yükleme işlemleri için
export const storage = getStorage(app);
