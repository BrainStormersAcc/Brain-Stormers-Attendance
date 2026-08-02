import React from 'react';
import { Clock, Users, GraduationCap, Calendar } from 'lucide-react';

function DashboardHome() {
  const stats = [
    { label: 'Staff Present Today', value: '18 / 20', change: '+2 vs yesterday', icon: Clock, color: 'var(--color-primary)' },
    { label: 'Students Checked In', value: '342 / 400', change: '85.5% attendance rate', icon: GraduationCap, color: 'var(--color-accent)' },
    { label: 'Active Batches Today', value: '12 Classes', change: 'All schedules on track', icon: Calendar, color: 'var(--color-success)' }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Control Panel</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back to Brain Stormers Attendance management console.</p>
      </div>

      {/* Stats Cards Section */}
      <div className="dashboard-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color
              }}>
                <Icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{stat.label}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2px' }}>{stat.value}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access / Modules list */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Attendance Features</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', maxWidth: '600px' }}>
          Navigate to the individual module dashboards to log daily entry/exit times, review records, configure scan-in terminals, and generate reports.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ color: 'var(--color-primary)' }}>Staff Module</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log check-ins, leaves, and view monthly logs for all office and coaching staff.</p>
          </div>
          <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', opacity: 0.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ color: 'var(--color-accent)' }}>Student Module (Upcoming)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>QR/RFID based student attendance and push alerts to parents.</p>
          </div>
          <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', opacity: 0.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ color: 'var(--color-success)' }}>Teacher Module (Upcoming)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lecture logging, check-in, check-out, and substitution management.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
