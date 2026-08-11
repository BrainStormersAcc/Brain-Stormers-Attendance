import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  Smile,
  Check,
  RefreshCw,
  ClipboardList,
  ShieldAlert,
  Shield,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import NeuThemeToggle from './NeuThemeToggle';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NeuCard from './NeuCard';
import NeuInput from './NeuInput';
import NeuButton from './NeuButton';
import NeuAvatar from './NeuAvatar';
import logo from '../../assets/logo.png';
import Loader from './Loader.jsx';

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, currentUser, logout, changePassword, updateAvatar } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(() => {
    return ['/admin-settings', '/staff-management'].includes(location.pathname);
  });
  const [isAttendancePanelOpen, setIsAttendancePanelOpen] = useState(() => {
    return location.pathname.startsWith('/staff-attendance');
  });
  const [isAttendanceExpandsOpen, setIsAttendanceExpandsOpen] = useState(() => {
    return ['/attendance-records', '/audit-log', '/misuse-monitoring'].includes(location.pathname);
  });

  useEffect(() => {
    if (['/admin-settings', '/staff-management'].includes(location.pathname)) {
      setIsAdminPanelOpen(true);
    }
    if (location.pathname.startsWith('/staff-attendance')) {
      setIsAttendancePanelOpen(true);
    }
    if (['/attendance-records', '/audit-log', '/misuse-monitoring'].includes(location.pathname)) {
      setIsAttendanceExpandsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setPageTransitioning(true);
    const timer = setTimeout(() => {
      setPageTransitioning(false);
    }, 2000); // 2 seconds transition duration
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const getLoaderType = () => {
    const path = location.pathname;
    if (path === '/') return 'overview';
    if (path === '/staff-management') return 'staff';
    if (path === '/attendance-records') return 'records';
    if (path === '/admin-settings') return 'settings';
    if (path === '/audit-log') return 'records';
    if (path.startsWith('/staff-attendance')) return 'attendance';
    return 'default';
  };
  
  // Dropdown & Modal states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Avatar customizer state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const avatarOptions = ['👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '🤖', '🦁', '🦉', '🦄', '🦊', '🍅', '⚽', '🚀'];
  const [tempSelectedAvatar, setTempSelectedAvatar] = useState(userProfile?.avatar || '');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const handleSaveAvatar = async () => {
    if (!tempSelectedAvatar) return;
    setIsSavingAvatar(true);
    
    // Play charming pulse and loader for 1.5 seconds before updating state
    setTimeout(async () => {
      try {
        await updateAvatar(tempSelectedAvatar);
        setIsAvatarModalOpen(false);
      } catch (err) {
        console.error('Failed to update avatar:', err);
      } finally {
        setIsSavingAvatar(false);
      }
    }, 1500);
  };

  // Password change modal state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Online status listener
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

  // Click outside listener for dropdown closing
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPassError('Incorrect current password.');
      } else {
        setPassError(err.message || 'Failed to update password.');
      }
    } finally {
      setPassLoading(false);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isStaff = userProfile?.role === 'staff';

  const navItems = [
    (isStaff || isAdmin) && { name: 'Overview', path: '/', icon: LayoutDashboard },
    isAdmin && {
      name: 'Admin Control Panel',
      isGroup: true,
      icon: Shield,
      subItems: [
        { name: 'Admin Settings', path: '/admin-settings', icon: Settings },
        { name: 'Staff Account Management', path: '/staff-management', icon: Users },
      ]
    },
    (isStaff || isAdmin) && {
      name: 'Attendance Panel',
      isGroup: true,
      icon: Calendar,
      subItems: [
        { name: 'Staff Portal', path: '/staff-attendance', icon: Clock },
        { name: 'Student Portal (Under Development)', path: '#', icon: GraduationCap, underConstruction: true },
        { name: 'Teacher Portal (Under Development)', path: '#', icon: Users, underConstruction: true },
      ]
    },
    (isStaff || isAdmin) && {
      name: 'Attendance Expands',
      isGroup: true,
      icon: Layers,
      subItems: [
        (isStaff || isAdmin) && { name: 'Attendance Records', path: '/attendance-records', icon: Clock },
        isAdmin && { name: 'Audit Log', path: '/audit-log', icon: ClipboardList },
        isAdmin && { name: 'Misuse Monitoring', path: '/misuse-monitoring', icon: ShieldAlert },
      ].filter(Boolean)
    }
  ].filter(Boolean);



  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', transition: 'background var(--transition-normal)' }}>
      {/* Sidebar - Desktop */}
      <aside className={`desktop-sidebar ${sidebarOpen ? 'open' : ''}`}>
        
        {/* Sidebar Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/" className="sidebar-brand-header">
            <div className="sidebar-brand-logo-container">
              <img src={logo} alt="Brain Stormers Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform var(--transition-normal)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>Brain Stormers</h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, letterSpacing: '0.05em', transition: 'color var(--transition-normal), text-shadow var(--transition-normal)' }}>ATTENDANCE</span>
            </div>
          </Link>
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
        <nav style={{ 
          flex: 1, 
          padding: '24px 16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          overflowY: 'auto'
        }}>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.isGroup) {
              const isSubActive = item.subItems.some(sub => location.pathname === sub.path);
              
              let isOpen = false;
              if (item.name === 'Admin Control Panel') isOpen = isAdminPanelOpen;
              else if (item.name === 'Attendance Panel') isOpen = isAttendancePanelOpen;
              else if (item.name === 'Attendance Expands') isOpen = isAttendanceExpandsOpen;
              
              const toggleOpen = () => {
                if (item.name === 'Admin Control Panel') {
                  setIsAdminPanelOpen(!isAdminPanelOpen);
                } else if (item.name === 'Attendance Panel') {
                  setIsAttendancePanelOpen(!isAttendancePanelOpen);
                } else if (item.name === 'Attendance Expands') {
                  setIsAttendanceExpandsOpen(!isAttendanceExpandsOpen);
                }
              };

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={toggleOpen}
                    className={`sidebar-nav-link ${isSubActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '11px 15px 11px 19px',
                      color: isSubActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: 'var(--border-radius-sm)',
                      transition: 'all var(--transition-fast)',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon size={18} style={{ color: isSubActive ? 'var(--color-primary)' : 'inherit' }} />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {isOpen && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingLeft: '16px',
                      borderLeft: '1px dashed var(--border-color)',
                      marginLeft: '28px',
                      animation: 'slideDownFast 0.2s ease-out'
                    }}>
                      {item.subItems.map((sub, sIdx) => {
                        const SubIcon = sub.icon;
                        const isSubActiveCurrent = location.pathname === sub.path;
                        
                        if (sub.underConstruction) {
                          return (
                            <div 
                              key={sIdx} 
                              className="under-construction-link"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px 10px 16px',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                                opacity: 0.8
                              }}
                            >
                              <SubIcon size={16} />
                              <span>{sub.name}</span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={sIdx}
                            to={sub.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`sidebar-nav-link ${isSubActiveCurrent ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 12px 10px 16px',
                              color: isSubActiveCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                              background: isSubActiveCurrent ? 'var(--color-success-glass)' : 'transparent',
                              border: isSubActiveCurrent ? '1px solid var(--color-success-glass-border)' : '1px solid transparent',
                              borderRadius: 'var(--border-radius-sm)',
                              transition: 'all var(--transition-fast)',
                              fontSize: '0.9rem',
                              boxShadow: isSubActiveCurrent ? 'var(--color-success-glass-shadow)' : 'none'
                            }}
                          >
                            <SubIcon size={16} style={{ color: isSubActiveCurrent ? 'var(--color-success)' : 'inherit' }} />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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

            if (item.underConstruction) {
              return (
                <div key={idx} className="under-construction-link">
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
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 15px 11px 19px', // Subtract 1px to offset 1px border so height remains exactly 46px
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--color-success-glass)' : 'transparent',
                  border: isActive ? '1px solid var(--color-success-glass-border)' : '1px solid transparent',
                  borderRadius: 'var(--border-radius-sm)',
                  transition: 'all var(--transition-fast)',
                  fontSize: '0.95rem',
                  boxShadow: isActive ? 'var(--color-success-glass-shadow)' : 'none'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--color-success)' : 'inherit' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '338px', display: 'flex', flexDirection: 'column' }} className="main-container">
        
        {/* Top Header */}
        <header className="floating-navbar">
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

          {/* History Navigation Buttons */}
          <div className="neu-nav-track" style={{ marginLeft: '12px' }}>
            <style>{`
              .neu-nav-track {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px;
                height: 38px;
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-full);
                box-shadow: var(--neu-shadow-pressed-sm);
                transition: all var(--transition-normal);
              }
              .neu-nav-btn {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--bg-surface);
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
                box-shadow: var(--neu-shadow-raised-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                outline: none;
                transition: all var(--transition-fast);
              }
              .neu-nav-btn:hover {
                background: var(--bg-surface-elevated);
                color: var(--color-primary);
                transform: translateY(-0.5px);
                box-shadow: -2px -2px 6px var(--color-shadow-light), 2px 2px 6px var(--color-shadow-dark);
              }
              .neu-nav-btn:active {
                box-shadow: var(--neu-shadow-pressed-sm);
                transform: translateY(0);
              }
              .neu-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                pointer-events: none;
                box-shadow: none;
                background: transparent;
                border-color: transparent;
              }
            `}</style>
            <button 
              onClick={() => navigate(-1)} 
              className="neu-nav-btn" 
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft size={14} />
            </button>
            <button 
              onClick={() => navigate(1)} 
              className="neu-nav-btn" 
              title="Go Forward"
              aria-label="Go Forward"
            >
              <ArrowRight size={14} />
            </button>
          </div>

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

            {/* User Profile Avatar Dropdown */}
            <div className="avatar-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  borderRadius: '50%',
                  boxShadow: dropdownOpen ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                  transition: 'box-shadow var(--transition-fast)'
                }}
              >
                <NeuAvatar
                  initials={userProfile?.avatar || userProfile?.name?.charAt(0).toUpperCase() || '?'}
                  size={36}
                />
              </button>

              {/* Smooth Animated Dropdown menu */}
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50px',
                  width: '240px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--neu-shadow-raised)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  zIndex: 200,
                  opacity: dropdownOpen ? 1 : 0,
                  transform: dropdownOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                  visibility: dropdownOpen ? 'visible' : 'hidden',
                  transformOrigin: 'top right',
                  transition: 'opacity var(--transition-normal), transform var(--transition-normal), visibility var(--transition-normal)'
                }}
              >
                {/* User Info details */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userProfile?.name || 'User Account'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      color: userProfile?.role === 'admin' ? 'var(--color-accent)' : 'var(--color-success)', 
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: userProfile?.role === 'admin' ? 'var(--color-accent-glow)' : 'var(--color-success-glow)',
                      border: `1px solid ${userProfile?.role === 'admin' ? 'var(--color-accent-glow)' : 'var(--color-success-glass-border)'}`
                    }}>
                      {userProfile?.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userProfile?.username || currentUser?.email || ''}
                  </p>
                </div>

                 {/* Operations links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsPassModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 0',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Lock size={16} />
                    <span>Account Settings</span>
                  </button>

                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      setTempSelectedAvatar(userProfile?.avatar || '');
                      setIsAvatarModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 0',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Smile size={16} />
                    <span>Change Avatar</span>
                  </button>

                  <button 
                    onClick={(e) => {
                      setDropdownOpen(false);
                      handleSignOut(e);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 0',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* Page Yield Outlet */}
        <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', width: '100%', margin: '0 auto', position: 'relative' }}>
          {pageTransitioning && (
            <div className="page-transition-overlay">
              <Loader size={45} type={getLoaderType()} style={{ padding: 0 }} />
            </div>
          )}
          <div style={{
            opacity: pageTransitioning ? 0 : 1,
            transform: pageTransitioning ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            visibility: pageTransitioning ? 'hidden' : 'visible'
          }}>
            <Outlet />
          </div>
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

      {/* Change Avatar Modal */}
      {isAvatarModalOpen && (
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
        }} onClick={() => setIsAvatarModalOpen(false)}>
          <NeuCard 
            variant="raised" 
            style={{
              width: '100%',
              maxWidth: '380px',
              position: 'relative',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsAvatarModalOpen(false)}
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
            <div>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Select Avatar</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Choose your personal profile icon style</p>
            </div>

            {/* Avatar Grid Selection */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              padding: '10px 0'
            }}>
              {avatarOptions.map((avatar, idx) => {
                const isSelected = tempSelectedAvatar === avatar;
                const shouldPulse = isSavingAvatar && isSelected;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!isSavingAvatar) {
                        setTempSelectedAvatar(avatar);
                      }
                    }}
                    disabled={isSavingAvatar}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '16px',
                      fontSize: '2rem',
                      cursor: isSavingAvatar ? 'default' : 'pointer',
                      outline: 'none',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                      transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
                      transform: isSelected ? 'scale(0.98)' : 'scale(1)'
                    }}
                    className={shouldPulse ? 'animate-avatar-pulse' : ''}
                    onMouseOver={(e) => {
                      if (!isSavingAvatar && !isSelected) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSavingAvatar) {
                        e.currentTarget.style.transform = isSelected ? 'scale(0.98)' : 'scale(1)';
                      }
                    }}
                  >
                    {avatar}

                    {/* Selected Checkmark Badge Overlay */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-success)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 15
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save Button triggers pulse loader */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <NeuButton 
                onClick={() => setIsAvatarModalOpen(false)} 
                style={{ flex: 1 }}
                disabled={isSavingAvatar}
              >
                Cancel
              </NeuButton>
              <NeuButton 
                onClick={handleSaveAvatar} 
                variant="accent" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={isSavingAvatar || !tempSelectedAvatar}
              >
                {isSavingAvatar ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Save Avatar</span>
                )}
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}

      {/* Embedded Responsive styles */}
      <style>{`
        @keyframes slideDownFast {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sidebar-brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          margin-left: -12px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          transition: all var(--transition-normal);
          position: relative;
          overflow: hidden;
        }

        .sidebar-brand-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: var(--border-radius-sm);
          opacity: 0;
          transition: opacity var(--transition-normal);
          z-index: 1;
        }

        .sidebar-brand-header:hover::before {
          opacity: 1;
        }

        .sidebar-brand-header > * {
          position: relative;
          z-index: 2;
        }

        .sidebar-brand-logo-container {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background-color: var(--bg-base);
          box-shadow: var(--neu-shadow-pressed-sm);
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 6px;
          transition: all var(--transition-normal);
          overflow: hidden;
          position: relative;
        }

        .sidebar-brand-header:hover .sidebar-brand-logo-container {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.4), var(--neu-shadow-raised-sm);
          border-color: rgba(59, 130, 246, 0.3);
          background-color: var(--bg-surface-elevated);
        }

        .sidebar-brand-logo-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0) 30%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 70%,
            transparent
          );
          transform: skewX(-20deg);
          transition: none;
        }

        html[data-theme="dark"] .sidebar-brand-logo-container::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(138, 180, 248, 0) 30%,
            rgba(138, 180, 248, 0.5) 50%,
            rgba(138, 180, 248, 0) 70%,
            transparent
          );
        }

        .sidebar-brand-header:hover .sidebar-brand-logo-container::after {
          animation: logo-shimmer-flow 1.5s infinite;
        }

        @keyframes logo-shimmer-flow {
          0% {
            left: -150%;
          }
          100% {
            left: 150%;
          }
        }

        .sidebar-brand-header:hover img {
          animation: logo-float-flow 2s ease-in-out infinite alternate;
        }

        @keyframes logo-float-flow {
          0% {
            transform: translateY(0px);
          }
          100% {
            transform: translateY(-2px);
          }
        }

        .sidebar-brand-header:hover span {
          color: #3b82f6 !important;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        }

        .page-transition-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          background-color: var(--bg-base);
          transition: background-color var(--transition-normal);
          animation: page-loader-fade-in-out 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes page-loader-fade-in-out {
          0% { opacity: 0; transform: scale(0.96); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.99); }
        }

        .floating-navbar {
          height: 70px;
          background-color: var(--bg-surface-glass);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid var(--border-color-glass);
          border-radius: var(--border-radius-md);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 16px;
          margin: 16px 40px 0 40px;
          z-index: 99;
           transition: all var(--transition-normal);
        }

        .sidebar-nav-link {
          position: relative;
        }

        .sidebar-nav-link.active::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 8px;
          bottom: 8px;
          width: 4px;
          background-color: var(--color-success);
          border-radius: var(--border-radius-full);
          box-shadow: 0 0 8px var(--color-success);
        }

        .desktop-sidebar {
          width: 290px;
          background-color: var(--bg-surface-glass);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid var(--border-color-glass);
          border-radius: var(--border-radius-md);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 16px;
          bottom: 16px;
          left: 24px;
          z-index: 99;
          transition: transform var(--transition-normal);
        }

        @media (max-width: 991px) {
          .desktop-sidebar {
            left: 16px !important;
            top: 16px !important;
            bottom: 16px !important;
            width: 290px !important;
            transform: translateX(-350px) !important;
            border-radius: var(--border-radius-md) !important;
          }
          .desktop-sidebar.open {
            transform: translateX(0) !important;
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
          .floating-navbar {
            margin: 12px 16px 0 16px;
            top: 12px;
            border-radius: var(--border-radius-sm);
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardLayout;
