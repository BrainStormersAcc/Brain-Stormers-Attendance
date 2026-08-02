import React from 'react';

export default function NeuButton({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'normal', // 'normal' | 'accent'
  disabled = false,
  className = '',
  style = {},
  ...props 
}) {
  const btnClass = variant === 'accent' ? 'neu-btn-accent' : 'neu-btn';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${btnClass} ${className}`}
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
