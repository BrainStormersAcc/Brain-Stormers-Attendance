import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Clock 
} from 'lucide-react';
import { doc } from 'firebase/firestore'; // fallback or none
import logo from '../../assets/logo.png';
function Loader({ size = 50, style = {}, fullPage = false, type = 'default' }) {
  // Determine which icon and anim to render inside the central circle
  let CenterElement = null;
  let animClass = 'neu-pulse-default';

  if (type === 'overview') {
    CenterElement = <LayoutDashboard size={size * 0.4} style={{ color: '#3b82f6' }} />;
    animClass = 'neu-pulse-scale';
  } else if (type === 'staff') {
    CenterElement = <Users size={size * 0.4} style={{ color: '#8b5cf6' }} />;
    animClass = 'neu-slide-bounce';
  } else if (type === 'records') {
    CenterElement = <FileText size={size * 0.4} style={{ color: '#10b981' }} />;
    animClass = 'neu-pulse-glow';
  } else if (type === 'settings') {
    CenterElement = <Settings size={size * 0.4} style={{ color: '#f59e0b' }} />;
    animClass = 'neu-gear-spin';
  } else if (type === 'attendance') {
    CenterElement = <Clock size={size * 0.4} style={{ color: '#ec4899' }} />;
    animClass = 'neu-clock-pulse';
  } else {
    // Default: Branded institutional logo
    CenterElement = (
      <img 
        src={logo} 
        alt="Brain Stormers Logo" 
        style={{ 
          width: `${size * 0.5}px`, 
          height: `${size * 0.5}px`, 
          objectFit: 'contain' 
        }} 
      />
    );
    animClass = 'neu-pulse-default';
  }

  const loaderContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      ...style
    }}>
      {/* Outer Neumorphic Ring */}
      <div style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--bg-base)',
        boxShadow: 'var(--neu-shadow-raised-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Inner Pressed Track */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          right: '4px',
          bottom: '4px',
          borderRadius: '50%',
          boxShadow: 'var(--neu-shadow-pressed-sm)',
          backgroundColor: 'var(--bg-base)',
        }} />

        {/* Spinning Active Ring Arc */}
        <div className="neu-spinner-arc" style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          borderRadius: '50%',
          border: '4px solid transparent',
          borderTopColor: 'var(--color-primary)',
          borderRightColor: '#3b82f6',
          animation: 'neu-spin 0.8s cubic-bezier(0.4, 0.1, 0.3, 0.8) infinite',
          filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))',
        }} />

        {/* Dynamic Center Element with animClass */}
        <div className={animClass} style={{
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {CenterElement}
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        transition: 'background-color var(--transition-normal)',
      }}>
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

export default Loader;
