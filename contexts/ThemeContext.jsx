import React, { createContext, useContext, useState } from 'react';

const themes = {
  light: {
    background: '#ffffff',
    text: '#000000',
    primary: '#4A90E2',
    card: '#f8f9fa',
    border: '#e9ecef',
  },
  dark: {
    background: '#121212',
    text: '#ffffff',
    primary: '#4A90E2',
    card: '#1e1e1e',
    border: '#333333',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // default theme

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const colors = themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
