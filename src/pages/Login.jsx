import React, { useState } from 'react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Logging in with:', email, password);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }} className="animate-fade-in">
      {/* Decorative Glow Elements */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
        top: '10%',
        left: '10%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        bottom: '10%',
        right: '10%',
        zIndex: 0
      }} />

      {/* Login Box */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        zIndex: 1,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Brain Stormers</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Attendance Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@brainstormers.com" 
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              required
            />
          </div>

          <button type="submit" className="glow-btn" style={{ width: '100%', marginTop: '10px', padding: '12px' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
