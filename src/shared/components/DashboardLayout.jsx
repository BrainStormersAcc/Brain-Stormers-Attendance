import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  GraduationCap, 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  Clock,
  Settings
} from 'lucide-react';
import NeuThemeToggle from './NeuThemeToggle';

function DashboardLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Staff Attendance', path: '/staff-attendance', icon: Clock },
    { name: 'Style Guide', path: '/style-guide', icon: Settings },
    { name: 'Student Portal (Future)', path: '#', icon: GraduationCap, disabled: true },
    { name: 'Teacher Portal (Future)', path: '#', icon: Users, disabled: true },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', transition: 'background var(--transition-normal)' }}>
      {/* Sidebar - Desktop */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 10,
        transition: 'transform var(--transition-normal)'
      }} className={`desktop-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Brain Stormers</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>ATTENDANCE</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.disabled) {
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.95rem'
                }}>
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--color-primary-glow)' : 'transparent',
                  borderRadius: 'var(--border-radius-sm)',
                  transition: 'background var(--transition-fast), color var(--transition-fast)',
                  fontSize: '0.95rem',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              A
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin Account</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>admin@brainstormers.com</p>
            </div>
          </div>
          <Link to="/login" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem'
          }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }} className="main-container">
        {/* Top Header */}
        <header style={{
          height: '70px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}>
          {/* Mobile menu toggle */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            className="mobile-menu-btn"
          >
            <Menu size={24} />
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Theme Toggle */}
            <NeuThemeToggle />

            {/* PWA Connection Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isOnline ? 'var(--color-success)' : 'var(--color-danger)',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              {isOnline ? (
                <>
                  <Wifi size={14} />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  <span>Offline Mode</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Yield Outlet */}
        <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Embedded Responsive styles */}
      <style>{`
        @media (max-width: 991px) {
          .desktop-sidebar {
            transform: translateX(-280px);
          }
          .desktop-sidebar.open {
            transform: translateX(0);
          }
          .mobile-close-btn {
            display: block !important;
          }
          .main-container {
            margin-left: 0 !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardLayout;
