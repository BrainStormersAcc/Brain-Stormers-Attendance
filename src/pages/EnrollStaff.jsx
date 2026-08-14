import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  User, 
  Search, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import NeuCard from '../shared/components/NeuCard.jsx';
import NeuButton from '../shared/components/NeuButton.jsx';
import NeuInput from '../shared/components/NeuInput.jsx';
import { db } from '../config/firebase.js';
import { collection, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';

export default function EnrollStaff() {
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const selectRef = React.useRef(null);
  
  // Enrollment states: 'idle', 'scan1', 'scan2', 'scan3', 'preview', 'error'
  const [enrollState, setEnrollState] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('Select a staff member to begin enrollment.');
  const [scannedTemplates, setScannedTemplates] = useState([]);
  const [finalTemplate, setFinalTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageColor, setMessageColor] = useState('var(--text-secondary)');

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsSelectOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'staff'), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ uid: doc.id, ...doc.data() });
      });
      setStaffList(list);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    if (!selectedStaff) return;
    
    // Reset scanner and close any open handle to prevent busy state
    if (window.fingerprintAPI) {
      await window.fingerprintAPI.closeDevice();
    }

    setEnrollState('scan1');
    setStatusMsg('Initializing biometric scanner...');
    setMessageColor('#3b82f6');
    setScannedTemplates([]);
    setFinalTemplate(null);

    try {
      if (!window.fingerprintAPI) {
        throw new Error('Biometric API is not available outside the Electron wrapper application.');
      }

      // 1. Initialize scanner
      const initRes = await window.fingerprintAPI.initDevice();
      console.log('[Enroll UI] Device initialized:', initRes);

      // 2. Scan 1
      setStatusMsg('👉 Place finger on the scanner sensor (Scan 1 of 3)...');
      setMessageColor('var(--color-primary)');
      const scan1 = await window.fingerprintAPI.captureFingerprint(20000);
      if (!scan1.template) throw new Error('First scan failed to capture template data.');
      
      const templates = [scan1.template];
      setScannedTemplates(templates);

      // 3. Scan 2
      setEnrollState('scan2');
      setStatusMsg('☝️ Lift finger and place it again (Scan 2 of 3)...');
      // Brief pause to allow lifting
      await new Promise(resolve => setTimeout(resolve, 800));
      const scan2 = await window.fingerprintAPI.captureFingerprint(20000);
      if (!scan2.template) throw new Error('Second scan failed to capture template data.');

      // Match Scan 1 and Scan 2
      setStatusMsg('🔄 Verifying finger consistency...');
      const matchRes1 = await window.fingerprintAPI.matchTemplates(templates[0], scan2.template);
      console.log('[Enroll UI] Scan 1 vs Scan 2 score:', matchRes1.score);
      if (!matchRes1.success || matchRes1.score <= 30) {
        throw new Error('Scans do not match. Please ensure you place the same finger consistently.');
      }

      templates.push(scan2.template);
      setScannedTemplates(templates);

      // 4. Scan 3
      setEnrollState('scan3');
      setStatusMsg('☝️ Lift finger and place it one last time (Scan 3 of 3)...');
      await new Promise(resolve => setTimeout(resolve, 800));
      const scan3 = await window.fingerprintAPI.captureFingerprint(20000);
      if (!scan3.template) throw new Error('Third scan failed to capture template data.');

      // Match Scan 2 and Scan 3
      setStatusMsg('🔄 Verifying final finger consistency...');
      const matchRes2 = await window.fingerprintAPI.matchTemplates(templates[1], scan3.template);
      console.log('[Enroll UI] Scan 2 vs Scan 3 score:', matchRes2.score);
      if (!matchRes2.success || matchRes2.score <= 30) {
        throw new Error('Final scan does not match. Please ensure you place the same finger consistently.');
      }

      templates.push(scan3.template);
      setScannedTemplates(templates);

      // 5. Merge Templates
      setStatusMsg('🔄 Compiling and merging master biometrics template...');
      const mergeRes = await window.fingerprintAPI.mergeTemplates(templates[0], templates[1], templates[2]);
      if (!mergeRes.success || !mergeRes.template) {
        throw new Error(mergeRes.error || 'Failed to merge fingerprint templates.');
      }

      setFinalTemplate(mergeRes.template);
      setEnrollState('preview');
      setStatusMsg('✅ Biometrics compiled successfully! Click Save to register.');
      setMessageColor('#10b981');
    } catch (err) {
      console.error('[Enroll UI] Flow failed:', err);
      setEnrollState('error');
      setStatusMsg(`❌ Enrollment Failed: ${err.message}`);
      setMessageColor('#ef4444');
    } finally {
      if (window.fingerprintAPI) {
        await window.fingerprintAPI.closeDevice();
      }
    }
  };

  const handleSaveEnrollment = async () => {
    if (!selectedStaff || !finalTemplate) return;
    setLoading(true);

    try {
      // 1. Save to Firestore
      const userDocRef = doc(db, 'users', selectedStaff);
      await updateDoc(userDocRef, {
        fingerprintTemplate: finalTemplate,
        fingerprintEnrolledAt: serverTimestamp()
      });

      // 2. Save in local memory cache on main process
      if (window.fingerprintAPI && window.fingerprintAPI.updateFingerprintCache) {
        window.fingerprintAPI.updateFingerprintCache(selectedStaff, finalTemplate);
      }

      // Reset UI and refresh
      setEnrollState('idle');
      setStatusMsg('✅ Fingerprint saved and registered successfully!');
      setMessageColor('#10b981');
      setScannedTemplates([]);
      setFinalTemplate(null);
      setSelectedStaff('');
      await fetchStaff();
    } catch (err) {
      console.error('Error saving fingerprint:', err);
      setStatusMsg(`❌ Saving Failed: ${err.message}`);
      setMessageColor('#ef4444');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFingerprint = async (uid, name) => {
    const confirmRemove = window.confirm(`Are you sure you want to remove the registered fingerprint for ${name}?`);
    if (!confirmRemove) return;

    setLoading(true);
    try {
      // 1. Remove from Firestore
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        fingerprintTemplate: null,
        fingerprintEnrolledAt: null
      });

      // 2. Remove from local memory cache on main process
      if (window.fingerprintAPI && window.fingerprintAPI.removeFingerprintCache) {
        window.fingerprintAPI.removeFingerprintCache(uid);
      }

      setStatusMsg(`🧹 Cleared fingerprint registrations for ${name}.`);
      setMessageColor('#ef4444');
      await fetchStaff();
    } catch (err) {
      console.error('Error removing fingerprint:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter staff list based on query
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unenrolledStaff = filteredStaff.filter(s => !s.fingerprintTemplate);
  const enrolledStaff = filteredStaff.filter(s => s.fingerprintTemplate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* SECTION 1: BIO ENROLLMENT FORM */}
      <NeuCard variant="raised" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
          <Fingerprint size={22} style={{ color: 'var(--color-primary)' }} />
          <span>Biometric Scanner Enrollment</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Select User Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Select Staff Member</label>
            <div ref={selectRef} style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div 
                style={{
                  flex: 1,
                  position: 'relative',
                  cursor: (enrollState !== 'idle' && enrollState !== 'preview' && enrollState !== 'error') ? 'not-allowed' : 'pointer',
                  opacity: (enrollState !== 'idle' && enrollState !== 'preview' && enrollState !== 'error') ? 0.7 : 1
                }}
              >
                {/* Trigger Button */}
                <div 
                  onClick={() => {
                    if (enrollState === 'idle' || enrollState === 'preview' || enrollState === 'error') {
                      setIsSelectOpen(!isSelectOpen);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    color: selectedStaff ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: isSelectOpen ? 'var(--neu-shadow-pressed)' : 'var(--neu-shadow-raised-sm)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>
                    {selectedStaff 
                      ? (unenrolledStaff.find(s => s.uid === selectedStaff)?.name || staffList.find(s => s.uid === selectedStaff)?.name || 'Selected Staff') 
                      : '-- Choose active staff name --'}
                  </span>
                  <ChevronDown size={16} style={{ 
                    color: 'var(--text-secondary)', 
                    transform: isSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </div>

                {/* Dropdown Options List */}
                {isSelectOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.4), var(--neu-shadow-raised)',
                      zIndex: 100,
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '8px',
                      animation: 'slideDown 0.15s ease-out'
                    }}
                  >
                    {unenrolledStaff.length === 0 ? (
                      <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center' }}>
                        No active unenrolled staff found.
                      </div>
                    ) : (
                      unenrolledStaff.map(staff => (
                        <div 
                          key={staff.uid}
                          onClick={() => {
                            setSelectedStaff(staff.uid);
                            setEnrollState('idle');
                            setStatusMsg('Staff member selected. Click Start Enrollment to begin.');
                            setMessageColor('var(--text-secondary)');
                            setIsSelectOpen(false);
                          }}
                          className="custom-select-option"
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontWeight: '500' }}>{staff.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{staff.username || 'no-username'}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <NeuButton 
                onClick={fetchStaff} 
                disabled={loading || enrollState !== 'idle'} 
                style={{ flex: '0 0 50px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
              </NeuButton>
            </div>
          </div>

          {/* Scanner State Screen */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#13151a',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: 'inset -4px -4px 8px #252932, inset 4px 4px 8px #13151a',
            minHeight: '160px',
            textAlign: 'center',
            gap: '16px'
          }}>
            
            {/* Scans Tracker circles */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: scannedTemplates.length >= 1 ? '#3b82f6' : 'var(--bg-base)',
                boxShadow: scannedTemplates.length >= 1 ? 'none' : 'var(--neu-shadow-raised)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: scannedTemplates.length >= 1 ? '#ffffff' : 'var(--text-secondary)'
              }}>1</div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: scannedTemplates.length >= 2 ? '#3b82f6' : 'var(--bg-base)',
                boxShadow: scannedTemplates.length >= 2 ? 'none' : 'var(--neu-shadow-raised)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: scannedTemplates.length >= 2 ? '#ffffff' : 'var(--text-secondary)'
              }}>2</div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: scannedTemplates.length >= 3 ? '#10b981' : 'var(--bg-base)',
                boxShadow: scannedTemplates.length >= 3 ? 'none' : 'var(--neu-shadow-raised)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: scannedTemplates.length >= 3 ? '#ffffff' : 'var(--text-secondary)'
              }}>3</div>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', color: messageColor }}>
              {statusMsg}
            </p>
          </div>

          {/* Action Button Row */}
          <div style={{ display: 'flex', justifyItems: 'flex-end', gap: '12px', justifyContent: 'flex-end' }}>
            {enrollState === 'preview' ? (
              <>
                <NeuButton onClick={() => setEnrollState('idle')} style={{ padding: '12px 24px' }}>
                  Cancel
                </NeuButton>
                <NeuButton onClick={handleStartEnrollment} style={{ padding: '12px 24px' }}>
                  Retry Scan
                </NeuButton>
                <NeuButton onClick={handleSaveEnrollment} active={true} style={{ padding: '12px 24px' }}>
                  Save Fingerprint
                </NeuButton>
              </>
            ) : (
              <NeuButton 
                onClick={handleStartEnrollment} 
                disabled={!selectedStaff || (enrollState !== 'idle' && enrollState !== 'error')}
                active={!!selectedStaff}
                style={{ padding: '12px 32px' }}
              >
                {enrollState === 'error' ? 'Re-enroll' : 'Start Enrollment'}
              </NeuButton>
            )}
          </div>
        </div>
      </NeuCard>

      {/* SECTION 2: ENROLLED USERS DIRECTORY */}
      <NeuCard variant="raised" style={{ padding: '32px' }}>
        
        {/* Search header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', margin: 0 }}>
            <User size={22} style={{ color: 'var(--color-primary)' }} />
            <span>Enrolled Staff Biometrics Directory</span>
          </h3>
          
          <div style={{ position: 'relative', width: '240px' }}>
            <NeuInput 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          </div>
        </div>

        {/* Directory List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrolledStaff.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No enrolled staff members found matching criteria.
            </div>
          ) : (
            enrolledStaff.map(staff => {
              const enrolledDate = staff.fingerprintEnrolledAt?.toDate 
                ? staff.fingerprintEnrolledAt.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) 
                : 'Unknown';
              
              return (
                <div key={staff.uid} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  boxShadow: 'var(--neu-shadow-raised)',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{staff.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      🔑 Username: <strong>{staff.username || 'N/A'}</strong> | Enrolled: <em>{enrolledDate}</em>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <NeuButton 
                      onClick={() => {
                        setSelectedStaff(staff.uid);
                        handleStartEnrollment();
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      Re-enroll
                    </NeuButton>
                    <NeuButton 
                      onClick={() => handleRemoveFingerprint(staff.uid, staff.name)}
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={15} style={{ color: '#ef4444' }} />
                    </NeuButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </NeuCard>

      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .custom-select-option:hover {
          background: var(--bg-surface-elevated) !important;
          color: var(--color-primary) !important;
          box-shadow: var(--neu-shadow-raised-xs);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
