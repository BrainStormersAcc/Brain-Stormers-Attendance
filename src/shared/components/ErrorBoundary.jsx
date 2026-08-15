import React, { Component } from 'react';
import NeuCard from './NeuCard';
import NeuButton from './NeuButton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught component render crash:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}>
          <NeuCard variant="raised" style={{
            maxWidth: '540px',
            width: '100%',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-elevated)',
              boxShadow: 'var(--neu-shadow-pressed-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-danger)'
            }}>
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>
                Application Crash Detected
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                An unexpected component rendering error caused the application interface to crash. Click below to reload the page.
              </p>
            </div>

            {this.state.error && (
              <pre style={{
                width: '100%',
                maxHeight: '120px',
                overflow: 'auto',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--color-danger)',
                textAlign: 'left',
                margin: 0,
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--neu-shadow-pressed-sm)',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <NeuButton
              onClick={this.handleReload}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 600 }}
            >
              <RefreshCw size={18} />
              <span>Reload Application</span>
            </NeuButton>
          </NeuCard>
        </div>
      );
    }

    return this.props.children;
  }
}
