import React from 'react';

export default function NeuCard({ 
  children, 
  variant = 'raised', // 'raised' | 'inset'
  className = '',
  style = {},
  ...props 
}) {
  const cardClass = variant === 'inset' ? 'neu-card inset' : 'neu-card';
  
  return (
    <div
      className={`${cardClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
