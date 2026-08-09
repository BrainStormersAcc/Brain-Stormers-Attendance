import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Search,
  Eye,
  Users,
  Timer
} from 'lucide-react';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuDatePicker from '../shared/components/NeuDatePicker.jsx';
import NeuBadge from '../shared/components/NeuBadge.jsx';
import { getAllStaff, getAllAuditLogs } from '../services/adminService.js';
import Skeleton from '../shared/components/Skeleton.jsx';

export default function MisuseMonitoring() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [staffNameMap, setStaffNameMap] = useState({});

  // Date Filter States (Default: start of current month to today)
  const [dateStart, setDateStart] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Expandable drilldown rows states
  const [expandedSection, setExpandedSection] = useState(null); // 'peer' | 'self' | 'pair' | 'expiry'
  const [expandedItemId, setExpandedItemId] = useState(null); // specific item key inside section
  const [expandedLogId, setExpandedLogId] = useState(null); // specific audit log ID for diff render

  // Computed analysis datasets
  const [peerMarkersList, setPeerMarkersList] = useState([]);
  const [selfEditsList, setSelfEditsList] = useState([]);
  const [repeatedPairsList, setRepeatedPairsList] = useState([]);
  const [nearExpiryEditsList, setNearExpiryEditsList] = useState([]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const staff = await getAllStaff();
      setStaffList(staff);
      
      const nameMap = {};
      staff.forEach(s => { nameMap[s.uid] = s.name; });
      setStaffNameMap(nameMap);
      
      const logs = await getAllAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs for misuse monitoring:', err);
      setError('Failed to fetch audit log data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate analysis when filters or source logs change
  useEffect(() => {
    if (auditLogs.length === 0) return;

    // Convert date boundaries to local Date objects
    const startBoundary = dateStart ? new Date(dateStart + 'T00:00:00') : null;
    const endBoundary = dateEnd ? new Date(dateEnd + 'T23:59:59') : null;

    // Filter logs within active window range
    const filteredLogs = auditLogs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp);
      if (startBoundary && logDate < startBoundary) return false;
      if (endBoundary && logDate > endBoundary) return false;
      return true;
    });

    // Helper to get staff name by UID
    const getStaffName = (uid) => staffNameMap[uid] || `UID: ${uid?.substring(0, 8)}...`;

    // -------------------------------------------------------------
    // A) Frequent Peer-Markers calculation
    // -------------------------------------------------------------
    const peerMarkerCounts = {}; // uid -> { name, count, logs: [] }
    filteredLogs.forEach(log => {
      if (log.action === 'create') {
        const creatorUid = log.performedBy;
        const targetStaffUid = log.newData?.userId;
        
        // Peer-marking occurs when log creator differs from the attendance target assignee
        if (creatorUid && targetStaffUid && creatorUid !== targetStaffUid) {
          if (!peerMarkerCounts[creatorUid]) {
            peerMarkerCounts[creatorUid] = {
              uid: creatorUid,
              name: log.performedByName || getStaffName(creatorUid),
              count: 0,
              logs: []
            };
          }
          peerMarkerCounts[creatorUid].count += 1;
          peerMarkerCounts[creatorUid].logs.push(log);
        }
      }
    });
    const sortedPeerMarkers = Object.values(peerMarkerCounts).sort((a, b) => b.count - a.count);
    setPeerMarkersList(sortedPeerMarkers);

    // -------------------------------------------------------------
    // B) Self-Edits Frequency calculation
    // -------------------------------------------------------------
    const selfEditCounts = {}; // uid -> { name, count, logs: [] }
    filteredLogs.forEach(log => {
      if (log.action === 'self-edit') {
        const editorUid = log.performedBy;
        if (editorUid) {
          if (!selfEditCounts[editorUid]) {
            selfEditCounts[editorUid] = {
              uid: editorUid,
              name: log.performedByName || getStaffName(editorUid),
              count: 0,
              logs: []
            };
          }
          selfEditCounts[editorUid].count += 1;
          selfEditCounts[editorUid].logs.push(log);
        }
      }
    });
    const sortedSelfEdits = Object.values(selfEditCounts).sort((a, b) => b.count - a.count);
    setSelfEditsList(sortedSelfEdits);

    // -------------------------------------------------------------
    // C) Same-Person Repeated Peer-Marking calculation
    // -------------------------------------------------------------
    const pairCounts = {}; // "markerUid_targetUid" -> { markerName, targetName, count, minDate, maxDate, logs: [] }
    filteredLogs.forEach(log => {
      if (log.action === 'create') {
        const markerUid = log.performedBy;
        const targetUid = log.newData?.userId;
        
        if (markerUid && targetUid && markerUid !== targetUid) {
          const pairKey = `${markerUid}_${targetUid}`;
          const logDate = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp);
          
          if (!pairCounts[pairKey]) {
            pairCounts[pairKey] = {
              key: pairKey,
              markerUid,
              targetUid,
              markerName: log.performedByName || getStaffName(markerUid),
              targetName: getStaffName(targetUid),
              count: 0,
              minDate: logDate,
              maxDate: logDate,
              logs: []
            };
          }
          
          pairCounts[pairKey].count += 1;
          if (logDate < pairCounts[pairKey].minDate) pairCounts[pairKey].minDate = logDate;
          if (logDate > pairCounts[pairKey].maxDate) pairCounts[pairKey].maxDate = logDate;
          pairCounts[pairKey].logs.push(log);
        }
      }
    });
    const sortedPairs = Object.values(pairCounts)
      .filter(pair => pair.count > 1) // Only show repeated cases
      .sort((a, b) => b.count - a.count);
    setRepeatedPairsList(sortedPairs);

    // -------------------------------------------------------------
    // D) Edits Right Before Window Expiry (last 60 seconds)
    // -------------------------------------------------------------
    const nearExpiryEdits = [];
    filteredLogs.forEach(log => {
      if (log.action === 'self-edit' && log.previousData?.createdAt && log.timestamp) {
        const createdSeconds = log.previousData.createdAt.seconds || new Date(log.previousData.createdAt).getTime() / 1000;
        const editedSeconds = log.timestamp.seconds || new Date(log.timestamp).getTime() / 1000;
        
        const elapsedSeconds = editedSeconds - createdSeconds;
        const windowSeconds = 10 * 60; // 10 minutes
        const remainingSeconds = windowSeconds - elapsedSeconds;

        // Flag if edited in the final 60 seconds (0 to 60s remaining)
        if (remainingSeconds >= 0 && remainingSeconds <= 60) {
          nearExpiryEdits.push({
            logId: log.id,
            staffName: log.performedByName || getStaffName(log.performedBy),
            date: log.previousData.date,
            remainingSeconds: Math.round(remainingSeconds),
            log
          });
        }
      }
    });
    const sortedExpiry = nearExpiryEdits.sort((a, b) => a.remainingSeconds - b.remainingSeconds); // closest to 0 first
    setNearExpiryEditsList(sortedExpiry);

  }, [auditLogs, dateStart, dateEnd, staffNameMap]);

  // Helper date range formatter
  const formatDateRangeLabel = (minDate, maxDate) => {
    const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (minDate.toDateString() === maxDate.toDateString()) {
      return format(minDate);
    }
    return `${format(minDate)} - ${format(maxDate)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAuditTime = (timeVal) => {
    if (!timeVal) return '--:--';
    const date = timeVal.seconds ? new Date(timeVal.seconds * 1000) : new Date(timeVal);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Reused Value comparison rendering
  const renderDataDiff = (log) => {
    const { action, previousData, newData } = log;
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
      if (field.isTime) return formatAuditTime(val);
      if (field.isBool) return val ? 'Yes' : 'No';
      return val;
    };

    return (
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-sm)',
        marginTop: '12px',
        boxShadow: 'var(--neu-shadow-pressed-sm)',
        fontSize: '0.85rem'
      }}>
        <h5 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
          Audit Values Comparison
        </h5>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              <th style={{ padding: '8px 12px' }}>Field Parameter</th>
              <th style={{ padding: '8px 12px' }}>Original (Before)</th>
              <th style={{ padding: '8px 12px' }}>Adjusted (After)</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(field => {
              const beforeVal = getFieldVal(previousData, field);
              const afterVal = getFieldVal(newData, field);
              const hasChanged = (action === 'update' || action === 'self-edit') && beforeVal !== afterVal;
              const cellStyle = (isAfter) => {
                if (!hasChanged) return {};
                return isAfter 
                  ? { color: 'var(--color-success)', fontWeight: 600 } 
                  : { color: 'var(--color-danger)', textDecoration: 'line-through', opacity: 0.8 };
              };

              return (
                <tr key={field.key} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>{field.label}</td>
                  <td style={{ padding: '8px 12px', ...cellStyle(false), color: 'var(--text-secondary)' }}>
                    {action === 'create' ? 'N/A (New Record)' : beforeVal || '--:--'}
                  </td>
                  <td style={{ padding: '8px 12px', ...cellStyle(true), color: 'var(--text-secondary)' }}>
                    {action === 'delete' ? 'Soft Deleted' : afterVal || '--:--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render sub-list of audit logs for drilldown
  const renderDrilldownLogs = (logs) => {
    return (
      <div style={{
        marginTop: '16px',
        padding: '16px 0 8px 0',
        borderTop: '1px dotted var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Linked Audit Records ({logs.length})
        </h5>
        {logs.map(log => {
          const isLogExpanded = expandedLogId === log.id;
          const affectedStaffUid = log.newData?.userId || log.previousData?.userId;
          const affectedStaffName = staffNameMap[affectedStaffUid] || `UID: ${affectedStaffUid?.substring(0, 8)}...`;
          
          return (
            <div key={log.id} style={{
              padding: '16px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              boxShadow: 'var(--neu-shadow-raised-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTimestamp(log.timestamp)}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.action === 'create' ? `Created log for ${affectedStaffName}` : `Self-correction log`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <NeuBadge variant={log.action === 'create' ? 'present' : 'late'}>
                    {log.action}
                  </NeuBadge>
                  <NeuButton 
                    onClick={() => setExpandedLogId(isLogExpanded ? null : log.id)}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {isLogExpanded ? 'Hide compare' : 'Compare'}
                  </NeuButton>
                </div>
              </div>
              
              {isLogExpanded && renderDataDiff(log)}
            </div>
          );
        })}
      </div>
    );
  };

  const handleToggleItem = (section, itemId) => {
    if (expandedSection === section && expandedItemId === itemId) {
      setExpandedSection(null);
      setExpandedItemId(null);
    } else {
      setExpandedSection(section);
      setExpandedItemId(itemId);
    }
    setExpandedLogId(null); // Reset detail diff comparison expansion
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Misuse Monitoring</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Analyze audit logs to detect potential peer-marking collusions or self-edit window misuses.</p>
        </div>
        <NeuButton onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Analysis</span>
        </NeuButton>
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

      {/* Date Filters Card */}
      <NeuCard variant="raised" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Analysis Date Filter</span>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <NeuDatePicker
            label="Analysis Start Date"
            value={dateStart}
            onChange={setDateStart}
          />
          <NeuDatePicker
            label="Analysis End Date"
            value={dateEnd}
            onChange={setDateEnd}
          />
        </div>
      </NeuCard>

      {loading ? (
        <Skeleton type="cards" rows={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
          
          {/* A) Frequent Peer-Markers */}
          <NeuCard variant="raised" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={22} style={{ color: 'var(--color-primary)' }} />
              <span>Frequent Peer-Markers</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '-10px' }}>
              Staff members who marked attendance for colleagues (not themselves) within the filter window.
            </p>
            {peerMarkersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No peer-marking logs detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {peerMarkersList.map(item => {
                  const isItemExpanded = expandedSection === 'peer' && expandedItemId === item.uid;
                  return (
                    <div key={item.uid} style={{
                      padding: '16px',
                      background: isItemExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-base)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: isItemExpanded ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                      transition: 'all var(--transition-fast)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged check-ins for others</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary)' }}>{item.count} times</span>
                          <NeuButton onClick={() => handleToggleItem('peer', item.uid)} style={{ padding: '6px' }}>
                            {isItemExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                          </NeuButton>
                        </div>
                      </div>
                      
                      {isItemExpanded && renderDrilldownLogs(item.logs)}
                    </div>
                  );
                })}
              </div>
            )}
          </NeuCard>

          {/* B) Self-Edits Frequency */}
          <NeuCard variant="raised" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} style={{ color: 'var(--color-warning)' }} />
              <span>Self-Edits Frequency</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '-10px' }}>
              Staff members who edited/corrected their own logged times within the 10-minute self-edit window.
            </p>
            {selfEditsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No self-edit logs detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selfEditsList.map(item => {
                  const isItemExpanded = expandedSection === 'self' && expandedItemId === item.uid;
                  return (
                    <div key={item.uid} style={{
                      padding: '16px',
                      background: isItemExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-base)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: isItemExpanded ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                      transition: 'all var(--transition-fast)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Self-corrected entries</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-warning)' }}>{item.count} times</span>
                          <NeuButton onClick={() => handleToggleItem('self', item.uid)} style={{ padding: '6px' }}>
                            {isItemExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                          </NeuButton>
                        </div>
                      </div>
                      
                      {isItemExpanded && renderDrilldownLogs(item.logs)}
                    </div>
                  );
                })}
              </div>
            )}
          </NeuCard>

          {/* C) Same-Person Repeated Peer-Marking */}
          <NeuCard variant="raised" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={22} style={{ color: 'var(--color-danger)' }} />
              <span>Same-Person Repeated Peer-Marking</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '-10px' }}>
              Flags cases where Staff A peer-marked attendance for the same Staff B repeatedly (more than once).
            </p>
            {repeatedPairsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No repeated peer-marking pairs detected.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '12px 16px' }}>Marker (Staff A)</th>
                      <th style={{ padding: '12px 16px' }}>Marked For (Staff B)</th>
                      <th style={{ padding: '12px 16px' }}>Repeat Count</th>
                      <th style={{ padding: '12px 16px' }}>Date Range</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repeatedPairsList.map(pair => {
                      const isItemExpanded = expandedSection === 'pair' && expandedItemId === pair.key;
                      const hasHighCount = pair.count > 3; // Flag highlight
                      return (
                        <React.Fragment key={pair.key}>
                          <tr style={{ 
                            borderBottom: isItemExpanded ? 'none' : '1px solid var(--border-color)',
                            backgroundColor: hasHighCount ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                          }}>
                            <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{pair.markerName}</td>
                            <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{pair.targetName}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ 
                                fontWeight: 700, 
                                color: hasHighCount ? 'var(--color-danger)' : 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {pair.count} times
                                {hasHighCount && <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {formatDateRangeLabel(pair.minDate, pair.maxDate)}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <NeuButton onClick={() => handleToggleItem('pair', pair.key)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                <span>{isItemExpanded ? 'Hide' : 'Inspect'}</span>
                              </NeuButton>
                            </td>
                          </tr>
                          {isItemExpanded && (
                            <tr>
                              <td colSpan={5} style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid var(--border-color)' }}>
                                {renderDrilldownLogs(pair.logs)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </NeuCard>

          {/* D) Edits Right Before Window Expiry */}
          <NeuCard variant="raised" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Timer size={22} style={{ color: 'var(--color-primary)' }} />
              <span>Edits Right Before Window Expiry</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginTop: '-10px' }}>
              Flags self-corrections performed in the final 60 seconds of the 10-minute edit window (likely last-minute adjustments).
            </p>
            {nearExpiryEditsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No near-expiry self-edits detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {nearExpiryEditsList.map(item => {
                  const isItemExpanded = expandedSection === 'expiry' && expandedItemId === item.logId;
                  return (
                    <div key={item.logId} style={{
                      padding: '16px',
                      background: isItemExpanded ? 'var(--bg-surface-elevated)' : 'var(--bg-base)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: isItemExpanded ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                      transition: 'all var(--transition-fast)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.staffName}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Self-corrected record from {item.date}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            fontSize: '0.95rem', 
                            color: 'var(--color-danger)',
                            fontFamily: 'monospace'
                          }}>
                            {item.remainingSeconds} seconds left
                          </span>
                          <NeuButton onClick={() => handleToggleItem('expiry', item.logId)} style={{ padding: '6px' }}>
                            {isItemExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                          </NeuButton>
                        </div>
                      </div>
                      
                      {isItemExpanded && renderDrilldownLogs([item.log])}
                    </div>
                  );
                })}
              </div>
            )}
          </NeuCard>

        </div>
      )}

    </div>
  );
}
