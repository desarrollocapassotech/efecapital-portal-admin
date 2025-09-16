import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '@/types';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthStore extends AuthState {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isLoading: true,
      login: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        try {
          await signOut(auth);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
          });
        }
      },
      initializeAuth: () => {
        set({ isLoading: true });
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            const name = firebaseUser.displayName || firebaseUser.email || 'Usuario';

            set({
              isAuthenticated: true,
              user: {
                uid: firebaseUser.uid,
                name,
                email: firebaseUser.email ?? '',
                role: 'advisor',
              },
              isLoading: false,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            });
          }
        });

        return unsubscribe;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
