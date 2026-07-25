import { create } from 'zustand';
import type { User } from '../types';
import { getSession, clearSession, saveSession } from '../services/auth';

interface SessionState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreSession: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  restoreSession: async () => {
    try {
      const session = await getSession();
      if (session) {
        set({ user: session.user, token: session.token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setSession: async (token: string, user: User) => {
    await saveSession(token, user);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await clearSession();
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));