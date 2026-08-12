import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Smartphone, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Key,
  ShieldCheck
} from 'lucide-react';
import NeuCard from '../../../shared/components/NeuCard.jsx';
import NeuInput from '../../../shared/components/NeuInput.jsx';
import NeuButton from '../../../shared/components/NeuButton.jsx';
import NeuToggle from '../../../shared/components/NeuToggle.jsx';
import Skeleton from '../../../shared/components/Skeleton.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { 
  getDevices, 
  addDevice, 
  updateDevice, 
  deleteDevice 
} from '../services/deviceService.js';

export default function DeviceList() {
  const { userProfile, currentUser } = useAuth();
  
  // Page states
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states (Add Device)
  const [deviceName, setDeviceName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [forStaff, setForStaff] = useState(true);
  const [forTeacher, setForTeacher] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Modal states
  const [editingDevice, setEditingDevice] = useState(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editForStaff, setEditForStaff] = useState(true);
  const [editForTeacher, setEditForTeacher] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Mask reveal states (maps device ID to boolean)
  const [revealedKeys, setRevealedKeys] = useState({});

  // Fetch registered devices
  const fetchDevicesList = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getDevices();
      setDevices(list);
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to fetch devices from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesList();
  }, []);

  // Handle saving new device
  const handleSaveDevice = async (e) => {
    e.preventDefault();
    if (!deviceName.trim() || !licenseKey.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const newDeviceData = {
        deviceName: deviceName.trim(),
        licenseKey: licenseKey.trim(),
        forStaff: forStaff,
        forTeacher: forTeacher,
        active: true, // keep general active as true for backward compatibility
        registeredBy: currentUser?.uid || 'unknown',
        registeredByName: userProfile?.name || 'Admin',
      };

      await addDevice(newDeviceData);
      setSuccess('Scanner registered successfully.');
      setDeviceName('');
      setLicenseKey('');
      setForStaff(true);
      setForTeacher(true);
      fetchDevicesList();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to register device:', err);
      setError('Failed to register new scanner.');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (device) => {
    setEditingDevice(device);
    setEditName(device.deviceName);
    setEditKey(device.licenseKey);
    setEditForStaff(device.forStaff !== false); // default to true if undefined
    setEditForTeacher(device.forTeacher !== false); // default to true if undefined
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setEditingDevice(null);
    setEditName('');
    setEditKey('');
  };

  // Handle updating device
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editKey.trim()) {
      setError('Required fields cannot be empty.');
      return;
    }

    setUpdating(true);
    setError('');
    
    try {
      await updateDevice(editingDevice.id, {
        deviceName: editName.trim(),
        licenseKey: editKey.trim(),
        forStaff: editForStaff,
        forTeacher: editForTeacher
      });
      setSuccess('Scanner details updated successfully.');
      closeEditModal();
      fetchDevicesList();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update device:', err);
      setError('Failed to update scanner registration.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle inline portal status toggle from table view
  const handleTogglePortalStatus = async (id, portalField, currentStatus) => {
    setError('');
    try {
      const newStatus = !currentStatus;
      await updateDevice(id, { [portalField]: newStatus });
      setDevices(prev => prev.map(dev => 
        dev.id === id ? { ...dev, [portalField]: newStatus } : dev
      ));
      setSuccess(`Scanner portal access updated successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update portal status:', err);
      setError('Failed to update portal status.');
    }
  };

  // Handle deleting device
  const handleDeleteDevice = async (id, name) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setError('');
    try {
      await deleteDevice(id);
      setSuccess('Scanner registration deleted successfully.');
      setDevices(prev => prev.filter(dev => dev.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete device:', err);
      setError('Failed to delete scanner registration.');
    }
  };

  // Masking key helper
  const getMaskedKey = (key, id) => {
    if (revealedKeys[id]) return key;
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
  };

  // Handle key reveal with automatic re-masking timeout
  const handleToggleRevealKey = (id) => {
    setRevealedKeys(prev => {
      const isCurrentlyRevealed = prev[id];
      if (isCurrentlyRevealed) {
        return { ...prev, [id]: false };
      } else {
        // Auto-mask after 5 seconds
        setTimeout(() => {
          setRevealedKeys(curr => ({ ...curr, [id]: false }));
        }, 5000);
        return { ...prev, [id]: true };
      }
    });
  };

  // Timestamp formatter
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    let date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Scanner Registry</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Centrally manage ZKFinger biometric devices and registration license keys.</p>
        </div>
        <NeuButton onClick={fetchDevicesList} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh List</span>
        </NeuButton>
      </div>

      {/* Global Message Alerts */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--color-danger-glass-border)',
          backgroundColor: 'var(--color-danger-glass)',
          color: 'var(--color-danger)',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--color-danger-glass-shadow)'
        }}>
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--color-success-glass-border)',
          backgroundColor: 'var(--color-success-glass)',
          color: 'var(--color-success)',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--color-success-glass-shadow)'
        }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Add New Device Form Card */}
      <NeuCard variant="raised" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Register Fingerprint Scanner</span>
        </h3>
        
        <form onSubmit={handleSaveDevice} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <NeuInput
              label="Scanner Name"
              placeholder="e.g. Reception PC Scanner"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
              disabled={saving}
            />
            <NeuInput
              label="SDK License Key"
              type="password"
              placeholder="Enter activation / license key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <NeuToggle
              checked={forStaff}
              onChange={setForStaff}
              label="Enable for Staff Attendance Portal"
              disabled={saving}
            />
            <NeuToggle
              checked={forTeacher}
              onChange={setForTeacher}
              label="Enable for Teacher Attendance Portal"
              disabled={saving}
            />
          </div>

          <div style={{ display: 'flex', height: '48px', marginTop: '10px', maxWidth: '200px' }}>
            <NeuButton 
              type="submit" 
              variant="accent" 
              disabled={saving}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <span>{saving ? 'Saving...' : 'Save Scanner'}</span>
            </NeuButton>
          </div>
        </form>
      </NeuCard>

      {/* Main Devices Table / List Viewport */}
      <NeuCard variant="raised" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Registered Scanners List</span>
        </h3>

        {loading ? (
          <Skeleton type="table" rows={4} />
        ) : devices.length === 0 ? (
          <div style={{ 
            padding: '48px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            fontSize: '1rem',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: 'var(--neu-shadow-pressed-sm)',
            backgroundColor: 'var(--bg-surface)'
          }}>
            No scanners registered yet — add your first fingerprint device above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', boxShadow: 'var(--neu-shadow-pressed-sm)' }}>
            <table className="neu-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface-elevated)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>Scanner Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>License Key</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>Staff Portal</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>Teacher Portal</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>Registered By</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>Created Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>Last Fetched</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary)', fontWeight: 500 }}>{device.deviceName}</td>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{getMaskedKey(device.licenseKey, device.id)}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleRevealKey(device.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'color var(--transition-fast)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title={revealedKeys[device.id] ? 'Hide Key' : 'Reveal Key'}
                        >
                          {revealedKeys[device.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
                        <NeuToggle
                          checked={device.forStaff !== false}
                          onChange={() => handleTogglePortalStatus(device.id, 'forStaff', device.forStaff !== false)}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
                        <NeuToggle
                          checked={device.forTeacher !== false}
                          onChange={() => handleTogglePortalStatus(device.id, 'forTeacher', device.forTeacher !== false)}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{device.registeredByName || 'Unknown'}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTimestamp(device.createdAt)}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTimestamp(device.lastFetchedAt)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <NeuButton 
                          onClick={() => openEditModal(device)}
                          title="Edit Scanner"
                          style={{ padding: '8px' }}
                        >
                          <Edit size={15} />
                        </NeuButton>
                        <NeuButton 
                          onClick={() => handleDeleteDevice(device.id, device.deviceName)}
                          title="Delete Scanner"
                          style={{ padding: '8px' }}
                        >
                          <Trash2 size={15} style={{ color: 'var(--color-danger)' }} />
                        </NeuButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeuCard>

      {/* Edit Modal Dialog */}
      <Modal
        isOpen={!!editingDevice}
        onClose={closeEditModal}
        title="Edit Scanner Registration"
      >
        <form onSubmit={handleUpdateDevice} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NeuInput
            label="Scanner Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            disabled={updating}
          />
          <NeuInput
            label="SDK License Key"
            type="password"
            value={editKey}
            onChange={(e) => setEditKey(e.target.value)}
            required
            disabled={updating}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '5px' }}>
            <NeuToggle
              checked={editForStaff}
              onChange={setEditForStaff}
              label="Enable for Staff Attendance Portal"
              disabled={updating}
            />
            <NeuToggle
              checked={editForTeacher}
              onChange={setEditForTeacher}
              label="Enable for Teacher Attendance Portal"
              disabled={updating}
            />
          </div>
          <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <NeuButton 
              type="button" 
              onClick={closeEditModal}
              disabled={updating}
              style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
            >
              Cancel
            </NeuButton>
            <NeuButton 
              type="submit" 
              variant="accent" 
              disabled={updating}
              style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
            >
              {updating ? 'Updating...' : 'Update Scanner'}
            </NeuButton>
          </div>
        </form>
      </Modal>
      
    </div>
  );
}
