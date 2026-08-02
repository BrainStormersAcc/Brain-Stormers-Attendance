import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import NeuCard from './NeuCard';
import NeuButton from './NeuButton';

export default function NeuDatePicker({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select Date',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial view coordinates based on value or fallback to today
  const getInitialView = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          return { month: m, year: y };
        }
      }
    }
    const today = new Date();
    return { month: today.getMonth(), year: today.getFullYear() };
  };

  const [viewMonth, setViewMonth] = useState(getInitialView().month);
  const [viewYear, setViewYear] = useState(getInitialView().year);

  // Sync view month/year when values update externally
  useEffect(() => {
    const coords = getInitialView();
    setViewMonth(coords.month);
    setViewYear(coords.year);
  }, [value]);

  // Click outside to close calendar handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Helper calendar calculations
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day, isCurrentMonth = true) => {
    let targetMonth = viewMonth;
    let targetYear = viewYear;

    if (!isCurrentMonth) {
      if (day > 15) {
        // Clicked previous month day
        if (viewMonth === 0) {
          targetMonth = 11;
          targetYear = viewYear - 1;
        } else {
          targetMonth = viewMonth - 1;
        }
      } else {
        // Clicked next month day
        if (viewMonth === 11) {
          targetMonth = 0;
          targetYear = viewYear + 1;
        } else {
          targetMonth = viewMonth + 1;
        }
      }
    }

    const formattedMonth = String(targetMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${targetYear}-${formattedMonth}-${formattedDay}`;

    onChange(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const getFormattedDisplay = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Build grid day nodes (42 slots: 6 rows of 7 days)
  const renderGridDays = () => {
    const grid = [];

    // 1. Render end of previous month
    for (let i = firstDayWeekdayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      grid.push({ day: dayNum, current: false });
    }

    // 2. Render current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      grid.push({ day: i, current: true });
    }

    // 3. Render beginning of next month to fill grid
    const remainingSlots = 42 - grid.length;
    for (let i = 1; i <= remainingSlots; i++) {
      grid.push({ day: i, current: false });
    }

    return grid.map((cell, idx) => {
      // Check if selected
      let isSelected = false;
      if (value && cell.current) {
        const parts = value.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          isSelected = y === viewYear && m === viewMonth && d === cell.day;
        }
      }

      // Check if today
      const today = new Date();
      const isToday = today.getFullYear() === viewYear && 
                      today.getMonth() === viewMonth && 
                      today.getDate() === cell.day && 
                      cell.current;

      return (
        <button
          key={idx}
          type="button"
          onClick={() => handleSelectDay(cell.day, cell.current)}
          style={{
            background: isSelected ? 'var(--color-success-glow)' : 'transparent',
            border: isSelected ? '1px solid var(--color-success)' : '1px solid transparent',
            color: isSelected 
              ? 'var(--color-success)' 
              : (cell.current ? 'var(--text-primary)' : 'var(--text-muted)'),
            fontWeight: isSelected || isToday ? '600' : 'normal',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            boxShadow: isToday && !isSelected ? '0 0 0 1px var(--color-primary)' : 'none',
            transition: 'all var(--transition-fast)'
          }}
          onMouseOver={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }
          }}
          onMouseOut={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
        >
          {cell.day}
        </button>
      );
    });
  };

  return (
    <div 
      className={`neu-datepicker ${className}`} 
      ref={containerRef} 
      style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', position: 'relative' }}
    >
      {label && <label className="neu-input-label">{label}</label>}

      {/* Input trigger box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: isOpen ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.95rem',
          outline: 'none',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'box-shadow var(--transition-fast)'
        }}
      >
        <span>{getFormattedDisplay()}</span>
        <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Floating Neumorphic Calendar Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '76px',
          left: 0,
          right: 0,
          minWidth: '280px',
          zIndex: 1000,
          animation: 'fadeIn var(--transition-fast) forwards'
        }}>
          <NeuCard
            variant="raised"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Header: Month & Year Picker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={18} />
              </button>
              
              <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {monthsList[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday Labels Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              {weekdays.map((wd, idx) => (
                <div key={idx}>{wd}</div>
              ))}
            </div>

            {/* 6x7 Calendar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px 0',
              justifyItems: 'center',
              alignItems: 'center'
            }}>
              {renderGridDays()}
            </div>

            {/* Footer Utilities */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <NeuButton
                type="button"
                onClick={handleClear}
                style={{ flex: 1, padding: '8px' }}
              >
                Clear
              </NeuButton>
              <NeuButton
                type="button"
                onClick={handleToday}
                variant="accent"
                style={{ flex: 1, padding: '8px' }}
              >
                Today
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}
    </div>
  );
}
