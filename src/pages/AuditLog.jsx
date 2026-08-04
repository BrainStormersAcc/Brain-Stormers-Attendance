import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Settings
} from 'lucide-react';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuDatePicker from '../shared/components/NeuDatePicker.jsx';
import NeuBadge from '../shared/components/NeuBadge.jsx';
import NeuSegmentedControl from '../shared/components/NeuSegmentedControl.jsx';
import { getAllStaff, getAllAuditLogs } from '../services/adminService.js';
import Skeleton from '../shared/components/Skeleton.jsx';

export default function AuditLog() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('Staff');
  
  // Filter States
  const [filterStaff, setFilterStaff] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Expandable row state
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const staff = await getAllStaff();
      setStaffList(staff);
      
      const logs = await getAllAuditLogs();
      setAuditLogs(logs);
      setFilteredLogs(logs);
    } catch (err) {
      console.error('Error fetching audit log data:', err);
      setError('Failed to fetch audit logs from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...auditLogs];

    // Filter by staff member
    if (filterStaff) {
      result = result.filter(log => {
        const staffUid = log.newData?.userId || log.previousData?.userId;
        return staffUid === filterStaff;
      });
    }

    // Filter by action type
    if (filterAction) {
      result = result.filter(log => log.action === filterAction);
    }

    // Filter by date range (local day boundaries)
    if (dateStart) {
      const start = new Date(dateStart + 'T00:00:00');
      result = result.filter(log => {
        const logDate = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
        return logDate && logDate >= start;
      });
    }

    if (dateEnd) {
      const end = new Date(dateEnd + 'T23:59:59');
      result = result.filter(log => {
        const logDate = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
        return logDate && logDate <= end;
      });
    }

    setFilteredLogs(result);
    setCurrentPage(1); // Reset to page 1 on filter modification
  }, [filterStaff, filterAction, dateStart, dateEnd, auditLogs]);

  // Helper date/time formatters
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAuditTime = (timeVal) => {
    if (!timeVal) return '--:--';
    if (typeof timeVal.toDate === 'function') {
      return timeVal.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (timeVal.seconds !== undefined) {
      const date = new Date(timeVal.seconds * 1000);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    try {
      const date = new Date(timeVal);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch (e) {}
    return String(timeVal);
  };

  // Pagination processing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleRowExpandToggle = (id) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  // Detail comparison rendering
  const renderDataDiff = (log) => {
    const { action, previousData, newData } = log;
    
    // Core parameters from manual adjustment records
    const fields = [
      { key: 'date', label: 'Attendance Date' },
      { key: 'checkIn', label: 'Check-In Time', isTime: true },
      { key: 'checkOut', label: 'Check-Out Time', isTime: true },
      { key: 'status', label: 'Status' },
      { key: 'markedBy', label: 'Adjustment Source' },
      { key: 'isDeleted', label: 'Soft Deleted', isBool: true }
    ];

    const getFieldVal = (data, field) => {
      if (!data) return null;
      const val = data[field.key];
      if (val === undefined) return null;
      if (field.isTime) {
        return formatAuditTime(val);
      }
      if (field.isBool) {
        return val ? 'Yes' : 'No';
      }
      return val;
    };

    return (
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-sm)',
        marginTop: '12px',
        boxShadow: 'var(--neu-shadow-pressed-sm)',
        animation: 'scaleUpAndGlow 0.3s ease-out forwards'
      }}>
        <h5 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Detailed Value Adjustments Comparison
        </h5>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <th style={{ padding: '10px 16px', width: '25%' }}>Field Parameter</th>
                <th style={{ padding: '10px 16px', width: '37.5%' }}>Original (Before)</th>
                <th style={{ padding: '10px 16px', width: '37.5%' }}>Adjusted (After)</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(field => {
                const beforeVal = getFieldVal(previousData, field);
                const afterVal = getFieldVal(newData, field);
                const hasChanged = action === 'update' && beforeVal !== afterVal;
                
                const rowBg = hasChanged ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.04)' : 'transparent';
                
                const cellStyle = (isAfter) => {
                  if (!hasChanged) return {};
                  return isAfter 
                    ? { color: 'var(--color-success)', fontWeight: 600 } 
                    : { color: 'var(--color-danger)', textDecoration: 'line-through', opacity: 0.8 };
                };

                return (
                  <tr key={field.key} style={{ borderBottom: '1px dashed var(--border-color)', backgroundColor: rowBg }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{field.label}</td>
                    <td style={{ padding: '12px 16px', ...cellStyle(false), color: 'var(--text-secondary)' }}>
                      {action === 'create' ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A (New Record)</span>
                      ) : beforeVal || '--:--'}
                    </td>
                    <td style={{ padding: '12px 16px', ...cellStyle(true), color: 'var(--text-secondary)' }}>
                      {action === 'delete' ? (
                        <span style={{ color: 'var(--color-danger)', fontStyle: 'italic', fontWeight: 600 }}>Soft Deleted</span>
                      ) : afterVal || '--:--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUnderConstruction = (portalName) => {
    return (
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
              {portalName} Audit Log
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Manual adjustments, overrides, and governance tracking for the <strong>{portalName}</strong> module are under development.
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
    );
  };

  return (
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

      {/* Title Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Audit Log Registry</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Immutable history of manual attendance modifications for accountability and governance.</p>
        </div>
        <NeuButton onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </NeuButton>
      </div>

      {/* Target Selector Switcher */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '4px 0 12px 0' }}>
        <NeuSegmentedControl
          options={['Staff', 'Student', 'Teacher']}
          selectedValue={selectedTarget}
          onChange={setSelectedTarget}
        />
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

      {selectedTarget !== 'Staff' ? (
        renderUnderConstruction(selectedTarget)
      ) : (
        <>
          {/* Filters Panel */}
          <NeuCard variant="raised" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
              <Filter size={16} style={{ color: 'var(--color-primary)' }} />
              <span>Filter History Records</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              
              {/* Affected Staff Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="neu-input-label">Affected Staff Member</label>
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

              {/* Action Type Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="neu-input-label">Action Type</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select 
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
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
                    <option value="">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
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
                    setFilterAction('');
                    setDateStart('');
                    setDateEnd('');
                  }}
                  style={{ width: '100%', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  Reset Filters
                </NeuButton>
              </div>

            </div>
          </NeuCard>

          {/* Main Logs Table / Viewport */}
          {loading ? (
            <Skeleton type="table" rows={8} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <NeuCard variant="raised" style={{ padding: '32px', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={20} style={{ color: 'var(--color-primary)' }} />
                  <span>Immutable Audit Logs</span>
                </h3>

                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                    No manual audit log entries match the selected filters.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '12px 16px', width: '18%' }}>Timestamp</th>
                        <th style={{ padding: '12px 16px', width: '10%' }}>Action</th>
                        <th style={{ padding: '12px 16px', width: '15%' }}>Performed By</th>
                        <th style={{ padding: '12px 16px', width: '15%' }}>Affected Staff</th>
                        <th style={{ padding: '12px 16px', width: '27%' }}>Override Reason</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '15%' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map((log) => {
                        const affectedStaffUid = log.newData?.userId || log.previousData?.userId;
                        const staffMember = staffList.find(s => s.uid === affectedStaffUid);
                        const affectedStaffName = staffMember ? staffMember.name : `UID: ${affectedStaffUid?.substring(0, 8)}...`;
                        
                        const isExpanded = expandedLogId === log.id;
                        
                        // Map badge variants for create/update/delete
                        let badgeVariant = 'present';
                        if (log.action === 'update') badgeVariant = 'late';
                        if (log.action === 'delete') badgeVariant = 'absent';

                        return (
                          <React.Fragment key={log.id}>
                            <tr 
                              style={{ 
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)', 
                                fontSize: '0.95rem',
                                background: isExpanded ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.02)' : 'transparent',
                                transition: 'background var(--transition-fast)'
                              }}
                            >
                              <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                                {formatTimestamp(log.timestamp)}
                              </td>
                              <td style={{ padding: '16px' }}>
                                <NeuBadge variant={badgeVariant}>
                                  {log.action}
                                </NeuBadge>
                              </td>
                              <td style={{ padding: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {log.performedByName || 'Admin'}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                                {affectedStaffName}
                              </td>
                              <td style={{ 
                                padding: '16px', 
                                color: 'var(--text-secondary)',
                                maxWidth: '280px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={log.reason}>
                                {log.reason}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <NeuButton 
                                  onClick={() => handleRowExpandToggle(log.id)}
                                  style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <span>{isExpanded ? 'Hide' : 'Compare'}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </NeuButton>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.02)' }}>
                                <td colSpan={6} style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid var(--border-color)' }}>
                                  {/* Reason note fallback for narrow screens */}
                                  <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--bg-surface-elevated)',
                                    borderLeft: '3px solid var(--color-primary)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    marginBottom: '16px',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)',
                                    boxShadow: 'var(--neu-shadow-raised-sm)'
                                  }}>
                                    <strong>Log Narrative:</strong> "{log.reason}"
                                  </div>
                                  {renderDataDiff(log)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </NeuCard>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                  <NeuButton 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </NeuButton>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <NeuButton 
                    onClick={handleNextPage} 
                    disabled={currentPage === totalPages}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </NeuButton>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
