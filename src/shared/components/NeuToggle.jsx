import React from 'react';

export default function NeuToggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props
}) {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div 
      className={`neu-toggle-container ${checked ? 'neu-toggle-active' : ''} ${className}`}
      onClick={handleToggle}
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
      {...props}
    >
      <div className="neu-toggle-track">
        <div className="neu-toggle-thumb" />
      </div>
      {label && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>}
    </div>
  );
}
