import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
  Settings,
  Lock
} from 'lucide-react';
import NeuThemeToggle from './NeuThemeToggle';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NeuCard from './NeuCard';
import NeuInput from './NeuInput';
import NeuButton from './NeuButton';
import NeuAvatar from './NeuAvatar';

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, currentUser, logout, changePassword } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Password change modal state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

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

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPassSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPassModalOpen(false);
        setPassSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Password update failure:', err);
      if (err.code === 'auth/wrong-password') {
        setPassError('Incorrect current password.');
      } else {
        setPassError(err.message || 'Failed to update password.');
      }
    } finally {
      setPassLoading(false);
    }
  };

  const navItems = [
    userProfile?.role === 'admin' && { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    (userProfile?.role === 'staff' || userProfile?.role === 'admin') && { name: 'Staff Attendance', path: '/staff-attendance', icon: Clock },
    import.meta.env.DEV && { name: 'Style Guide', path: '/style-guide', icon: Settings },
    { name: 'Student Portal (Future)', path: '#', icon: GraduationCap, disabled: true },
    { name: 'Teacher Portal (Future)', path: '#', icon: Users, disabled: true },
  ].filter(Boolean);

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
            <NeuAvatar
              initials={userProfile?.name?.charAt(0).toUpperCase() || '?'}
              size={40}
            />
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.name || 'User Account'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.email || ''}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => setIsPassModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              <Lock size={16} />
              <span>Change Password</span>
            </button>

            <button 
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
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

      {/* Change Password Modal */}
      {isPassModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setIsPassModalOpen(false)}>
          <NeuCard 
            variant="raised" 
            style={{
              width: '100%',
              maxWidth: '400px',
              position: 'relative',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsPassModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Title */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Change Password</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Update your security credentials</p>
            </div>

            {/* Alert boxes */}
            {passError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-danger)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                {passError}
              </div>
            )}
            {passSuccess && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-success)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                color: 'var(--color-success)',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                {passSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuInput
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={passLoading}
              />
              <NeuInput
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={passLoading}
              />
              <NeuInput
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={passLoading}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <NeuButton 
                  type="button" 
                  onClick={() => setIsPassModalOpen(false)} 
                  style={{ flex: 1 }}
                  disabled={passLoading}
                >
                  Cancel
                </NeuButton>
                <NeuButton 
                  type="submit" 
                  variant="accent" 
                  style={{ flex: 1 }}
                  disabled={passLoading}
                >
                  {passLoading ? 'Updating...' : 'Update'}
                </NeuButton>
              </div>
            </form>
          </NeuCard>
        </div>
      )}

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
