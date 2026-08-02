import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuInput from '../shared/components/NeuInput.jsx';
import NeuToggle from '../shared/components/NeuToggle.jsx';
import NeuAvatar from '../shared/components/NeuAvatar.jsx';
import NeuThemeToggle from '../shared/components/NeuThemeToggle.jsx';
import { Settings, Search, Mail, User, Info, CheckCircle2 } from 'lucide-react';

export default function StyleGuide() {
  const { theme, toggleTheme } = useTheme();
  
  // Local state for interactive component verification
  const [toggleState1, setToggleState1] = useState(false);
  const [toggleState2, setToggleState2] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [buttonClicks, setButtonClicks] = useState(0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Neumorphism Style Guide</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Centralized Design System Sandbox for Brain Stormers Attendance</p>
        </div>
        <NeuCard variant="raised" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Current Theme: <span style={{ color: 'var(--color-primary)', textTransform: 'capitalize' }}>{theme}</span>
          </span>
          <NeuThemeToggle />
        </NeuCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Category: Containers (NeuCard) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Containers (NeuCard)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <NeuCard variant="raised">
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Raised Card Container</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                This is the standard raised card container. It uses soft dual external shadows to create the appearance of popping out of the background.
              </p>
            </NeuCard>
            <NeuCard variant="inset">
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} style={{ color: 'var(--color-accent)' }} />
                <span>Inset Card Container</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                This is the inset card container. It uses inverted/inner shadows to look pressed down or hollowed into the background surface.
              </p>
            </NeuCard>
          </div>
        </section>

        {/* Category: Buttons (NeuButton) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Buttons (NeuButton)</h2>
          <NeuCard variant="raised" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <NeuButton onClick={() => setButtonClicks(c => c + 1)}>
                Normal Button
              </NeuButton>
              <NeuButton variant="accent" onClick={() => setButtonClicks(c => c + 1)}>
                Accent Button
              </NeuButton>
              <NeuButton onClick={() => setButtonClicks(c => c + 1)}>
                <Settings size={16} />
                <span>With Icon</span>
              </NeuButton>
              <NeuButton variant="accent" onClick={() => setButtonClicks(c => c + 1)}>
                <span>Success Alert</span>
                <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
              </NeuButton>
              <NeuButton disabled>
                Disabled Button
              </NeuButton>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--border-radius-sm)', border: '1px dashed var(--border-color)', display: 'inline-block', width: 'fit-content' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Interactive Click Count: <strong>{buttonClicks}</strong>
              </span>
            </div>
          </NeuCard>
        </section>

        {/* Category: Inputs (NeuInput) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Form Inputs (NeuInput)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <NeuCard variant="raised" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuInput
                label="Search Logins"
                placeholder="Search staff, date or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Search Value: {searchQuery || <em style={{ color: 'var(--text-muted)' }}>None</em>}
              </div>
            </NeuCard>

            <NeuCard variant="raised" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuInput
                label="Email Address"
                type="email"
                placeholder="enter-email@domain.com"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                icon={Mail}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Input Value: {textInput || <em style={{ color: 'var(--text-muted)' }}>None</em>}
              </div>
            </NeuCard>
          </div>
        </section>

        {/* Category: Toggles (NeuToggle) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Toggles (NeuToggle)</h2>
          <NeuCard variant="raised" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
              <NeuToggle
                checked={toggleState1}
                onChange={setToggleState1}
                label="Switch System Offline"
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '68px' }}>
                Status: {toggleState1 ? 'Active/Offline' : 'Inactive/Online'}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
              <NeuToggle
                checked={toggleState2}
                onChange={setToggleState2}
                label="Auto Punch-In Terminal"
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '68px' }}>
                Status: {toggleState2 ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
              <NeuToggle
                checked={false}
                disabled={true}
                label="Permanently Locked Settings"
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '68px' }}>
                Status: Disabled (ReadOnly)
              </span>
            </div>
          </NeuCard>
        </section>

        {/* Category: Avatars (NeuAvatar) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Avatars (NeuAvatar)</h2>
          <NeuCard variant="raised" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
              
              {/* Image Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NeuAvatar
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  alt="Staff member portrait"
                  size={72}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Image (72px)</span>
              </div>

              {/* Initials Avatar - Primary */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NeuAvatar
                  initials="NM"
                  size={64}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Initials (64px)</span>
              </div>

              {/* Placeholder / Fallback Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NeuAvatar
                  size={52}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default (52px)</span>
              </div>

              {/* Large Image Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NeuAvatar
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                  alt="Admin member portrait"
                  size={96}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Large (96px)</span>
              </div>

            </div>
          </NeuCard>
        </section>

      </div>
    </div>
  );
}
