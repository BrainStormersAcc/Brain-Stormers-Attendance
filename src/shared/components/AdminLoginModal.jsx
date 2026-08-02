import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NeuCard from './NeuCard.jsx';
import NeuInput from './NeuInput.jsx';
import NeuButton from './NeuButton.jsx';
import { X, Lock, Mail } from 'lucide-react';
import { db } from '../../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminLoginModal() {
  const { isAdminModalOpen, setIsAdminModalOpen, login, logout } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAdminModalOpen) return null;

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setIsAdminModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in via Firebase Auth
      const userCredential = await login(email, password);
      const user = userCredential.user;

      // 2. Fetch role from Firestore users collection
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        // Successful Admin authentication
        handleClose();
        navigate('/', { replace: true });
      } else {
        // Non-admin or missing document -> logout immediately and show generic error
        await logout();
        setError('Invalid email or password.');
      }
    } catch (err) {
      console.error('Admin authentication failure:', err);
      // Generic error message for security (don't leak if account exists or not)
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
    }} onClick={handleClose}>
      <NeuCard 
        variant="raised" 
        style={{
          width: '100%',
          maxWidth: '440px',
          position: 'relative',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
        onClick={(e) => e.stopPropagation()} // Stop bubbling to overlay close
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'color var(--transition-fast)'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Admin Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Provide credentials for administrative access</p>
        </div>

        {/* Error Message Box */}
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--color-danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            color: 'var(--color-danger)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NeuInput
            label="Admin Email"
            type="email"
            placeholder="admin@brainstormers.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={Mail}
            disabled={loading}
          />

          <NeuInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={Lock}
            disabled={loading}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <NeuButton 
              type="button" 
              onClick={handleClose} 
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </NeuButton>
            <NeuButton 
              type="submit" 
              variant="accent" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </NeuButton>
          </div>
        </form>
      </NeuCard>
    </div>
  );
}
