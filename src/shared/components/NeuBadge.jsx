import React from 'react';

export default function NeuBadge({ 
  children, 
  variant = 'present', // 'present' | 'absent' | 'late'
  style = {},
  ...props 
}) {
  // Map variant to styling colors (soft neumorphic tones)
  let badgeColor = 'var(--text-primary)';
  let glowColor = 'transparent';
  let borderTone = 'var(--border-color)';
  
  const normalizedVariant = variant.toLowerCase();

  if (normalizedVariant === 'present') {
    badgeColor = 'var(--color-success)';
    glowColor = 'var(--color-success-glow)';
    borderTone = 'rgba(52, 211, 153, 0.2)'; // Soft emerald border glow
  } else if (normalizedVariant === 'absent') {
    badgeColor = 'var(--color-danger)';
    glowColor = 'rgba(248, 113, 113, 0.1)';
    borderTone = 'rgba(248, 113, 113, 0.2)'; // Soft rose border glow
  } else if (normalizedVariant === 'late') {
    badgeColor = 'var(--color-warning)';
    glowColor = 'var(--color-warning-glow)';
    borderTone = 'rgba(251, 191, 36, 0.2)'; // Soft amber border glow
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 14px',
        borderRadius: 'var(--border-radius-full)',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: 'var(--bg-surface-elevated)',
        border: `1px solid ${borderTone}`,
        boxShadow: 'var(--neu-shadow-pressed-sm)',
        color: badgeColor,
        textShadow: `0 0 6px ${glowColor}`,
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
        ...style
      }}
      {...props}
    >
      {children}
    </span>
  );
}
