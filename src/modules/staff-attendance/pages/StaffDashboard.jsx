import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  WifiOff, 
  RefreshCw, 
  Filter 
} from 'lucide-react';
import NeuCard from '../../../shared/components/NeuCard.jsx';
import NeuButton from '../../../shared/components/NeuButton.jsx';
import NeuAvatar from '../../../shared/components/NeuAvatar.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { db } from '../../../config/firebase.js';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

export default function StaffDashboard() {
  const { currentUser, userProfile } = useAuth();
  
  // Connection states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Registry states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Today's check-in/out record state
  const [todayRecord, setTodayRecord] = useState(null);
  
  // History logs states
  const [historyLogs, setHistoryLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(''); // '' for All, '01' through '12'

  // Get current date string in local YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Connection state watchers
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch today's record and user's past logs
  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    
    try {
      const todayDateStr = getTodayDateString();
      const docId = `${currentUser.uid}_${todayDateStr}`;
      
      // 1. Fetch today's check-in/out status
      const todayDocRef = doc(db, 'attendance', docId);
      const todayDoc = await getDoc(todayDocRef);
      
      if (todayDoc.exists()) {
        setTodayRecord(todayDoc.data());
      } else {
        setTodayRecord(null);
      }
      
      // 2. Fetch past attendance logs
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort locally by date descending (newest first)
      const sortedLogs = logs.sort((a, b) => b.date.localeCompare(a.date));
      setHistoryLogs(sortedLogs);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
      setError('Failed to fetch attendance history records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  // Apply month filter local processing
  useEffect(() => {
    if (!selectedMonth) {
      setFilteredLogs(historyLogs);
    } else {
      const result = historyLogs.filter(log => {
        const parts = log.date.split('-'); // [YYYY, MM, DD]
        return parts[1] === selectedMonth;
      });
      setFilteredLogs(result);
    }
  }, [selectedMonth, historyLogs]);

  // Handle Check-In
  const handleCheckIn = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const todayDateStr = getTodayDateString();
      const docId = `${currentUser.uid}_${todayDateStr}`;
      
      // Determine if check-in is late (late threshold is 09:30 AM local time)
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const isLate = hours > 9 || (hours === 9 && minutes > 30);

      const docRef = doc(db, 'attendance', docId);
      const newRecord = {
        userId: currentUser.uid,
        role: 'staff',
        date: todayDateStr,
        checkIn: new Date(), // Local representation; server timestamp used if strictly required
        checkOut: null,
        status: isLate ? 'late' : 'present',
        // Manual punch placeholder. 
        // FUTURE: This manual marking system will later be supplemented or replaced
        // by a physical biometric fingerprint scanner integration. The scanner bridge script
        // will write 'fingerprint' to the markedBy field.
        markedBy: 'manual' 
      };

      await setDoc(docRef, newRecord);
      setTodayRecord(newRecord);
      setSuccess('Checked in successfully!');
      
      // Refresh history records
      await fetchDashboardData();
    } catch (err) {
      console.error('Check-in failed:', err);
      setError('Failed to process check-in log.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const todayDateStr = getTodayDateString();
      const docId = `${currentUser.uid}_${todayDateStr}`;
      const docRef = doc(db, 'attendance', docId);

      await updateDoc(docRef, {
        checkOut: new Date()
      });

      setSuccess('Checked out successfully! Shift completed.');
      
      // Refresh history records
      await fetchDashboardData();
    } catch (err) {
      console.error('Check-out failed:', err);
      setError('Failed to process check-out log.');
    } finally {
      setLoading(false);
    }
  };

  // Helper date/time formatters
  const formatTime = (timeData) => {
    if (!timeData) return '--:--';
    // If it's a Firestore Timestamp, convert it. If it's a JS Date, parse it.
    const date = timeData.seconds ? new Date(timeData.seconds * 1000) : new Date(timeData);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getDayOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Month configuration mapping
  const months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  // Helper status elements
  let statusText = 'Not marked yet';
  let buttonLabel = 'Check In';
  let buttonAction = handleCheckIn;
  let isButtonDisabled = false;
  let statusColor = 'var(--text-secondary)';

  if (todayRecord) {
    if (!todayRecord.checkOut) {
      statusText = `Checked In (${todayRecord.status === 'late' ? 'Late' : 'On Time'})`;
      buttonLabel = 'Check Out';
      buttonAction = handleCheckOut;
      statusColor = todayRecord.status === 'late' ? 'var(--color-warning)' : 'var(--color-success)';
    } else {
      statusText = 'Shift Completed';
      buttonLabel = 'Checked Out';
      isButtonDisabled = true;
      statusColor = 'var(--text-muted)';
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Welcome Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
            Welcome, {userProfile?.name || 'Staff Member'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your daily schedules and record office clock logs.</p>
        </div>
      </div>

      {/* Subtle Offline Warning Banner */}
      {!isOnline && (
        <NeuCard 
          variant="inset" 
          style={{ 
            borderColor: 'var(--color-warning)', 
            padding: '16px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            color: 'var(--color-warning)' 
          }}
        >
          <WifiOff size={20} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>Offline Mode Activated</strong>
            <span style={{ fontSize: '0.85rem' }}>Your clock logs will queue locally in browser persistence storage and synchronize automatically upon network return.</span>
          </div>
        </NeuCard>
      )}

      {/* Global Action Alerts */}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' }} className="dashboard-grid">
        
        {/* Console Box panel */}
        <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px', justifyContent: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Check-In Console</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Log start and end times of your shift today.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
            <NeuButton 
              onClick={buttonAction}
              disabled={isButtonDisabled || loading}
              variant="accent"
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '1.2rem',
                boxShadow: isButtonDisabled ? 'var(--neu-shadow-pressed)' : 'var(--neu-shadow-raised)',
                opacity: isButtonDisabled ? 0.7 : 1
              }}
            >
              <Clock size={36} style={{ color: 'var(--color-primary)' }} />
              <span>{buttonLabel}</span>
            </NeuButton>
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing log...</span>
              </div>
            )}
          </div>

          {/* Console Details summary */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Today's Date:</span>
              <span style={{ fontWeight: 600 }}>{getTodayDateString()} ({getDayOfWeek(getTodayDateString())})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Current Status:</span>
              <span style={{ fontWeight: 600, color: statusColor }}>{statusText}</span>
            </div>
          </div>
        </NeuCard>

        {/* History Box panel */}
        <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>My Attendance History</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Review all logged times of your previous shifts.</p>
            </div>
            
            {/* Month Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: 'var(--color-primary)' }} />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  boxShadow: 'var(--neu-shadow-pressed-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="">All Months</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* History log listing */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                No attendance logs found for this period.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '10px 8px' }}>Date</th>
                    <th style={{ padding: '10px 8px' }}>Check-In</th>
                    <th style={{ padding: '10px 8px' }}>Check-Out</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    let logStatusColor = 'var(--text-primary)';
                    if (log.status === 'present') logStatusColor = 'var(--color-success)';
                    if (log.status === 'late') logStatusColor = 'var(--color-warning)';
                    if (log.status === 'absent') logStatusColor = 'var(--color-danger)';
                    
                    return (
                      <tr key={log.id || log.date} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 500 }}>{log.date}</td>
                        <td style={{ padding: '12px 8px' }}>{formatTime(log.checkIn)}</td>
                        <td style={{ padding: '12px 8px' }}>{formatTime(log.checkOut)}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 600, color: logStatusColor, textTransform: 'capitalize' }}>
                          {log.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </NeuCard>

      </div>
    </div>
  );
}
