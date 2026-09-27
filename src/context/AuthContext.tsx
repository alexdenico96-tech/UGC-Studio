import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, isSupabaseConfigured, type AuthUser } from '@/lib/supabase';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      if (isSupabaseConfigured) {
        const session = await authApi.getSession();
        if (session?.user) {
          const profile = await authApi.getProfile(session.user);
          setUser(profile);
        }
      } else {
        // mock
        const raw = localStorage.getItem('ugc_mock_user');
        if (raw) setUser(JSON.parse(raw));
      }
      setLoading(false);

      unsub = await authApi.onAuthChange((u) => {
        setUser(u);
        setLoading(false);
      });
    })();

    return () => unsub();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isMock: !isSupabaseConfigured,
    signIn: (email, password) => authApi.signIn(email, password),
    signUp: (email, password, nombre) => authApi.signUp(email, password, nombre),
    signOut: () => authApi.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
