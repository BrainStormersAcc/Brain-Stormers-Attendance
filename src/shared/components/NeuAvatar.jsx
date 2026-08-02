import React from 'react';

export default function NeuAvatar({
  src,
  alt = 'User Avatar',
  initials,
  size = 64, // diameter in pixels
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={`neu-avatar-frame ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...style
      }}
      {...props}
    >
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="neu-avatar-img" 
        />
      ) : (
        <div className="neu-avatar-placeholder" style={{ fontSize: `${size * 0.38}px` }}>
          {initials || '?'}
        </div>
      )}
    </div>
  );
}
