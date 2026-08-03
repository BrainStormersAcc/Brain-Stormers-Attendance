import React from 'react';

export default function Skeleton({ type = 'table', rows = 5, cards = 3 }) {
  const shimmerStyle = {
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite alternate',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: '8px',
  };

  if (type === 'stats') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div 
            key={i} 
            style={{ 
              padding: '24px', 
              display: 'flex', 
              gap: '20px', 
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--neu-shadow-raised)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Circle/Icon skeleton */}
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--neu-shadow-pressed-sm)',
              ...shimmerStyle
            }} />
            {/* Text skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ height: '14px', width: '60%', boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
              <div style={{ height: '24px', width: '40%', boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div style={{
        padding: '32px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: 'var(--neu-shadow-raised)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%'
      }}>
        {/* Table Header skeleton */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ height: '18px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
          <div style={{ height: '18px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
          <div style={{ height: '18px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
          <div style={{ height: '18px', flex: 1, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
        </div>
        {/* Table Rows skeleton */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ height: '14px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
            <div style={{ height: '14px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
            <div style={{ height: '14px', flex: 2, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
            <div style={{ height: '14px', flex: 1, boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
          </div>
        ))}
      </div>
    );
  }

  // Fallback single block skeleton
  return (
    <div style={{ 
      width: '100%', 
      height: '140px', 
      padding: '24px', 
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--border-radius-md)',
      boxShadow: 'var(--neu-shadow-raised)',
      border: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', height: '100%', boxShadow: 'var(--neu-shadow-pressed-sm)', ...shimmerStyle }} />
    </div>
  );
}
