import React from 'react';
import { Calendar, UserCheck, AlertCircle } from 'lucide-react';

function StaffDashboard() {
  const dummyLogs = [
    { name: 'Niaz Morshed', role: 'Administrator', time: '09:05 AM', status: 'On Time' },
    { name: 'Sarah Connor', role: 'Coordinator', time: '09:12 AM', status: 'On Time' },
    { name: 'John Doe', role: 'Senior Lecturer', time: '09:40 AM', status: 'Late' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Staff Attendance</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage office schedules, monitor check-in records, and view daily registers.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="dashboard-grid">
        {/* Punch Card Terminal Placeholder */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Check-In Console</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Log check-in/check-out timestamp manually or initiate automatic check-in terminal scans.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="glow-btn" style={{ flex: 1 }}>Punch Check-In</button>
            <button className="glow-btn" style={{ flex: 1, background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Log Leave</button>
          </div>
        </div>

        {/* Real-time Status log */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UserCheck size={18} style={{ color: 'var(--color-success)' }} />
            <span>Today's Log (Mock)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dummyLogs.map((log, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                background: 'rgba(255, 255, 255, 0.01)',
                fontSize: '0.9rem'
              }}>
                <div>
                  <span style={{ fontWeight: 600, display: 'block' }}>{log.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.role}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 500, display: 'block' }}>{log.time}</span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: log.status === 'On Time' ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffDashboard;
