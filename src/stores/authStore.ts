import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '@/types';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email: string, password: string) => {
        // Simular autenticación
        if (email === 'asesora@financiera.com' && password === 'admin123') {
          set({
            isAuthenticated: true,
            user: {
              name: 'Patricia Mendoza',
              email: 'asesora@financiera.com',
              role: 'advisor'
            }
          });
          return true;
        }
        return false;
      },
      logout: () => {
        set({
          isAuthenticated: false,
          user: null
        });
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);