'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { getUserByEmail, createUser } from '../firebase-service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Firebase kullanıcısı varsa, veritabanından tam kullanıcı bilgilerini al
          console.log('Firebase user found:', firebaseUser.email);
          
          try {
            const userData = await getUserByEmail(firebaseUser.email!);
            if (userData) {
              console.log('User data loaded:', userData);
              setUser(userData);
            } else {
              console.log('User not found in database, creating default user...');
              // Eğer kullanıcı veritabanında yoksa, varsayılan bir kullanıcı oluştur
              const newUser: Omit<User, 'id'> = {
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                role: 'personel', // Varsayılan rol
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Kullanıcıyı veritabanına kaydet
              const userId = await createUser(newUser);
              setUser({ ...newUser, id: userId });
              console.log('New user created with ID:', userId);
            }
          } catch (dbError: unknown) {
            console.error('Database error:', dbError);
            // Veritabanı hatası varsa, Firebase kullanıcı bilgileriyle devam et
            const fallbackUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              role: 'personel',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setUser(fallbackUser);
            const dbMessage = dbError instanceof Error ? dbError.message : String(dbError);
            setError(`Veritabanı bağlantı hatası: ${dbMessage}`);
          }
        } else {
          console.log('No Firebase user found');
          setUser(null);
        }
      } catch (err: unknown) {
        console.error('Auth state change error:', err);
        const authMessage = err instanceof Error ? err.message : String(err);
        setError('Kullanıcı bilgileri alınırken hata oluştu: ' + authMessage);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUserByEmail(userCredential.user.email!);
      
      if (!userData) {
        throw new Error('Kullanıcı veritabanında bulunamadı');
      }
      
      setUser(userData);
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Firebase hata kodlarını kullanıcı dostu mesajlara çevir
      let errorMessage = 'Giriş yapılamadı';
  const errCode = (err as { code?: string })?.code;
  switch (errCode) {
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Kullanıcı hesabı devre dışı bırakılmış';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Kullanıcı bulunamadı';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Yanlış şifre';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin';
          break;
        default:
          errorMessage = (err instanceof Error ? err.message : String(err)) || 'Beklenmeyen bir hata oluştu';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Logout error:', err);
      setError('Çıkış yapılırken hata oluştu');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protecting routes
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oturum Açmanız Gerekiyor
          </h2>
          <p className="text-gray-600">
            Bu sayfayı görüntülemek için lütfen oturum açın.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Yetkiniz Bulunmamaktadır
          </h2>
          <p className="text-gray-600">
            Bu sayfayı görüntülemek için gerekli yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};