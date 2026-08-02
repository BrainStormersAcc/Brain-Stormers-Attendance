import React from 'react';

function Loader({ size = 40, style = {} }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      ...style
    }}>
      <div className="spinner" style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Loader;
