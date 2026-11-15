import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore, type Session, type Teacher } from './api';

type AuthState = {
  teacher: Teacher | null;
  loading: boolean;
  signIn: (s: Session) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me()
      .then(setTeacher)
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const value: AuthState = {
    teacher,
    loading,
    signIn: (s) => { tokenStore.set(s.token); setTeacher(s.teacher); },
    signOut: () => { tokenStore.set(null); setTeacher(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}
