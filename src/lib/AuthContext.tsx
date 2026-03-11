import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoginModal } from '../components/LoginModal';

interface User {
  id: string;
  telegram_id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  balance: number;
  has_used_promo: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (telegramData: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  topup: (amount: number, description: string) => Promise<void>;
  deduct: (amount: number, description: string, isPromo?: boolean) => Promise<void>;
  requireLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const refreshUser = async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }
    
    const parsed = JSON.parse(storedUser);
    try {
      const res = await fetch(`/api/users/${parsed.id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (e) {
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (telegramData: any) => {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramData)
    });
    if (!res.ok) throw new Error('Auth failed');
    const data = await res.json();
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const topup = async (amount: number, description: string) => {
    if (!user) return;
    const res = await fetch(`/api/users/${user.id}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description }),
    });
    const data = await res.json();
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const deduct = async (amount: number, description: string, isPromo?: boolean) => {
    if (!user) return;
    const res = await fetch(`/api/users/${user.id}/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description, isPromo }),
    });
    if (!res.ok) throw new Error('Insufficient balance');
    const data = await res.json();
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  };

  useEffect(() => {
    refreshUser();
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, topup, deduct, requireLogin: () => setShowLoginModal(true) }}>
      {children}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
