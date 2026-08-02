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
  AlertCircle
} from 'lucide-react';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuInput from '../shared/components/NeuInput.jsx';
import NeuToggle from '../shared/components/NeuToggle.jsx';
import NeuAvatar from '../shared/components/NeuAvatar.jsx';
import { 
  createStaffAccount, 
  getAllStaff, 
  toggleStaffStatus, 
  editStaffInfo, 
  getAllAttendance 
} from '../services/adminService.js';

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'staff' | 'records'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Staff list & Directory state
  const [staffList, setStaffList] = useState([]);
  
  // Create Staff Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState(null); // holds staff object being edited
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);

  // Attendance Records State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

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
        setError('This email address is already registered.');
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
      
      // Update local state directly to be responsive
      setStaffList(prev => prev.map(member => 
        member.uid === uid ? { ...member, active: newStatus } : member
      ));
    } catch (err) {
      console.error('Toggle status failure:', err);
      setError('Failed to update active status.');
    }
  };

  // Open Edit Modal
  const openEditModal = (member) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setError('');
  };

  // Submit Edit
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    try {
      await editStaffInfo(editingStaff.uid, {
        name: editName,
        phone: editPhone
      });

      setSuccess('Staff details updated successfully.');
      setEditingStaff(null);
      
      // Refresh directory
      const staff = await getAllStaff();
      setStaffList(staff);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Update staff failure:', err);
      setError('Failed to save changes.');
    } finally {
      setUpdating(false);
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

  // Mock statistics for Overview tab
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

      {/* Dashboard Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <NeuButton 
          variant={activeTab === 'overview' ? 'accent' : 'normal'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </NeuButton>
        <NeuButton 
          variant={activeTab === 'staff' ? 'accent' : 'normal'}
          onClick={() => setActiveTab('staff')}
        >
          Manage Staff
        </NeuButton>
        <NeuButton 
          variant={activeTab === 'records' ? 'accent' : 'normal'}
          onClick={() => setActiveTab('records')}
        >
          Attendance Records
        </NeuButton>
      </div>

      {/* Tab Yield Viewports */}
      <div className="tab-viewport">
        
        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Stats Cards Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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
                  color: 'var(--color-accent)'
                }}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Students Checked In</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>342 / 400</h3>
                </div>
              </NeuCard>

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
                  color: 'var(--color-success)'
                }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Batches Today</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>12 Classes</h3>
                </div>
              </NeuCard>
            </div>

            {/* Quick Access Block */}
            <NeuCard variant="raised" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>System Instructions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '800px', lineHeight: '1.6' }}>
                This is your administrative console. Click **Manage Staff** to add or edit coaching center workers. Switch to **Attendance Records** to filter and inspect logged times. Attendance updates log automatically in real-time as users check-in.
              </p>
            </NeuCard>
          </div>
        )}

        {/* VIEW: MANAGE STAFF */}
        {activeTab === 'staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Create Staff Member Form */}
            <NeuCard variant="raised" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Register New Staff Account</span>
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
                  label="Email (Username)"
                  type="email"
                  placeholder="name@brainstormers.com"
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
                  required
                  disabled={creating}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">Password</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <NeuInput
                        type="text"
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

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <NeuButton type="submit" variant="accent" disabled={creating}>
                    {creating ? 'Registering...' : 'Register User'}
                  </NeuButton>
                </div>
              </form>
            </NeuCard>

            {/* Staff Directory Directory */}
            <NeuCard variant="raised" style={{ padding: '32px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Staff Members Directory</span>
              </h3>

              {staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  No registered staff accounts found. Create one above.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Email (Username)</th>
                      <th style={{ padding: '12px 16px' }}>Phone</th>
                      <th style={{ padding: '12px 16px' }}>Join Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((member) => (
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
                          <NeuButton onClick={() => openEditModal(member)} style={{ padding: '8px 12px' }}>
                            <Edit size={14} />
                            <span style={{ fontSize: '0.8rem' }}>Edit</span>
                          </NeuButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </NeuCard>
          </div>
        )}

        {/* VIEW: ATTENDANCE RECORDS */}
        {activeTab === 'records' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
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
                  <select 
                    value={filterStaff}
                    onChange={(e) => setFilterStaff(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color var(--transition-normal)'
                    }}
                  >
                    <option value="">All Staff</option>
                    {staffList.map(s => (
                      <option key={s.uid} value={s.uid}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">Start Date</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* End Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">End Date</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-pressed-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

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
                      <th style={{ padding: '12px 16px' }}>Check-Out</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const staffMember = staffList.find(s => s.uid === log.userId);
                      const name = staffMember ? staffMember.name : 'Unknown User';
                      
                      // Status styling mapping
                      let statusColor = 'var(--text-primary)';
                      if (log.status === 'present') statusColor = 'var(--color-success)';
                      if (log.status === 'late') statusColor = 'var(--color-warning)';
                      if (log.status === 'absent') statusColor = 'var(--color-danger)';

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
                          <td style={{ padding: '16px', fontWeight: 500 }}>{name}</td>
                          <td style={{ padding: '16px' }}>{log.date}</td>
                          <td style={{ padding: '16px' }}>{formatTime(log.checkIn)}</td>
                          <td style={{ padding: '16px' }}>{formatTime(log.checkOut)}</td>
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

          </div>
        )}

      </div>

      {/* Edit Staff Details Overlay Modal */}
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
            {/* Close Button */}
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

            {/* Modal Title */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Edit Staff Details</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Update profile settings for {editingStaff.username}</p>
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
                label="Phone Number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
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

    </div>
  );
}
