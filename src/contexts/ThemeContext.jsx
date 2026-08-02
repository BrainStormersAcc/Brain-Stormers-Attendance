import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const setCookie = (name, value, days = 365) => {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};path=/;expires=${d.toUTCString()};SameSite=Strict`;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check browser cookies for preference first
    const savedTheme = getCookie('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Default to light
    return 'light';
  });

  useEffect(() => {
    // Set the data-theme attribute on root HTML node
    document.documentElement.setAttribute('data-theme', theme);
    // Persist to cookie
    setCookie('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
