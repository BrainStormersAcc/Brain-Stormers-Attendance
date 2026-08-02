import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg-primary)'
    }} className="animate-fade-in">
      <h1 style={{
        fontSize: '8rem',
        fontWeight: 800,
        fontFamily: 'var(--font-display)',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0'
      }}>404</h1>
      
      <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Page Not Found</h2>
      
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: '480px',
        marginBottom: '32px',
        fontSize: '1rem',
        lineHeight: 1.6
      }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <Link to="/" className="glow-btn">
        Return to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
