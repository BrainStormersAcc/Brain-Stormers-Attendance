import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function NeuThemeToggle({ className = '', ...props }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div 
      className={`neu-theme-toggle ${theme === 'dark' ? 'dark' : ''} ${className}`}
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
      {...props}
    >
      <Sun className={`neu-theme-toggle-icon ${theme === 'light' ? 'active' : ''}`} size={16} style={{ color: 'var(--color-warning)', marginLeft: '8px' }} />
      <Moon className={`neu-theme-toggle-icon ${theme === 'dark' ? 'active' : ''}`} size={16} style={{ color: '#a78bfa', marginRight: '8px' }} />
      <div className="neu-theme-toggle-thumb">
        {theme === 'light' ? <Sun size={14} style={{ color: 'var(--color-warning)' }} /> : <Moon size={14} style={{ color: '#a78bfa' }} />}
      </div>
    </div>
  );
}
