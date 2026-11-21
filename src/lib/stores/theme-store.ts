'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme: Theme) => {
        const resolved =
          theme === 'system'
            ? typeof window !== 'undefined' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : theme;

        set({ theme, resolvedTheme: resolved });

        // Apply to document
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', resolved === 'dark');
        }
      },
    }),
    {
      name: 'mfm-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved =
            state.theme === 'system'
              ? typeof window !== 'undefined' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
              : state.theme;

          state.resolvedTheme = resolved;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle(
              'dark',
              resolved === 'dark'
            );
          }
        }
      },
    }
  )
);
