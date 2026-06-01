import { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => setIsDark(!isDark);

  const colors = isDark ? {
    background: '#0f0f0f',
    card: '#1a1a1a',
    text: '#ffffff',
    subtext: '#888888',
    border: '#333333',
    primary: '#4CAF50',
  } : {
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#000000',
    subtext: '#666666',
    border: '#dddddd',
    primary: '#4CAF50',
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}