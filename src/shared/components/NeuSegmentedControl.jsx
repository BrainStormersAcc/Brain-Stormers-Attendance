import React, { useRef, useEffect, useState } from 'react';

export default function NeuSegmentedControl({
  options, // Array of strings, e.g. ['Cards + Table', 'Table Only', 'Calendar View']
  selectedValue,
  onChange,
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const [thumbStyle, setThumbStyle] = useState({ left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find the selected option index
    const selectedIndex = options.indexOf(selectedValue);
    if (selectedIndex === -1) return;

    // Retrieve child button coordinates inside container ref
    const optionElements = containerRef.current.querySelectorAll('.neu-seg-option');
    const selectedEl = optionElements[selectedIndex];
    
    if (selectedEl) {
      setThumbStyle({
        left: selectedEl.offsetLeft,
        width: selectedEl.offsetWidth,
        height: selectedEl.offsetHeight
      });
    }
  }, [selectedValue, options]);

  return (
    <div
      ref={containerRef}
      className={`neu-segmented-control-track ${className}`}
      style={{
        display: 'inline-flex',
        padding: '4px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-full)',
        boxShadow: 'var(--neu-shadow-pressed-sm)',
        position: 'relative',
        zIndex: 1,
        alignItems: 'center',
        ...style
      }}
    >
      {/* Sliding Thumb background overlay */}
      <div
        className="neu-seg-thumb"
        style={{
          position: 'absolute',
          top: '4px',
          left: `${thumbStyle.left}px`,
          width: `${thumbStyle.width}px`,
          height: `${thumbStyle.height}px`,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--border-radius-full)',
          boxShadow: 'var(--neu-shadow-raised-sm)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0
        }}
      />

      {options.map((option, idx) => (
        <button
          key={idx}
          type="button"
          className="neu-seg-option"
          onClick={() => onChange(option)}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8rem',
            fontWeight: selectedValue === option ? 700 : 600,
            color: selectedValue === option ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            zIndex: 2,
            position: 'relative',
            borderRadius: 'var(--border-radius-full)',
            transition: 'color var(--transition-fast)',
            whiteSpace: 'nowrap'
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
