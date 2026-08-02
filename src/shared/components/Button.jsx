import React from 'react';

function Button({ children, onClick, type = 'button', variant = 'primary', style = {}, ...props }) {
  const getBackgroundColor = () => {
    if (variant === 'secondary') return 'rgba(255, 255, 255, 0.08)';
    if (variant === 'danger') return 'var(--color-danger)';
    return 'var(--color-primary)';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className="glow-btn"
      style={{
        background: getBackgroundColor(),
        border: 'none',
        borderRadius: 'var(--border-radius-sm)',
        padding: '10px 20px',
        color: '#fff',
        fontWeight: 500,
        cursor: 'pointer',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
