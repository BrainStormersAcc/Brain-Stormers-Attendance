import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

  // Determine actual HTML input type
  const actualType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`neu-input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="neu-input-label">
          {label}
        </label>
      )}
      <div className="neu-input-wrapper" style={{ position: 'relative' }}>
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
          type={actualType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="neu-input"
          style={{
            paddingLeft: Icon ? '46px' : '16px',
            paddingRight: type === 'password' ? '46px' : '16px',
            width: '100%',
            boxSizing: 'border-box'
          }}
          {...props}
        />

        {/* Toggle password visibility button */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              zIndex: 10,
              outline: 'none'
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
