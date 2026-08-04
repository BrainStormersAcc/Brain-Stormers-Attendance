import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  GraduationCap, 
  Calendar, 
  Plus, 
  Edit, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Info,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  Settings
} from 'lucide-react';
import NeuSegmentedControl from '../shared/components/NeuSegmentedControl.jsx';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuInput from '../shared/components/NeuInput.jsx';
import NeuToggle from '../shared/components/NeuToggle.jsx';
import NeuAvatar from '../shared/components/NeuAvatar.jsx';
import NeuDatePicker from '../shared/components/NeuDatePicker.jsx';
import { 
  createStaffAccount, 
  getAllStaff, 
  toggleStaffStatus, 
  editStaffCredentials,
  deleteStaffAccount,
  getAllAttendance 
} from '../services/adminService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import Skeleton from '../shared/components/Skeleton.jsx';

export default function DashboardHome(props) {
  const activeTab = props.view || 'overview';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin settings states
  const { userProfile, updateAdminProfile } = useAuth();
  const [adminName, setAdminName] = useState(userProfile?.name || '');
  const [adminUsername, setAdminUsername] = useState(userProfile?.username || '');
  const [adminPhone, setAdminPhone] = useState(userProfile?.phone || '');
  const [adminPassword, setAdminPassword] = useState(userProfile?.password || '');
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setAdminName(userProfile.name || '');
      setAdminUsername(userProfile.username || '');
      setAdminPhone(userProfile.phone || '');
      setAdminPassword(userProfile.password || '');
    }
  }, [userProfile]);

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    setUpdatingAdmin(true);
    setError('');
    setSuccess('');

    try {
      await updateAdminProfile(adminCurrentPassword, {
        name: adminName,
        username: adminUsername,
        phone: adminPhone,
        password: adminPassword
      });
      setSuccess('Admin account credentials updated successfully.');
      setAdminCurrentPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Admin profile update failed:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect current password.');
      } else {
        setError(err.message || 'Failed to update admin profile.');
      }
    } finally {
      setUpdatingAdmin(false);
    }
  };

  // Staff list & Directory state
  const [staffList, setStaffList] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({}); // maps uid -> boolean
  
  // Create Staff Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(''); // username/email
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState(null); // holds staff object being edited
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Staff Confirmation State
  const [deletingStaff, setDeletingStaff] = useState(null); // holds staff object to delete
  const [deleting, setDeleting] = useState(false);

  // Attendance Records State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [recordsTarget, setRecordsTarget] = useState('Staff');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const staff = await getAllStaff();
      setStaffList(staff);
      
      const logs = await getAllAttendance();
      setAttendanceLogs(logs);
      setFilteredLogs(logs);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch registry data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Attendance Logs
  useEffect(() => {
    let result = [...attendanceLogs];

    if (filterStaff) {
      result = result.filter(log => log.userId === filterStaff);
    }

    if (dateStart) {
      result = result.filter(log => log.date >= dateStart);
    }

    if (dateEnd) {
      result = result.filter(log => log.date <= dateEnd);
    }

    setFilteredLogs(result);
  }, [filterStaff, dateStart, dateEnd, attendanceLogs]);

  // Handle Staff Account Registration
  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      await createStaffAccount({
        name: fullName,
        username: email,
        phone,
        password
      });

      setSuccess('Staff account created successfully.');
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      
      // Refresh directory list
      const staff = await getAllStaff();
      setStaffList(staff);
    } catch (err) {
      console.error('Registration failure:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This username/email is already registered.');
      } else {
        setError(err.message || 'Failed to create staff account.');
      }
    } finally {
      setCreating(false);
    }
  };

  // Auto-generate secure temporary password and copy to clipboard
  const generateTempPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let tempPass = '';
    for (let i = 0; i < 10; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(tempPass);
    navigator.clipboard.writeText(tempPass);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Toggle active status
  const handleToggleActive = async (uid, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await toggleStaffStatus(uid, newStatus);
      
      setStaffList(prev => prev.map(member => 
        member.uid === uid ? { ...member, active: newStatus } : member
      ));
    } catch (err) {
      console.error('Toggle status failure:', err);
      setError('Failed to update active status.');
    }
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = (uid) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  // Open Edit Modal
  const openEditModal = (member) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditUsername(member.username);
    setEditPhone(member.phone);
    setEditPassword(member.password || '');
    setError('');
  };

  // Submit Edit Credentials
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await editStaffCredentials(
        editingStaff.uid,
        editingStaff.username,
        editingStaff.password,
        {
          name: editName,
          username: editUsername,
          phone: editPhone,
          password: editPassword
        }
      );

      setSuccess('Staff details updated successfully.');
      setEditingStaff(null);
      
      // Refresh directory
      const staff = await getAllStaff();
      setStaffList(staff);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Update staff failure:', err);
      setError(err.message || 'Failed to update credentials.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteStaff = async () => {
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await deleteStaffAccount(
        deletingStaff.uid,
        deletingStaff.username,
        deletingStaff.password
      );

      setSuccess(`Staff account "${deletingStaff.name}" deleted successfully.`);
      setDeletingStaff(null);

      // Refresh directory
      const staff = await getAllStaff();
      setStaffList(staff);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Delete staff failure:', err);
      setError(err.message || 'Failed to delete staff account.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper date/time formatters
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Stats calculation
  const activeStaffCount = staffList.filter(s => s.active).length;
  const presentCount = attendanceLogs.filter(log => {
    const today = new Date().toISOString().split('T')[0];
    return log.date === today && log.status === 'present';
  }).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Control Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to the Brain Stormers Attendance administrative console.</p>
        </div>
      </div>

      {/* Global Message Alerts */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--color-danger)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          color: 'var(--color-danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--color-success)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          color: 'var(--color-success)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}



      {/* Tab Yield Viewports */}
      <div className="tab-viewport">
        {loading ? (
          activeTab === 'overview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Skeleton type="stats" />
              <Skeleton type="default" />
            </div>
          ) : activeTab === 'admin-settings' ? (
            <Skeleton type="default" style={{ maxWidth: '600px', margin: '0 auto' }} />
          ) : (
            <Skeleton type="table" rows={activeTab === 'records' ? 8 : 6} />
          )
        ) : (
          <>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Embedded animations for the under development red glass hover overlay */}
                <style>{`
                  .under-dev-card {
                    position: relative;
                    overflow: hidden;
                    transition: border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-normal) !important;
                  }
                  .under-dev-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(239, 68, 68, 0.08), var(--neu-shadow-raised-sm) !important;
                    border-color: rgba(239, 68, 68, 0.35) !important;
                  }
                  .under-dev-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(239, 68, 68, 0.08);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justifyContent: center;
                    opacity: 0;
                    transition: opacity 0.25s ease, transform 0.25s ease;
                    transform: scale(0.95);
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 5;
                  }
                  .under-dev-card:hover .under-dev-overlay {
                    opacity: 1;
                    transform: scale(1);
                  }
                  .under-dev-text {
                    color: var(--color-danger);
                    font-weight: 700;
                    font-family: var(--font-display);
                    font-size: 0.85rem;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    background: rgba(239, 68, 68, 0.12);
                    padding: 6px 14px;
                    border-radius: 20px;
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                  }
                `}</style>

                {/* Stats Cards Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                  
                  {/* Staff Card - Active */}
                  <NeuCard variant="raised" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)'
                    }}>
                      <Clock size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Staff Present Today</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {presentCount} / {activeStaffCount}
                      </h3>
                    </div>
                  </NeuCard>

                  {/* Student Card - Under Dev */}
                  <NeuCard 
                    variant="raised" 
                    className="under-dev-card"
                    style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}
                  >
                    <div className="under-dev-overlay">
                      <span className="under-dev-text">Under Development</span>
                    </div>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-accent)'
                    }}>
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Students Checked In</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>0 / 0</h3>
                    </div>
                  </NeuCard>

                  {/* Classes Card - Under Dev */}
                  <NeuCard 
                    variant="raised" 
                    className="under-dev-card"
                    style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}
                  >
                    <div className="under-dev-overlay">
                      <span className="under-dev-text">Under Development</span>
                    </div>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success)'
                    }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Classes</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>12 Classes</h3>
                    </div>
                  </NeuCard>

                  {/* Teacher Card - Under Dev */}
                  <NeuCard 
                    variant="raised" 
                    className="under-dev-card"
                    style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}
                  >
                    <div className="under-dev-overlay">
                      <span className="under-dev-text">Under Development</span>
                    </div>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-warning)'
                    }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Teacher Checked in</p>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>0 / 0</h3>
                    </div>
                  </NeuCard>

                </div>

            {/* Quick Access Block */}
            <NeuCard variant="raised" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>System Instructions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '800px', lineHeight: '1.6' }}>
                This is your administrative console. Click **Staff Account Management** to add, edit, or delete staff credentials (usernames and passwords). Switch to **Attendance Records** to filter and inspect logged times.
              </p>
            </NeuCard>
          </div>
        )}

        {/* VIEW: STAFF ACCOUNT MANAGEMENT */}
        {activeTab === 'staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Create Staff Member Form */}
            <NeuCard variant="raised" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Create Staff Account</span>
              </h3>
              
              <form onSubmit={handleRegisterStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'end' }}>
                <NeuInput
                  label="Full Name"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={creating}
                />
                <NeuInput
                  label="Username"
                  placeholder="e.g. jdoe or john@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={creating}
                />
                <NeuInput
                  label="Phone Number"
                  placeholder="e.g. +1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={creating}
                />
                
                <div style={{ 
                  gridColumn: '1 / -1', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'end', 
                  flexWrap: 'wrap', 
                  gap: '20px',
                  marginTop: '10px' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '360px' }}>
                    <label className="neu-input-label">Password</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <NeuInput
                          type="password"
                          placeholder="Credentials password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={creating}
                          style={{ margin: 0 }}
                        />
                      </div>
                      <NeuButton 
                        type="button" 
                        onClick={generateTempPassword} 
                        title="Generate and copy password"
                        style={{ padding: '12px' }}
                        disabled={creating}
                      >
                        {copySuccess ? <Check size={18} style={{ color: 'var(--color-success)' }} /> : <Copy size={18} />}
                      </NeuButton>
                    </div>
                  </div>

                  <NeuButton type="submit" variant="accent" disabled={creating} style={{ height: '48px' }}>
                    {creating ? 'Registering...' : 'Register User'}
                  </NeuButton>
                </div>
              </form>
            </NeuCard>

            {/* Staff Directory */}
            <NeuCard variant="raised" style={{ padding: '32px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Staff Account Registry</span>
              </h3>

              {staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  No registered staff accounts found. Create one above.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Username</th>
                      <th style={{ padding: '12px 16px' }}>Password</th>
                      <th style={{ padding: '12px 16px' }}>Phone</th>
                      <th style={{ padding: '12px 16px' }}>Join Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((member) => {
                      const isPassVisible = visiblePasswords[member.uid];
                      return (
                        <tr 
                          key={member.uid} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color)', 
                            fontSize: '0.95rem',
                            opacity: member.active ? 1 : 0.6,
                            transition: 'opacity var(--transition-normal)'
                          }}
                        >
                          <td style={{ padding: '16px', fontWeight: 500 }}>{member.name}</td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{member.username}</td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{isPassVisible ? (member.password || 'N/A') : '••••••••'}</span>
                              <button 
                                onClick={() => togglePasswordVisibility(member.uid)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>{member.phone}</td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{formatDate(member.joinDate)}</td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                              <NeuToggle
                                checked={member.active}
                                onChange={() => handleToggleActive(member.uid, member.active)}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                              <NeuButton onClick={() => openEditModal(member)} style={{ padding: '8px 12px' }}>
                                <Edit size={14} />
                                <span style={{ fontSize: '0.8rem' }}>Edit</span>
                              </NeuButton>
                              <NeuButton 
                                onClick={() => setDeletingStaff(member)} 
                                style={{ padding: '8px 12px', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}
                              >
                                <Trash2 size={14} />
                                <span style={{ fontSize: '0.8rem' }}>Delete</span>
                              </NeuButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </NeuCard>
          </div>
        )}

        {/* VIEW: ATTENDANCE RECORDS */}
        {activeTab === 'records' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Embedded Animations Style Block */}
            <style>{`
              @keyframes spin-clockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes spin-counter {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }
              @keyframes neu-progress-loading {
                0% { left: -40%; width: 40%; }
                50% { left: 100%; width: 20%; }
                100% { left: -40%; width: 40%; }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              .cog-clockwise {
                animation: spin-clockwise 8s linear infinite;
              }
              .cog-counter {
                animation: spin-counter 6s linear infinite;
              }
              .float-card {
                animation: float 4s ease-in-out infinite;
              }
            `}</style>

            {/* Target Selector Switcher */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '4px 0 12px 0' }}>
              <NeuSegmentedControl
                options={['Staff', 'Student', 'Teacher']}
                selectedValue={recordsTarget}
                onChange={setRecordsTarget}
              />
            </div>

            {recordsTarget !== 'Staff' ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', minHeight: '400px' }}>
                <NeuCard variant="raised" style={{ 
                  maxWidth: '500px', 
                  width: '100%', 
                  padding: '48px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '28px',
                  textAlign: 'center',
                }} className="float-card">
                  
                  {/* Charming Neumorphic Cogs Animation */}
                  <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {/* Background Bevel Ring */}
                    <div style={{
                      position: 'absolute',
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-base)',
                      boxShadow: 'var(--neu-shadow-pressed)',
                      zIndex: 0
                    }} />
                    
                    {/* Primary Gear (Big) */}
                    <div className="cog-clockwise" style={{
                      position: 'absolute',
                      color: 'var(--color-primary)',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: 'drop-shadow(var(--neu-shadow-raised-sm))'
                    }}>
                      <Settings size={56} strokeWidth={1.5} />
                    </div>

                    {/* Secondary Gear (Small, interlocking) */}
                    <div className="cog-counter" style={{
                      position: 'absolute',
                      color: 'var(--color-accent)',
                      top: '12px',
                      right: '12px',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: 'drop-shadow(var(--neu-shadow-raised-sm))'
                    }}>
                      <Settings size={36} strokeWidth={1.5} />
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      {recordsTarget} Attendance Records
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      Attendance tracking, history listings, and record search for the <strong>{recordsTarget}</strong> module are under development.
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                      Scheduled for implementation in Phase 2 & 3 of the system roadmap.
                    </p>
                  </div>

                  {/* Neumorphic Loading/Progress Track */}
                  <div style={{
                    position: 'relative',
                    width: '240px',
                    height: '8px',
                    backgroundColor: 'var(--bg-base)',
                    boxShadow: 'var(--neu-shadow-pressed-sm)',
                    borderRadius: 'var(--border-radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 8px var(--color-primary-glow)',
                      borderRadius: 'var(--border-radius-full)',
                      animation: 'neu-progress-loading 2.5s ease-in-out infinite'
                    }} />
                  </div>

                </NeuCard>
              </div>
            ) : (
              <>
                {/* Filter Panel */}
                <NeuCard variant="raised" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>Filter Records</span>
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    
                    {/* Staff Filter Dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="neu-input-label">Staff Member</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select 
                          value={filterStaff}
                          onChange={(e) => setFilterStaff(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 36px 12px 16px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-sm)',
                            boxShadow: 'var(--neu-shadow-pressed-sm)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'border-color var(--transition-normal)',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        >
                          <option value="">All Staff</option>
                          {staffList.map(s => (
                            <option key={s.uid} value={s.uid}>{s.name}</option>
                          ))}
                        </select>
                        <div style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          pointerEvents: 'none',
                          color: 'var(--text-secondary)'
                        }}>
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    {/* Start Date */}
                    <NeuDatePicker
                      label="Start Date"
                      value={dateStart}
                      onChange={setDateStart}
                    />

                    {/* End Date */}
                    <NeuDatePicker
                      label="End Date"
                      value={dateEnd}
                      onChange={setDateEnd}
                    />

                    {/* Reset Filters */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <NeuButton 
                        onClick={() => {
                          setFilterStaff('');
                          setDateStart('');
                          setDateEnd('');
                        }}
                        style={{ width: '100%' }}
                      >
                        Reset Filters
                      </NeuButton>
                    </div>

                  </div>
                </NeuCard>

                {/* Logs Table */}
                <NeuCard variant="raised" style={{ padding: '32px', overflowX: 'auto' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Attendance Logs Register</span>
                  </h3>

                  {filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                      No attendance records match the selected filters.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          <th style={{ padding: '12px 16px' }}>Name</th>
                          <th style={{ padding: '12px 16px' }}>Date</th>
                          <th style={{ padding: '12px 16px' }}>Check-In</th>
                          <th style={{ padding: '12px 16px' }}>Status</th>
                          <th style={{ padding: '12px 16px' }}>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => {
                          const staffMember = staffList.find(s => s.uid === log.userId);
                          const name = staffMember ? staffMember.name : 'Unknown User';
                          
                          let statusColor = 'var(--text-primary)';
                          if (log.status === 'present') statusColor = 'var(--color-success)';
                          if (log.status === 'late') statusColor = 'var(--color-warning)';
                          if (log.status === 'absent') statusColor = 'var(--color-danger)';

                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
                              <td style={{ padding: '16px', fontWeight: 500 }}>{name}</td>
                              <td style={{ padding: '16px' }}>{log.date}</td>
                              <td style={{ padding: '16px' }}>{formatTime(log.checkIn)}</td>
                              <td style={{ padding: '16px', fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>
                                {log.status}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                {log.markedBy || 'manual'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </NeuCard>
              </>
            )}

          </div>
        )}

        {/* VIEW: ADMIN SETTINGS */}
        {activeTab === 'admin-settings' && (
          <NeuCard variant="raised" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Admin Profile & Credentials</span>
            </h3>
            
            <form onSubmit={handleUpdateAdminProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuInput
                label="Full Name"
                placeholder="e.g. Administrator"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={updatingAdmin}
              />
              <NeuInput
                label="Username (Cannot be changed)"
                placeholder="e.g. admin"
                value={adminUsername}
                disabled={true}
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <NeuInput
                label="Phone Number"
                placeholder="e.g. +1234567890"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                disabled={updatingAdmin}
              />
              <NeuInput
                type="password"
                label="New Password"
                placeholder="Enter new password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={updatingAdmin}
              />
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                <NeuInput
                  type="password"
                  label="Confirm Current Password"
                  placeholder="Enter current password to apply changes"
                  value={adminCurrentPassword}
                  onChange={(e) => setAdminCurrentPassword(e.target.value)}
                  required
                  disabled={updatingAdmin}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <NeuButton type="submit" variant="accent" disabled={updatingAdmin}>
                  {updatingAdmin ? 'Saving Changes...' : 'Save Settings'}
                </NeuButton>
              </div>
            </form>
          </NeuCard>
        )}
          </>
        )}
      </div>

      {/* Edit Staff Credentials Modal */}
      {editingStaff && (
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
        }} onClick={() => setEditingStaff(null)}>
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
            <button 
              onClick={() => setEditingStaff(null)}
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
              Cancel
            </button>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Edit Staff Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Update credentials for {editingStaff.name}</p>
            </div>

            <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuInput
                label="Full Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={updating}
              />
              
              <NeuInput
                label="Username (Cannot be changed)"
                value={editUsername}
                disabled={true}
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />

              <NeuInput
                label="Phone Number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={updating}
              />

              <NeuInput
                type="password"
                label="Password"
                placeholder="••••••••"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                required
                disabled={updating}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <NeuButton 
                  type="button" 
                  onClick={() => setEditingStaff(null)} 
                  style={{ flex: 1 }}
                  disabled={updating}
                >
                  Cancel
                </NeuButton>
                <NeuButton 
                  type="submit" 
                  variant="accent" 
                  style={{ flex: 1 }}
                  disabled={updating}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </NeuButton>
              </div>
            </form>
          </NeuCard>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
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
        }} onClick={() => setDeletingStaff(null)}>
          <NeuCard 
            variant="raised" 
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--color-danger)' }}>
                Delete Account
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Are you sure you want to delete **{deletingStaff.name}**?
              </p>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              This will permanently delete their account from Firebase Authentication and Firestore. They will no longer be able to log in. This action is irreversible.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <NeuButton 
                type="button" 
                onClick={() => setDeletingStaff(null)} 
                style={{ flex: 1 }}
                disabled={deleting}
              >
                Cancel
              </NeuButton>
              <NeuButton 
                type="button" 
                onClick={handleDeleteStaff} 
                variant="accent" 
                style={{ flex: 1, backgroundColor: 'var(--color-danger)', border: '1px solid var(--color-danger)', color: '#fff' }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}

    </div>
  );
}
