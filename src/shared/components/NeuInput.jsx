import React from 'react';

export default function NeuInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  disabled = false,
  className = '',
  id,
  required = false,
  icon: Icon,
  ...props
}) {
  const inputId = id || `neu-input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`neu-input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="neu-input-label">
          {label}
        </label>
      )}
      <div className="neu-input-wrapper">
        {Icon && (
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
            pointerEvents: 'none'
          }}>
            <Icon size={18} />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="neu-input"
          style={{
            paddingLeft: Icon ? '46px' : '16px'
          }}
          {...props}
        />
      </div>
    </div>
  );
}
