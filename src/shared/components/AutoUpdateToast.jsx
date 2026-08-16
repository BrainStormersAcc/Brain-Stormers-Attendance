import React, { useState, useEffect } from 'react';
import NeuCard from './NeuCard';
import NeuButton from './NeuButton';
import { Download, RefreshCw, X } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function AutoUpdateToast() {
  const [showToast, setShowToast] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [fadeToBlack, setFadeToBlack] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // Check if we are running in Electron and autoUpdateAPI is exposed
  const isElectron = typeof window !== 'undefined' && !!window.autoUpdateAPI;

  useEffect(() => {
    if (!isElectron) {
      // Expose a global testing helper in browser console
      window.__triggerUpdateTest = (mockVersion = '1.0.1') => {
        console.log('[AutoUpdate DevTools] Simulating update:downloaded for testing.');
        setUpdateInfo({ version: mockVersion });
        setShowToast(true);
      };
      return;
    }

    // Listen to the IPC update:downloaded channel
    const unsubscribe = window.autoUpdateAPI.onUpdateDownloaded((info) => {
      console.log('[AutoUpdate] Update downloaded payload received in renderer:', info);
      setUpdateInfo(info);
      setShowToast(true);
    });

    // Also expose testing helper in Electron
    window.__triggerUpdateTest = (mockVersion = '1.0.1') => {
      console.log('[AutoUpdate DevTools] Simulating update:downloaded for testing.');
      setUpdateInfo({ version: mockVersion });
      setShowToast(true);
    };

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isElectron]);

  const handleRestart = () => {
    setShowToast(false);
    setShowOverlay(true);

    // 2-second premium animation transition
    setTimeout(() => {
      setFadeToBlack(true);
      // Wait for fade to black transition to complete
      setTimeout(() => {
        if (isElectron) {
          window.autoUpdateAPI.restartAndInstall();
        } else {
          console.log('[AutoUpdate Mock] Relaunching app with new version...');
          setShowOverlay(false);
          setFadeToBlack(false);
          alert('Mock Update Complete! Application restarted.');
        }
      }, 300);
    }, 2200);
  };

  const handleLater = () => {
    setShowToast(false);
  };

  if (!showToast && !showOverlay) return null;

  return (
    <>
      {/* Toast Slide-In Banner */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          maxWidth: '380px',
          width: 'calc(100% - 48px)',
          animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <NeuCard variant="raised" style={{
            padding: '20px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
          }}>
            {/* Pulsing Green Icon */}
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              boxShadow: 'var(--neu-shadow-pressed-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
              flexShrink: 0,
              position: 'relative'
            }}>
              <Download size={20} className="animate-pulse" />
              <span className="animate-ping" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '8px',
                width: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)'
              }} />
            </div>

            {/* Notification content */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.975rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Update Available
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Version {updateInfo?.version || 'new'} has been downloaded and is ready to install.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <NeuButton 
                  onClick={handleRestart} 
                  variant="accent" 
                  style={{ padding: '8px 16px', fontSize: '0.825rem', fontWeight: 600 }}
                >
                  <RefreshCw size={14} className="animate-spin-slow" style={{ marginRight: '6px' }} />
                  Restart Now
                </NeuButton>
                <button 
                  onClick={handleLater}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.825rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
                  onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
                >
                  Later
                </button>
              </div>
            </div>

            {/* Close cross */}
            <button 
              onClick={handleLater}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = 'var(--text-secondary)'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
            >
              <X size={16} />
            </button>
          </NeuCard>
        </div>
      )}

      {/* Full-Screen Restart Transition Overlay */}
      {showOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          backgroundColor: fadeToBlack ? '#000000' : 'rgba(15, 23, 42, 0.75)',
          backdropFilter: fadeToBlack ? 'none' : 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease-out, backdrop-filter 0.3s ease-out',
          opacity: 1
        }}>
          {!fadeToBlack && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
              {/* Pulsing Logo Ring with glowing color wave */}
              <div 
                className="logo-ring-pulse"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-primary)',
                  boxShadow: 'var(--neu-shadow-raised-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {/* Logo Image */}
                <img 
                  src={logo} 
                  alt="App Logo" 
                  style={{
                    width: '68px',
                    height: '68px',
                    objectFit: 'contain',
                    zIndex: 2
                  }} 
                />
              </div>

              {/* Loading Typography */}
              <div style={{ textAlign: 'center' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Updating Brain Stormers Attendance...
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  marginTop: '8px',
                  margin: '8px 0 0 0',
                  animation: 'pulseOpacity 1.5s infinite ease-in-out'
                }}>
                  Relaunching in a moment
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded Animations and Keyframes */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulseOpacity {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes ringPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: var(--neu-shadow-raised-sm), 0 0 0 0px rgba(6, 182, 212, 0.4);
          }
          50% {
            transform: scale(1.03);
            box-shadow: var(--neu-shadow-raised-sm), 0 0 20px 10px rgba(99, 102, 241, 0.15);
          }
        }
        .logo-ring-pulse {
          animation: ringPulse 2.5s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
