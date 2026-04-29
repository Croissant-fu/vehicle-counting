import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { darkTheme, lightTheme, ThemeTokens } from '../theme';
import { getDatabase } from '../db/database';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  G: ThemeTokens;
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  G: darkTheme,
  mode: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Load persisted preference on mount
  useEffect(() => {
    getDatabase().then((db) =>
      db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'theme_mode'",
      )
    ).then((row) => {
      if (row?.value === 'light') setMode('light');
    });
  }, []);

  const toggle = useCallback(async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('theme_mode', ?)",
      [next],
    );
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ G: mode === 'dark' ? darkTheme : lightTheme, mode, toggle }),
    [mode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext).G;
}

export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
  const { mode, toggle } = useContext(ThemeContext);
  return { mode, toggle };
}
