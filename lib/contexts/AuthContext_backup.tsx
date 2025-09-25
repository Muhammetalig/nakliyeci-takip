'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { User } from '../types';
import { getUserByEmail, saveUser } from '../firebase-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  isAdmin: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = () => {
    return user?.email === 'muhammetalitasdemir@gmail.com';
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user from our database
          const userData = await getUserByEmail(firebaseUser.email!);
          if (userData) {
            setUser(userData);
          } else {
            // Create new user in our database
            const newUser: Omit<User, 'id'> = {
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!,
              phone: firebaseUser.phoneNumber || undefined,
              role: firebaseUser.email === 'muhammetalitasdemir@gmail.com' ? 'admin' : 'personel',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: firebaseUser.uid
            };
            
            // Save user to database and set state
            const savedUser = await saveUser(newUser);
            setUser(savedUser);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    logout,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
