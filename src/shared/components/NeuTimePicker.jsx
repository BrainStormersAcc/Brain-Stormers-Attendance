import React, { useState, useEffect, useRef } from 'react';
import { Clock, X } from 'lucide-react';
import NeuCard from './NeuCard.jsx';
import NeuButton from './NeuButton.jsx';

export default function NeuTimePicker({
  label,
  value, // Expects "HH:MM" (24-hour format)
  onChange,
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const containerRef = useRef(null);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  // Parse "HH:MM" (24h) to 12h states
  useEffect(() => {
    if (value) {
      const [hStr, mStr] = value.split(':');
      const h24 = parseInt(hStr, 10);
      const min = mStr || '00';
      
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      
      const period = h24 >= 12 ? 'PM' : 'AM';
      const hrFormatted = String(h12).padStart(2, '0');
      
      setSelectedHour(hrFormatted);
      setSelectedMinute(min);
      setSelectedPeriod(period);
    } else {
      setSelectedHour('--');
      setSelectedMinute('--');
      setSelectedPeriod('AM');
    }
  }, [value, isOpen]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format 12-hour values back to "HH:MM" (24-hour format)
  const applyTime = (hr, min, prd) => {
    if (hr === '--' || min === '--') return;
    
    let hr24 = parseInt(hr, 10);
    if (prd === 'PM' && hr24 < 12) hr24 += 12;
    if (prd === 'AM' && hr24 === 12) hr24 = 0;
    
    const formatted24 = `${String(hr24).padStart(2, '0')}:${min}`;
    onChange({ target: { value: formatted24 } });
  };

  const handleSelectHour = (hr) => {
    setSelectedHour(hr);
    const fallbackMin = selectedMinute === '--' ? '00' : selectedMinute;
    setSelectedMinute(fallbackMin);
    applyTime(hr, fallbackMin, selectedPeriod);
  };

  const handleSelectMinute = (min) => {
    setSelectedMinute(min);
    const fallbackHr = selectedHour === '--' ? '09' : selectedHour;
    setSelectedHour(fallbackHr);
    applyTime(fallbackHr, min, selectedPeriod);
  };

  const handleSelectPeriod = (prd) => {
    setSelectedPeriod(prd);
    if (selectedHour !== '--' && selectedMinute !== '--') {
      applyTime(selectedHour, selectedMinute, prd);
    }
  };

  // Human readable display label (e.g. "09:30 AM")
  const getDisplayValue = () => {
    if (!value || selectedHour === '--' || selectedMinute === '--') {
      return 'Select Time';
    }
    return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Scroll active elements into view when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourRef.current && selectedHour !== '--') {
          const activeHrEl = hourRef.current.querySelector('.time-active-item');
          if (activeHrEl) {
            hourRef.current.scrollTop = activeHrEl.offsetTop - 70;
          }
        }
        if (minuteRef.current && selectedMinute !== '--') {
          const activeMinEl = minuteRef.current.querySelector('.time-active-item');
          if (activeMinEl) {
            minuteRef.current.scrollTop = activeMinEl.offsetTop - 70;
          }
        }
      }, 50);
    }
  }, [isOpen]);

  return (
    <div className="neu-input-container" ref={containerRef} style={{ position: 'relative' }}>
      <style>{`
        .time-column {
          height: 180px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 4px;
        }
        .time-column::-webkit-scrollbar {
          width: 4px;
        }
        .time-column::-webkit-scrollbar-track {
          background: transparent;
        }
        .time-column::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: var(--border-radius-full);
        }
        .time-item {
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--border-radius-sm);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
          outline: none;
        }
        .time-item:hover {
          background-color: var(--bg-surface-elevated);
          color: var(--text-primary);
        }
        .time-active-item {
          background-color: var(--color-primary-glass) !important;
          color: var(--color-primary) !important;
          font-weight: 600;
          box-shadow: var(--color-primary-glass-shadow);
          border: 1px solid var(--color-primary-glass-border);
        }
      `}</style>

      {label && (
        <label className="neu-input-label">
          {label}
        </label>
      )}

      {/* Selector Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '48px',
          padding: '0 16px 0 46px',
          background: 'var(--bg-surface)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: 'var(--neu-shadow-pressed-sm)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.95rem',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <div style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)'
        }}>
          <Clock size={18} />
        </div>
        <span>{getDisplayValue()}</span>
      </button>

      {/* Popover Selection Box */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 1000,
          width: '280px',
        }}>
          <NeuCard variant="raised" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Time</span>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Selection Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.2fr',
              gap: '12px',
              backgroundColor: 'var(--bg-base)',
              boxShadow: 'var(--neu-shadow-pressed-sm)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '4px'
            }}>
              
              {/* Hours Column */}
              <div className="time-column" ref={hourRef}>
                {hoursList.map(hr => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => handleSelectHour(hr)}
                    className={`time-item ${selectedHour === hr ? 'time-active-item' : ''}`}
                  >
                    {hr}
                  </button>
                ))}
              </div>

              {/* Minutes Column */}
              <div className="time-column" ref={minuteRef}>
                {minutesList.map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => handleSelectMinute(min)}
                    className={`time-item ${selectedMinute === min ? 'time-active-item' : ''}`}
                  >
                    {min}
                  </button>
                ))}
              </div>

              {/* AM/PM Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 4px', justifyContent: 'center' }}>
                {['AM', 'PM'].map(prd => (
                  <button
                    key={prd}
                    type="button"
                    onClick={() => handleSelectPeriod(prd)}
                    className={`time-item ${selectedPeriod === prd && selectedHour !== '--' ? 'time-active-item' : ''}`}
                    style={{ height: '40px', padding: 0 }}
                  >
                    {prd}
                  </button>
                ))}
              </div>

            </div>

            {/* Confirm Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <NeuButton 
                type="button" 
                variant="raised" 
                onClick={() => {
                  onChange({ target: { value: '' } });
                  setIsOpen(false);
                }}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Clear
              </NeuButton>
              <NeuButton 
                type="button" 
                variant="accent" 
                onClick={() => setIsOpen(false)}
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                Done
              </NeuButton>
            </div>

          </NeuCard>
        </div>
      )}
    </div>
  );
}
