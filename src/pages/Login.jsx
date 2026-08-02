import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuInput from '../shared/components/NeuInput.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import { Mail, Lock } from 'lucide-react';
import { db } from '../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in via Firebase Auth
      const userCredential = await login(email, password);
      const user = userCredential.user;

      // 2. Fetch user profile role from Firestore for instant redirection
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = userDoc.data();
        if (profile.role === 'staff') {
          navigate('/staff-attendance', { replace: true });
        } else if (profile.role === 'admin') {
          navigate('/', { replace: true });
        } else {
          setError('Unrecognized user role.');
        }
      } else {
        setError('User profile registration records missing.');
      }
    } catch (err) {
      console.error('Login failure:', err);
      // Clean generic error message
      setError('Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'var(--bg-base)',
      transition: 'background var(--transition-normal)'
    }} className="animate-fade-in">
      <NeuCard variant="raised" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Brain Stormers</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Attendance Portal Staff Check-In</p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--color-danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            color: 'var(--color-danger)',
            fontSize: '0.875rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NeuInput
            label="Email Address"
            type="email"
            placeholder="name@brainstormers.com"
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

          <NeuButton
            type="submit"
            variant="accent"
            disabled={loading}
            style={{ width: '100%', marginTop: '12px' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </NeuButton>
        </form>
      </NeuCard>
    </div>
  );
}
