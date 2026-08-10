import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  Filter,
  FileText,
  Plus,
  TrendingUp,
  Download,
  AlertCircle,
  Smile,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import NeuCard from '../../../shared/components/NeuCard.jsx';
import NeuButton from '../../../shared/components/NeuButton.jsx';
import NeuBadge from '../../../shared/components/NeuBadge.jsx';
import NeuDatePicker from '../../../shared/components/NeuDatePicker.jsx';
import NeuInput from '../../../shared/components/NeuInput.jsx';
import NeuSegmentedControl from '../../../shared/components/NeuSegmentedControl.jsx';
import NeuTimePicker from '../../../shared/components/NeuTimePicker.jsx';
import NeuToggle from '../../../shared/components/NeuToggle.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Loader from '../../../shared/components/Loader.jsx';
import { db } from '../../../config/firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  writeBatch,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { getAllStaff, getAllAttendance } from '../../../services/adminService.js';

// Configuration constant for self-edit capability window
export const EDIT_WINDOW_MINUTES = 10;

export default function StaffDashboard() {
  const { currentUser, userProfile, loading } = useAuth();
  
  // Data State variables
  const [rawLogs, setRawLogs] = useState([]);
  const [rawStaffList, setRawStaffList] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [staffNameMap, setStaffNameMap] = useState({});

  // View Switcher state persisted in localStorage
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('staff-attendance-view-mode') || 'Cards + Table';
  });

  // Profiles Mode States
  const [showStaffProfilesView, setShowStaffProfilesView] = useState(false);
  const [selectedProfileStaff, setSelectedProfileStaff] = useState(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');

  // Calendar states
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isManualRecordModalOpen, setIsManualRecordModalOpen] = useState(false);

  // Manual Attendance Record adjustment states
  const [manualStaff, setManualStaff] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualCheckIn, setManualCheckIn] = useState('');
  const [manualCheckOut, setManualCheckOut] = useState('');
  const [manualStatus, setManualStatus] = useState('present');
  const [manualReason, setManualReason] = useState('');
  const [manualStaffSearch, setManualStaffSearch] = useState('');
  const [isManualStaffDropdownOpen, setIsManualStaffDropdownOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualModalMode, setManualModalMode] = useState('create'); // 'create' | 'edit'
  const [editingRecord, setEditingRecord] = useState(null);

  // Soft-Delete states
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Self-edit window configuration & state
  const [now, setNow] = useState(new Date());
  const [isSelfEditModalOpen, setIsSelfEditModalOpen] = useState(false);
  const [selfEditRecord, setSelfEditRecord] = useState(null);
  const [selfEditStatus, setSelfEditStatus] = useState('present');
  const [selfEditCheckIn, setSelfEditCheckIn] = useState('');
  const [selfEditSubmitting, setSelfEditSubmitting] = useState(false);
  const [selfEditError, setSelfEditError] = useState('');

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getEditableTimeRemaining = (log) => {
    if (!log || !log.createdAt || !log.markedByUserId || log.markedByUserId !== currentUser?.uid) {
      return 0;
    }
    const createdTime = log.createdAt.seconds 
      ? new Date(log.createdAt.seconds * 1000) 
      : new Date(log.createdAt);
    const elapsedMs = now - createdTime;
    const windowMs = EDIT_WINDOW_MINUTES * 60 * 1000;
    const remainingMs = windowMs - elapsedMs;
    return remainingMs > 0 ? remainingMs : 0;
  };

  const formatCountdown = (remainingMs) => {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Refs for modal dropdowns and clicks outside
  const manualStaffDropdownRef = useRef(null);

  // Summary sort states (Admin Only)
  const [summaryViewScope, setSummaryViewScope] = useState('Monthly'); // 'Monthly' | 'Yearly' | 'Both'
  const [summarySortField, setSummarySortField] = useState('pct');
  const [summarySortOrder, setSummarySortOrder] = useState('desc');

  // Export dropdown states
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  // Helper date generators for default states
  const getFirstDayOfCurrentMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getLastDayOfCurrentMonth = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  // Filter States
  const [filterFrom, setFilterFrom] = useState(getFirstDayOfCurrentMonth());
  const [filterTo, setFilterTo] = useState(getLastDayOfCurrentMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(['present', 'late', 'absent']);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search dropdown ref for click outside detection
  const dropdownRef = useRef(null);

  // Sync click outside triggers for searchable staff dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync click outside triggers for searchable manual staff dropdown inside modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (manualStaffDropdownRef.current && !manualStaffDropdownRef.current.contains(e.target)) {
        setIsManualStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync click outside and escape key triggers for Export dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportDropdownOpen(false);
      }
    };
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Search dropdown ref for click outside detection (Profiles search)
  const profileSearchDropdownRef = useRef(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileSearchDropdownRef.current && !profileSearchDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset pagination page on filter state shifts
  useEffect(() => {
    setCurrentPage(1);
  }, [filterFrom, filterTo, selectedStaff, selectedStatuses]);

  // Get current date string in local YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get elapsed working days in the current month up to today (excluding Fridays)
  const getElapsedWorkingDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let workingDays = 0;
    for (let d = 1; d <= today.getDate(); d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday
      if (dayOfWeek !== 5) {
        workingDays++;
      }
    }
    return workingDays;
  };

  // Refactored data fetcher accessible component-wide
  const fetchRawData = async () => {
    setDataLoading(true);
    setDataError('');
    try {
      // 1. Fetch active staff list for both roles with graceful fallback
      let activeStaff = [];
      try {
        const staffList = await getAllStaff();
        activeStaff = staffList.filter(s => s.active);
      } catch (err) {
        console.warn('Could not fetch all staff profiles, falling back to current user:', err);
        activeStaff = [{
          uid: currentUser.uid,
          name: userProfile?.name || 'Staff User',
          username: userProfile?.username || '',
          active: true
        }];
      }
      setRawStaffList(activeStaff);

      // Build Name lookup map
      const nameMap = {};
      activeStaff.forEach(s => {
        nameMap[s.uid] = s.name;
      });
      setStaffNameMap(nameMap);

      // 2. Fetch logs based on role
      if (userProfile.role === 'admin') {
        const allLogs = await getAllAttendance();
        const staffLogs = allLogs.filter(log => log.role === 'staff');
        setRawLogs(staffLogs);
      } else {
        // Staff View: Fetch only user's isolated logs
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const userLogs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isDeleted !== true) {
            userLogs.push({ id: doc.id, ...data });
          }
        });
        setRawLogs(userLogs);
      }
    } catch (err) {
      console.error('Error fetching raw attendance data:', err);
      setDataError('Failed to fetch attendance logs.');
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch full records list initially
  useEffect(() => {
    if (currentUser && userProfile) {
      fetchRawData();
    }
  }, [currentUser, userProfile]);

  const handleOpenSelfEditModal = (log) => {
    setSelfEditRecord(log);
    setSelfEditStatus(log.status);
    
    // Pre-fill check-in time input in HH:MM format
    const formatTimeInput = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    setSelfEditCheckIn(formatTimeInput(log.checkIn));
    setSelfEditError('');
    setIsSelfEditModalOpen(true);
  };

  const handleSaveSelfEdit = async (e) => {
    e.preventDefault();
    if (!selfEditRecord) return;
    
    // Check if the window is still open on submit (double check)
    const remainingMs = getEditableTimeRemaining(selfEditRecord);
    if (remainingMs <= 0) {
      setSelfEditError('Edit window has expired. You can no longer self-correct this record.');
      return;
    }

    setSelfEditSubmitting(true);
    setSelfEditError('');

    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, 'attendance', selfEditRecord.id);

      // Compile check-in date
      const [hours, minutes] = selfEditCheckIn.split(':').map(Number);
      const logDate = selfEditRecord.date; // Keep original date
      const [year, month, day] = logDate.split('-').map(Number);
      const checkInDate = new Date(year, month - 1, day, hours, minutes, 0);

      const updatedFields = {
        checkIn: checkInDate,
        status: selfEditStatus,
        selfEdited: true,
        selfEditedAt: serverTimestamp()
      };

      batch.update(attendanceRef, updatedFields);

      // Audit logs (action: "self-edit", performedBy: current user's uid)
      const previousData = {
        userId: selfEditRecord.userId,
        role: selfEditRecord.role,
        date: selfEditRecord.date,
        checkIn: selfEditRecord.checkIn,
        checkOut: selfEditRecord.checkOut || null,
        status: selfEditRecord.status,
        markedBy: selfEditRecord.markedBy,
        isDeleted: selfEditRecord.isDeleted || false,
        markedByUserId: selfEditRecord.markedByUserId || null,
        createdAt: selfEditRecord.createdAt || null
      };

      const newData = {
        ...previousData,
        checkIn: checkInDate,
        status: selfEditStatus,
        selfEdited: true,
        selfEditedAt: serverTimestamp()
      };

      const auditLogRef = doc(collection(db, 'auditLogs'));
      const auditLogData = {
        action: 'self-edit',
        targetCollection: 'attendance',
        targetDocId: selfEditRecord.id,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Staff Member',
        timestamp: serverTimestamp(),
        reason: 'Self-corrected within edit window',
        previousData,
        newData
      };

      batch.set(auditLogRef, auditLogData);
      await batch.commit();

      setIsSelfEditModalOpen(false);
      await fetchRawData();
    } catch (err) {
      console.error('Error saving self-edit:', err);
      setSelfEditError(err.message || 'Failed to update record.');
    } finally {
      setSelfEditSubmitting(false);
    }
  };

  // Form initialization helper
  const handleOpenManualRecordModal = () => {
    setManualModalMode('create');
    setEditingRecord(null);
    
    // Auto-select the logged-in user if their profile exists in the staff list
    const myProfile = rawStaffList.find(s => s.uid === currentUser?.uid);
    if (myProfile) {
      setManualStaff({ uid: myProfile.uid, name: myProfile.name, username: myProfile.username || '' });
      setManualStaffSearch(myProfile.name);
    } else {
      setManualStaff(null);
      setManualStaffSearch('');
    }

    setManualDate(getTodayDateString());
    setManualCheckIn('');
    setManualCheckOut('');
    setManualStatus('present');
    setManualReason('');
    setManualError('');
    setManualSuccess(false);
    setIsManualRecordModalOpen(true);
  };

  // Open edit modal pre-filled with record data
  const handleOpenEditModal = (log) => {
    if (userProfile?.role !== 'admin') return;
    const formatTimeInput = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    setManualModalMode('edit');
    setEditingRecord(log);
    
    const staffName = staffNameMap[log.userId] || 'Unknown User';
    setManualStaff({ uid: log.userId, name: staffName, username: '' });
    setManualStaffSearch(staffName);

    setManualDate(log.date);
    setManualCheckIn(formatTimeInput(log.checkIn));
    setManualCheckOut(formatTimeInput(log.checkOut));
    setManualStatus(log.status);
    setManualReason(''); // Must be freshly entered for this edit
    setManualError('');
    setManualSuccess(false);
    setIsManualRecordModalOpen(true);
  };

  // Select staff member from searchable dropdown
  const handleSelectManualStaff = (staff) => {
    setManualStaff(staff);
    setManualStaffSearch(staff.name);
    setIsManualStaffDropdownOpen(false);
  };

  // Manual Adjustments Form Submission (Supports Create and Edit modes)
  const handleCreateManualRecord = async (e) => {
    e.preventDefault();
    setManualError('');
    setManualSubmitting(true);

    try {
      // 1. Basic input validations
      if (!manualStaff) {
        setManualError('Please select a staff member.');
        setManualSubmitting(false);
        return;
      }
      if (!manualDate) {
        setManualError('Please select a date.');
        setManualSubmitting(false);
        return;
      }
      const todayStr = getTodayDateString();
      if (manualDate > todayStr) {
        setManualError('Date cannot be in the future.');
        setManualSubmitting(false);
        return;
      }
      if (!manualCheckIn) {
        setManualError('Please enter a check-in time.');
        setManualSubmitting(false);
        return;
      }
      if (manualCheckOut && manualCheckOut <= manualCheckIn) {
        setManualError('Check-out time must be after check-in time.');
        setManualSubmitting(false);
        return;
      }
      if (!manualReason || !manualReason.trim()) {
        setManualError('Please provide a reason / justification.');
        setManualSubmitting(false);
        return;
      }

      // 2. Compile date & times
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const [year, month, day] = manualDate.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0);
      };

      const checkInDate = parseTime(manualCheckIn);
      const checkOutDate = parseTime(manualCheckOut);

      // 3. Firestore Batch Write Transaction
      const batch = writeBatch(db);

      if (userProfile?.role === 'admin') {
        if (manualModalMode === 'edit' && editingRecord) {
          // A. Setup attendance document reference for update
          const attendanceRef = doc(db, 'attendance', editingRecord.id);

          const updatedFields = {
            checkIn: checkInDate,
            checkOut: checkOutDate || null,
            status: manualStatus,
            lastEditedBy: currentUser.uid,
            lastEditedAt: serverTimestamp()
          };

          batch.update(attendanceRef, updatedFields);

          // Capture snapshot before changes
          const previousData = {
            userId: editingRecord.userId,
            role: editingRecord.role,
            date: editingRecord.date,
            checkIn: editingRecord.checkIn,
            checkOut: editingRecord.checkOut || null,
            status: editingRecord.status,
            markedBy: editingRecord.markedBy,
            isDeleted: editingRecord.isDeleted || false,
            ...(editingRecord.lastEditedBy ? { lastEditedBy: editingRecord.lastEditedBy } : {}),
            ...(editingRecord.lastEditedAt ? { lastEditedAt: editingRecord.lastEditedAt } : {})
          };

          const newData = {
            ...previousData,
            checkIn: checkInDate,
            checkOut: checkOutDate || null,
            status: manualStatus,
            lastEditedBy: currentUser.uid,
            lastEditedAt: serverTimestamp()
          };

          // B. Setup auditLog document for update action
          const auditLogRef = doc(collection(db, 'auditLogs'));
          const auditLogData = {
            action: 'update',
            targetCollection: 'attendance',
            targetDocId: editingRecord.id,
            performedBy: currentUser.uid,
            performedByName: userProfile?.name || 'Admin',
            timestamp: serverTimestamp(),
            reason: manualReason.trim(),
            previousData: previousData,
            newData: newData
          };

          batch.set(auditLogRef, auditLogData);

        } else {
          // CREATE Mode (Admin)
          // Prevent duplicate entries
          const duplicate = rawLogs.find(
            log => log.userId === manualStaff.uid && log.date === manualDate && log.isDeleted !== true
          );
          if (duplicate) {
            setManualError('An active attendance record already exists for this staff member on this date. Please EDIT the existing record instead.');
            setManualSubmitting(false);
            return;
          }

          // A. Setup attendance document for creation
          const attendanceRef = doc(collection(db, 'attendance'));
          const attendanceId = attendanceRef.id;

          const newAttendanceData = {
            userId: manualStaff.uid,
            role: 'staff',
            date: manualDate,
            checkIn: checkInDate,
            checkOut: checkOutDate || null,
            status: manualStatus,
            markedBy: 'admin-manual',
            isDeleted: false,
            createdAt: serverTimestamp(),
            markedByUserId: currentUser.uid
          };

          batch.set(attendanceRef, newAttendanceData);

          // B. Setup auditLog document for create action
          const auditLogRef = doc(collection(db, 'auditLogs'));
          const auditLogData = {
            action: 'create',
            targetCollection: 'attendance',
            targetDocId: attendanceId,
            performedBy: currentUser.uid,
            performedByName: userProfile?.name || 'Admin',
            timestamp: serverTimestamp(),
            reason: manualReason.trim(),
            previousData: null,
            newData: newAttendanceData
          };

          batch.set(auditLogRef, auditLogData);
        }
      } else {
        // CREATE Mode (Staff - Logging own or peer attendance)
        const duplicate = rawLogs.find(
          log => log.userId === manualStaff.uid && log.date === manualDate && log.isDeleted !== true
        );
        if (duplicate) {
          setManualError(manualStaff.uid === currentUser.uid 
            ? 'An active attendance record already exists for you on this date.'
            : `An active attendance record already exists for ${manualStaff.name} on this date.`);
          setManualSubmitting(false);
          return;
        }

        // A. Setup attendance document for creation
        const attendanceRef = doc(collection(db, 'attendance'));
        const attendanceId = attendanceRef.id;

        const newAttendanceData = {
          userId: manualStaff.uid,
          role: 'staff',
          date: manualDate,
          checkIn: checkInDate,
          checkOut: checkOutDate || null,
          status: manualStatus,
          markedBy: 'self-checkin',
          isDeleted: false,
          createdAt: serverTimestamp(),
          markedByUserId: currentUser.uid
        };

        batch.set(attendanceRef, newAttendanceData);

        // B. Setup auditLog document for create action
        const auditLogRef = doc(collection(db, 'auditLogs'));
        const auditLogData = {
          action: 'create',
          targetCollection: 'attendance',
          targetDocId: attendanceId,
          performedBy: currentUser.uid,
          performedByName: userProfile?.name || 'Staff Member',
          timestamp: serverTimestamp(),
          reason: manualStaff.uid === currentUser.uid 
            ? 'Self check-in logged' 
            : `Peer-marked check-in for ${manualStaff.name}`,
          previousData: null,
          newData: newAttendanceData
        };

        batch.set(auditLogRef, auditLogData);
      }

      // Commit transaction batch
      await batch.commit();

      // 4. Success UI feedback & auto-close
      setManualSuccess(true);
      setTimeout(() => {
        setIsManualRecordModalOpen(false);
        setManualSuccess(false);
      }, 2500);

      // 5. Reload local dataset
      await fetchRawData();

    } catch (err) {
      console.error('Error saving manual record:', err);
      setManualError(err.message || 'Failed to save manual record.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Open soft-delete confirmation modal
  const handleOpenDeleteModal = (log) => {
    if (userProfile?.role !== 'admin') return;
    setDeletingRecord(log);
    setDeleteReason('');
    setDeleteError('');
    setDeleteSuccess(false);
    setIsDeleteConfirmModalOpen(true);
  };

  // Confirm and commit soft-delete
  const handleConfirmSoftDelete = async (e) => {
    e.preventDefault();
    if (userProfile?.role !== 'admin') {
      setDeleteError('Unauthorized action. Only admins can soft-delete records.');
      setDeleteSubmitting(false);
      return;
    }
    setDeleteError('');
    setDeleteSubmitting(true);

    try {
      if (!deleteReason || !deleteReason.trim()) {
        setDeleteError('Please provide a reason / justification.');
        setDeleteSubmitting(false);
        return;
      }

      if (!deletingRecord) {
        setDeleteError('No record selected for deletion.');
        setDeleteSubmitting(false);
        return;
      }

      const previousData = {
        userId: deletingRecord.userId,
        role: deletingRecord.role,
        date: deletingRecord.date,
        checkIn: deletingRecord.checkIn,
        checkOut: deletingRecord.checkOut || null,
        status: deletingRecord.status,
        markedBy: deletingRecord.markedBy,
        isDeleted: deletingRecord.isDeleted || false,
        ...(deletingRecord.lastEditedBy ? { lastEditedBy: deletingRecord.lastEditedBy } : {}),
        ...(deletingRecord.lastEditedAt ? { lastEditedAt: deletingRecord.lastEditedAt } : {})
      };

      const batch = writeBatch(db);

      // A. Soft delete the attendance document
      const attendanceRef = doc(db, 'attendance', deletingRecord.id);
      batch.update(attendanceRef, {
        isDeleted: true,
        lastEditedBy: currentUser.uid,
        lastEditedAt: serverTimestamp()
      });

      // B. Create auditLog document
      const auditLogRef = doc(collection(db, 'auditLogs'));
      const auditLogData = {
        action: 'delete',
        targetCollection: 'attendance',
        targetDocId: deletingRecord.id,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Admin',
        timestamp: serverTimestamp(),
        reason: deleteReason.trim(),
        previousData: previousData,
        newData: null // newData is null for delete actions
      };

      batch.set(auditLogRef, auditLogData);

      // Commit transaction batch
      await batch.commit();

      // UI Success feedback and auto-close
      setDeleteSuccess(true);
      setTimeout(() => {
        setIsDeleteConfirmModalOpen(false);
        setDeleteSuccess(false);
        setDeletingRecord(null);
      }, 2500);

      // Reload local datasets
      await fetchRawData();

    } catch (err) {
      console.error('Error soft-deleting attendance record:', err);
      setDeleteError(err.message || 'Failed to soft-delete attendance record.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading || !userProfile) {
    return <Loader />;
  }

  const isAdmin = userProfile.role === 'admin';
  const isStaff = userProfile.role === 'staff';
  const dataScopeLabel = 'All Staff Attendance Data';

  // View mode setter with persistence
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    localStorage.setItem('staff-attendance-view-mode', newMode);
  };

  // Calculate working days in a custom date range (excluding Fridays)
  const getWorkingDaysInRange = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    let count = 0;
    let current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 5) { // non-Friday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Perform in-memory log filtering
  const getFilteredLogs = () => {
    let result = [...rawLogs];

    // 1. Date Range Filter
    if (filterFrom) {
      result = result.filter(log => log.date >= filterFrom);
    }
    if (filterTo) {
      result = result.filter(log => log.date <= filterTo);
    }

    // 2. Selected Staff Member Filter
    if ((isAdmin || isStaff) && selectedStaff) {
      result = result.filter(log => log.userId === selectedStaff.uid);
    }

    // 3. Status Filter (Multi-select)
    if (selectedStatuses.length < 3) {
      result = result.filter(log => selectedStatuses.includes(log.status.toLowerCase()));
    }

    // Sort newest date first
    return result.sort((a, b) => b.date.localeCompare(a.date));
  };

  const filteredLogsList = getFilteredLogs();

  // Compute live stats summary based on current filter sets
  const getSummaryStats = () => {
    const todayStr = getTodayDateString();
    
    // Determine if user has changed filters from default values
    const isDefaultRange = filterFrom === getFirstDayOfCurrentMonth() && filterTo === getLastDayOfCurrentMonth();
    const workingDaysCount = getWorkingDaysInRange(filterFrom, filterTo);

    if (isAdmin || isStaff) {
      // If a staff is selected, total staff count in current context is 1, else total active staff count
      const totalStaffCount = selectedStaff ? 1 : rawStaffList.length;
      
      const activeStaffInContext = selectedStaff 
        ? rawStaffList.filter(s => s.uid === selectedStaff.uid)
        : rawStaffList;
      
      const activeStaffUids = new Set(activeStaffInContext.map(s => s.uid));

      // Calculate today's status metrics for active staff in current filter scope
      const todayLogs = rawLogs.filter(log => log.date === todayStr && activeStaffUids.has(log.userId));
      const presentTodayCount = todayLogs.filter(log => log.status === 'present' || log.status === 'late').length;
      const lateTodayCount = todayLogs.filter(log => log.status === 'late').length;
      const absentTodayCount = Math.max(0, totalStaffCount - todayLogs.filter(log => log.status === 'present' || log.status === 'late').length);

      // Average Attendance over selected date range for staff in scope
      const logsInRange = rawLogs.filter(log => 
        log.date >= filterFrom && 
        log.date <= filterTo && 
        activeStaffUids.has(log.userId)
      );
      const presentLogsInRange = logsInRange.filter(log => log.status === 'present' || log.status === 'late').length;

      let avgAttendancePct = 0;
      if (totalStaffCount > 0 && workingDaysCount > 0) {
        avgAttendancePct = Math.round((presentLogsInRange / (totalStaffCount * workingDaysCount)) * 100);
      }

      return {
        presentToday: presentTodayCount,
        totalStaff: totalStaffCount,
        absentToday: absentTodayCount,
        lateToday: lateTodayCount,
        avgAttendancePct,
        isDefaultRange
      };
    } else {
      // Staff view metrics calculation (scoped by selected date range)
      const todayRecord = rawLogs.find(log => log.date === todayStr);
      let myStatusToday = 'Not marked yet';
      if (todayRecord) {
        if (todayRecord.status === 'present') myStatusToday = 'Present';
        else if (todayRecord.status === 'late') myStatusToday = 'Present (Late)';
        else if (todayRecord.status === 'absent') myStatusToday = 'Absent';
      }

      const logsInRange = rawLogs.filter(log => log.date >= filterFrom && log.date <= filterTo);
      const presentDaysCount = logsInRange.filter(log => log.status === 'present' || log.status === 'late').length;
      const absentDaysCount = Math.max(0, workingDaysCount - presentDaysCount);

      const attendancePct = workingDaysCount > 0 
        ? Math.min(100, Math.round((presentDaysCount / workingDaysCount) * 100)) 
        : 0;

      return {
        myStatusToday,
        presentDays: presentDaysCount,
        absentDays: absentDaysCount,
        attendancePct,
        isDefaultRange
      };
    }
  };

  const stats = getSummaryStats();

  // Reset Filters logic
  const handleResetFilters = () => {
    setFilterFrom(getFirstDayOfCurrentMonth());
    setFilterTo(getLastDayOfCurrentMonth());
    setSearchQuery('');
    setSelectedStaff(null);
    setSelectedStatuses(['present', 'late', 'absent']);
  };

  // Map loader variables to base state
  const statsLoading = dataLoading;
  const logsLoading = dataLoading;
  const statsError = dataError;

  // Filter searchable staff list options (Admin only)
  const filteredStaffOptions = rawStaffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter searchable active staff members for manual adjustments modal
  const activeStaffList = rawStaffList.filter(s => s.active);
  const sortedStaffList = [...activeStaffList].sort((a, b) => {
    if (a.uid === currentUser?.uid) return -1;
    if (b.uid === currentUser?.uid) return 1;
    return 0;
  });
  const matchedStaff = sortedStaffList.filter(s => 
    s.name.toLowerCase().includes(manualStaffSearch.toLowerCase()) ||
    s.username.toLowerCase().includes(manualStaffSearch.toLowerCase())
  );

  // Helper mappings for My Status Today
  const getStatusIconAndColor = (status) => {
    if (!status) {
      return { icon: Smile, color: 'var(--text-muted)' };
    }
    if (status.includes('Present (Late)') || status === 'Late') {
      return { icon: Clock, color: 'var(--color-warning)' };
    }
    if (status.includes('Present')) {
      return { icon: CheckCircle2, color: 'var(--color-success)' };
    }
    if (status === 'Absent') {
      return { icon: AlertCircle, color: 'var(--color-danger)' };
    }
    return { icon: Smile, color: 'var(--text-muted)' };
  };

  const statusInfo = stats ? getStatusIconAndColor(stats.myStatusToday) : { icon: Smile, color: 'var(--text-muted)' };
  const StatusIcon = statusInfo.icon;

  // Helper date/time formatters
  const formatTime = (timeData) => {
    if (!timeData) return '--:--';
    const date = timeData.seconds ? new Date(timeData.seconds * 1000) : new Date(timeData);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const date = new Date(year, monthIndex, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  // Pagination processing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogsList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogsList.length / itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Calendar month names mapping
  const calendarMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevCalendarMonth = () => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextCalendarMonth = () => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculate day cells details inside Calendar View (excluding padding indicators)
  const getCellDateString = (dayNum, isCurrentMonth = true) => {
    if (!isCurrentMonth) return null;
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  };

  // Render Neumorphic pulsing loading card blocks
  const renderLoadingSkeleton = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <NeuCard key={i} variant="raised" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div className="shimmer-block" style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--border-radius-md)',
            }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="shimmer-block" style={{ height: '14px', width: '65%', borderRadius: '4px' }} />
              <div className="shimmer-block" style={{ height: '24px', width: '35%', borderRadius: '4px' }} />
            </div>
          </NeuCard>
        ))}
      </div>
    );
  };

  // Render skeleton table rows
  const renderTableSkeleton = (colsCount) => {
    return Array.from({ length: 5 }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: colsCount }).map((_, colIndex) => (
          <td key={colIndex} style={{ padding: '16px 20px' }}>
            <div className="shimmer-block" style={{
              height: '16px',
              borderRadius: '4px',
              width: colIndex === 0 ? '70%' : '50%'
            }} />
          </td>
        ))}
      </tr>
    ));
  };

  // Render skeleton mobile cards
  const renderMobileCardsSkeleton = () => {
    return Array.from({ length: 4 }).map((_, idx) => (
      <NeuCard key={idx} variant="raised" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="shimmer-block" style={{ height: '14px', width: '30%', borderRadius: '4px' }} />
          <div className="shimmer-block" style={{ height: '24px', width: '20%', borderRadius: '12px' }} />
        </div>
        <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div className="shimmer-block" style={{ height: '32px', borderRadius: '4px' }} />
        </div>
      </NeuCard>
    ));
  };

  // SUB-RENDER: Summary Cards View
  const renderSummaryCards = () => {
    if (statsLoading) {
      return renderLoadingSkeleton();
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {(isAdmin || isStaff) ? (
          <>
            {/* Card 1: Present Today */}
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
                <Users size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Present Today</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.presentToday || 0} / {stats?.totalStaff || 0}
                </h3>
              </div>
            </NeuCard>

            {/* Card 2: Absent Today */}
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
                color: 'var(--color-danger)'
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Absent Today</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.absentToday || 0}
                </h3>
              </div>
            </NeuCard>

            {/* Card 3: Late Today */}
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
                color: 'var(--color-warning)'
              }}>
                <Clock size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Late Today</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.lateToday || 0}
                </h3>
              </div>
            </NeuCard>

            {/* Card 4: Average Attendance % */}
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
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {stats?.isDefaultRange ? "This Month's Avg Attendance" : "Period Avg Attendance"}
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.avgAttendancePct || 0}%
                </h3>
              </div>
            </NeuCard>
          </>
        ) : (
          <>
            {/* Card 1: My Status Today */}
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
                color: statusInfo.color
              }}>
                <StatusIcon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>My Status Today</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {stats?.myStatusToday || 'Not marked yet'}
                </h3>
              </div>
            </NeuCard>

            {/* Card 2: Present Days Count */}
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
                <CalendarIcon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {stats?.isDefaultRange ? "This Month's Present Days" : "Period's Present Days"}
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.presentDays || 0} Days
                </h3>
              </div>
            </NeuCard>

            {/* Card 3: Absent Days Count */}
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
                color: 'var(--color-danger)'
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {stats?.isDefaultRange ? "This Month's Absent Days" : "Period's Absent Days"}
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.absentDays || 0} Days
                </h3>
              </div>
            </NeuCard>

            {/* Card 4: Attendance Pct */}
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
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {stats?.isDefaultRange ? "This Month's Attendance" : "Period's Attendance"}
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {stats?.attendancePct || 0}%
                </h3>
              </div>
            </NeuCard>
          </>
        )}
      </div>
    );
  };

  // SUB-RENDER: Filter Bar
  const renderFilterBar = () => {
    return (
      <NeuCard variant="raised" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
          
          {/* From Date Picker */}
          <NeuDatePicker
            label="From Date"
            value={filterFrom}
            onChange={(val) => setFilterFrom(val)}
          />

          {/* To Date Picker */}
          <NeuDatePicker
            label="To Date"
            value={filterTo}
            onChange={(val) => setFilterTo(val)}
          />

          {/* Filter by Staff member */}
          {(isAdmin || isStaff) && (
            <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <label className="neu-input-label">Filter by Staff Member</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <NeuInput
                  placeholder="Type staff name..."
                  value={selectedStaff ? selectedStaff.name : searchQuery}
                  onChange={(e) => {
                    if (selectedStaff) {
                      setSelectedStaff(null);
                    }
                    setSearchQuery(e.target.value);
                    setIsStaffDropdownOpen(true);
                  }}
                  onFocus={() => setIsStaffDropdownOpen(true)}
                  style={{ margin: 0 }}
                />
                {(selectedStaff || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedStaff(null);
                      setSearchQuery('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {isStaffDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '76px',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                }}>
                  <NeuCard variant="raised" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredStaffOptions.length === 0 ? (
                      <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        No staff members found
                      </div>
                    ) : (
                      filteredStaffOptions.map(staff => (
                        <button
                          key={staff.uid}
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setIsStaffDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--border-radius-sm)',
                            textAlign: 'left',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'background-color var(--transition-fast)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {staff.name} ({staff.username})
                        </button>
                      ))
                    )}
                  </NeuCard>
                </div>
              )}
            </div>
          )}

          {/* Reset Filters button */}
          <NeuButton 
            onClick={handleResetFilters}
            style={{ width: '100%', justifyContent: 'center', height: '48px' }}
          >
            Reset Filters
          </NeuButton>
        </div>

        {/* Status Multi-select Chips Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          
          {/* Status Chip: All */}
          <button
            type="button"
            onClick={() => {
              const allSelected = selectedStatuses.length === 3;
              if (allSelected) {
                setSelectedStatuses([]);
              } else {
                setSelectedStatuses(['present', 'late', 'absent']);
              }
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-full)',
              border: selectedStatuses.length === 3 
                ? '1px solid rgba(138, 154, 184, 0.45)' 
                : '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              background: selectedStatuses.length === 3 
                ? 'rgba(138, 154, 184, 0.08)' 
                : 'var(--bg-surface)',
              transition: 'all var(--transition-fast)',
              boxShadow: selectedStatuses.length === 3 
                ? 'var(--neu-shadow-pressed-sm), inset 0 0 8px rgba(138, 154, 184, 0.15)' 
                : 'var(--neu-shadow-raised-sm)',
              color: selectedStatuses.length === 3 ? 'var(--color-primary)' : 'var(--text-secondary)',
              textShadow: selectedStatuses.length === 3 ? '0 0 8px rgba(138, 154, 184, 0.4)' : 'none'
            }}
          >
            All
          </button>

          {/* Status Chip: Present */}
          <button
            type="button"
            onClick={() => {
              const active = selectedStatuses.includes('present');
              if (active) {
                setSelectedStatuses(prev => prev.filter(s => s !== 'present'));
              } else {
                setSelectedStatuses(prev => [...prev, 'present']);
              }
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-full)',
              border: selectedStatuses.includes('present') 
                ? '1px solid rgba(52, 211, 153, 0.45)' 
                : '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              background: selectedStatuses.includes('present') 
                ? 'rgba(52, 211, 153, 0.08)' 
                : 'var(--bg-surface)',
              transition: 'all var(--transition-fast)',
              boxShadow: selectedStatuses.includes('present') 
                ? 'var(--neu-shadow-pressed-sm), inset 0 0 8px rgba(52, 211, 153, 0.15)' 
                : 'var(--neu-shadow-raised-sm)',
              color: selectedStatuses.includes('present') ? 'var(--color-success)' : 'var(--text-secondary)',
              textShadow: selectedStatuses.includes('present') ? '0 0 8px rgba(52, 211, 153, 0.4)' : 'none'
            }}
          >
            Present
          </button>

          {/* Status Chip: Late */}
          <button
            type="button"
            onClick={() => {
              const active = selectedStatuses.includes('late');
              if (active) {
                setSelectedStatuses(prev => prev.filter(s => s !== 'late'));
              } else {
                setSelectedStatuses(prev => [...prev, 'late']);
              }
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-full)',
              border: selectedStatuses.includes('late') 
                ? '1px solid rgba(251, 191, 36, 0.45)' 
                : '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              background: selectedStatuses.includes('late') 
                ? 'rgba(251, 191, 36, 0.08)' 
                : 'var(--bg-surface)',
              transition: 'all var(--transition-fast)',
              boxShadow: selectedStatuses.includes('late') 
                ? 'var(--neu-shadow-pressed-sm), inset 0 0 8px rgba(251, 191, 36, 0.15)' 
                : 'var(--neu-shadow-raised-sm)',
              color: selectedStatuses.includes('late') ? 'var(--color-warning)' : 'var(--text-secondary)',
              textShadow: selectedStatuses.includes('late') ? '0 0 8px rgba(251, 191, 36, 0.4)' : 'none'
            }}
          >
            Late
          </button>

          {/* Status Chip: Absent */}
          <button
            type="button"
            onClick={() => {
              const active = selectedStatuses.includes('absent');
              if (active) {
                setSelectedStatuses(prev => prev.filter(s => s !== 'absent'));
              } else {
                setSelectedStatuses(prev => [...prev, 'absent']);
              }
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-full)',
              border: selectedStatuses.includes('absent') 
                ? '1px solid rgba(248, 113, 113, 0.45)' 
                : '1px solid var(--border-color)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              background: selectedStatuses.includes('absent') 
                ? 'rgba(248, 113, 113, 0.08)' 
                : 'var(--bg-surface)',
              transition: 'all var(--transition-fast)',
              boxShadow: selectedStatuses.includes('absent') 
                ? 'var(--neu-shadow-pressed-sm), inset 0 0 8px rgba(248, 113, 113, 0.15)' 
                : 'var(--neu-shadow-raised-sm)',
              color: selectedStatuses.includes('absent') ? 'var(--color-danger)' : 'var(--text-secondary)',
              textShadow: selectedStatuses.includes('absent') ? '0 0 8px rgba(248, 113, 113, 0.4)' : 'none'
            }}
          >
            Absent
          </button>
        </div>
      </NeuCard>
    );
  };

  // SUB-RENDER: Logs Table Section
  const renderLogsSection = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Attendance Logs
          </h3>
          
          {/* Export Dropdown Trigger Container */}
          <div style={{ position: 'relative' }} ref={exportDropdownRef}>
            <NeuButton
              onClick={() => setIsExportDropdownOpen(prev => !prev)}
              variant="accent"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={18} />
              <span>Export Logs</span>
            </NeuButton>

            {/* Sliding Dropdown menu */}
            {isExportDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: 0,
                  zIndex: 999,
                  animation: 'slideDownFadeIn 220ms ease-out forwards'
                }}
              >
                <NeuCard
                  variant="raised"
                  style={{
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    minWidth: '180px',
                    boxShadow: 'var(--neu-shadow-raised-sm)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleExportPDF();
                      setIsExportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>Export as PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Download size={16} style={{ color: 'var(--color-success)' }} />
                    <span>Export as CSV</span>
                  </button>
                </NeuCard>
              </div>
            )}
          </div>
        </div>

        {logsLoading ? (
          <>
            <div className="desktop-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    {(isAdmin || isStaff) && <th>Staff Name</th>}
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Status</th>
                    {(isAdmin || isStaff) && <th>Marked By</th>}
                    {(isAdmin || isStaff) && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {renderTableSkeleton(isAdmin ? 6 : 5)}
                </tbody>
              </table>
            </div>
            <div className="mobile-cards-container">
              {renderMobileCardsSkeleton()}
            </div>
          </>
        ) : filteredLogsList.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    {(isAdmin || isStaff) && <th>Staff Name</th>}
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Status</th>
                    {(isAdmin || isStaff) && <th>Marked By</th>}
                    {(isAdmin || isStaff) && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id || `${log.userId}_${log.date}`}>
                      {(isAdmin || isStaff) && (
                        <td style={{ fontWeight: 600 }}>
                          {staffNameMap[log.userId] || 'Unknown User'}
                        </td>
                      )}
                      <td style={{ fontWeight: 500 }}>
                        {formatDateLabel(log.date)}
                      </td>
                      <td>{formatTime(log.checkIn)}</td>
                      <td>
                        <NeuBadge variant={log.status}>{log.status}</NeuBadge>
                      </td>
                      {(isAdmin || isStaff) && (
                        <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          <span>{log.markedBy || 'manual'}</span>
                          {log.lastEditedBy && (
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.65rem', 
                                fontWeight: 700, 
                                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                display: 'inline-block',
                                verticalAlign: 'middle'
                              }}
                              title="Manually adjusted by Admin"
                            >
                              Edited
                            </span>
                          )}
                        </td>
                      )}
                      {(isAdmin || isStaff) && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(log)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderRadius: 'var(--border-radius-sm)',
                                    boxShadow: 'var(--neu-shadow-raised-sm)',
                                    transition: 'all var(--transition-fast)',
                                    outline: 'none'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--neu-shadow-pressed-sm)';
                                    e.currentTarget.style.color = 'var(--color-primary)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--neu-shadow-raised-sm)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                  }}
                                  title="Edit Attendance Log"
                                >
                                  <Edit size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(log)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-danger)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderRadius: 'var(--border-radius-sm)',
                                    boxShadow: 'var(--neu-shadow-raised-sm)',
                                    transition: 'all var(--transition-fast)',
                                    outline: 'none',
                                    opacity: 0.85
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--neu-shadow-pressed-sm)';
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.opacity = 1;
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--neu-shadow-raised-sm)';
                                    e.currentTarget.style.color = 'var(--color-danger)';
                                    e.currentTarget.style.opacity = 0.85;
                                  }}
                                  title="Delete Attendance Log"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}

                            {!isAdmin && (() => {
                              const remainingMs = getEditableTimeRemaining(log);
                              if (remainingMs > 0) {
                                return (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSelfEditModal(log)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-primary)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '8px',
                                        borderRadius: 'var(--border-radius-sm)',
                                        boxShadow: 'var(--neu-shadow-raised-sm)',
                                        transition: 'all var(--transition-fast)',
                                        outline: 'none'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--neu-shadow-pressed-sm)'}
                                      onMouseOut={(e) => e.currentTarget.style.boxShadow = 'var(--neu-shadow-raised-sm)'}
                                      title="Self Correct Attendance Log"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600, fontFamily: 'monospace' }}>
                                      Editable for {formatCountdown(remainingMs)}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="mobile-cards-container">
              {currentLogs.map((log) => (
                <NeuCard 
                  key={log.id || `${log.userId}_${log.date}`} 
                  variant="raised" 
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatDateLabel(log.date)}
                    </span>
                    <NeuBadge variant={log.status}>{log.status}</NeuBadge>
                  </div>
                   {(isAdmin || isStaff) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Staff Name:</span>
                      <span style={{ fontWeight: 600 }}>{staffNameMap[log.userId] || 'Unknown User'}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr', 
                    gap: '12px', 
                    fontSize: '0.85rem', 
                    borderTop: (isAdmin || isStaff) ? 'none' : '1px solid var(--border-color)', 
                    paddingTop: (isAdmin || isStaff) ? '0' : '10px' 
                  }}>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Check-In</span>
                      <span style={{ fontWeight: 600 }}>{formatTime(log.checkIn)}</span>
                    </div>
                  </div>
                  {(isAdmin || (!isAdmin && getEditableTimeRemaining(log) > 0)) && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--text-muted)', 
                      borderTop: '1px dotted var(--border-color)', 
                      paddingTop: '8px', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      {isAdmin ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Marked By:</span>
                            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {log.markedBy || 'manual'}
                            </span>
                            {log.lastEditedBy && (
                              <span 
                                style={{ 
                                  padding: '1px 4px', 
                                  borderRadius: '3px', 
                                  fontSize: '0.6rem', 
                                  fontWeight: 700, 
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                  color: '#3b82f6',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  marginLeft: '4px'
                                }}
                                title="Manually adjusted by Admin"
                              >
                                Edited
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <NeuButton 
                              onClick={() => handleOpenEditModal(log)} 
                              style={{ 
                                padding: '4px 10px', 
                                fontSize: '0.75rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px' 
                              }}
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </NeuButton>
                            <NeuButton 
                              onClick={() => handleOpenDeleteModal(log)} 
                              style={{ 
                                padding: '4px 10px', 
                                fontSize: '0.75rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                color: 'var(--color-danger)'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </NeuButton>
                          </div>
                        </>
                      ) : (() => {
                        const remainingMs = getEditableTimeRemaining(log);
                        if (remainingMs > 0) {
                          return (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600, fontFamily: 'monospace' }}>
                                Editable for {formatCountdown(remainingMs)}
                              </span>
                              <NeuButton 
                                onClick={() => handleOpenSelfEditModal(log)} 
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '0.75rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px' 
                                }}
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </NeuButton>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </NeuCard>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
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
          </>
        )}
      </div>
    );
  };

  // SUB-RENDER: Calendar Month Grid View
  const renderCalendarView = () => {
    if (statsLoading) {
      return (
        <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ height: '32px', width: '30%', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{ height: '80px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out', boxShadow: 'var(--neu-shadow-pressed-sm)' }} />
            ))}
          </div>
        </NeuCard>
      );
    }
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];
    // 1. Prev month days padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({ day: daysInPrevMonth - i, current: false });
    }
    // 2. Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({ day: i, current: true });
    }
    // 3. Next month days padding
    const remainingSlots = 42 - grid.length;
    for (let i = 1; i <= remainingSlots; i++) {
      grid.push({ day: i, current: false });
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Calendar Navigation header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              {calendarMonths[month]} {year}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Click any calendar day to inspect attendance logs details.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <NeuButton onClick={handlePrevCalendarMonth} style={{ padding: '10px' }}>
              <ChevronLeft size={18} />
            </NeuButton>
            <NeuButton onClick={handleNextCalendarMonth} style={{ padding: '10px' }}>
              <ChevronRight size={18} />
            </NeuButton>
          </div>
        </div>

        {/* Weekday Names row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {weekdays.map((wd, idx) => (
            <div key={idx} style={{ padding: '10px 0' }}>{wd}</div>
          ))}
        </div>

        {/* 42 grid cells */}
        <div className="calendar-days-grid">
          {grid.map((cell, idx) => {
            const cellDateStr = getCellDateString(cell.day, cell.current);
            const isToday = cellDateStr === getTodayDateString();
            
            // Check status indicator dots for this day
            const dayLogs = cellDateStr ? rawLogs.filter(log => log.date === cellDateStr) : [];
            let hasPresent = false;
            let hasLate = false;
            let hasAbsent = false;

            if (cellDateStr) {
              if (isAdmin) {
                hasPresent = dayLogs.some(l => l.status === 'present');
                hasLate = dayLogs.some(l => l.status === 'late');
                hasAbsent = dayLogs.some(l => l.status === 'absent');
              } else {
                const userLog = dayLogs[0];
                if (userLog) {
                  if (userLog.status === 'present') hasPresent = true;
                  else if (userLog.status === 'late') hasLate = true;
                  else if (userLog.status === 'absent') hasAbsent = true;
                }
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.current}
                onClick={() => {
                  setSelectedCalendarDay(cellDateStr);
                  setIsCalendarModalOpen(true);
                }}
                className="calendar-day-btn"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  boxShadow: isToday ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                  padding: '20px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '90px',
                  cursor: cell.current ? 'pointer' : 'default',
                  opacity: cell.current ? 1 : 0.35,
                  outline: 'none',
                  transition: 'transform var(--transition-fast), background-color var(--transition-fast)'
                }}
                onMouseOver={(e) => {
                  if (cell.current) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                  }
                }}
                onMouseOut={(e) => {
                  if (cell.current) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  }
                }}
              >
                {/* Day Number */}
                <span className="calendar-day-num" style={{
                  fontSize: '1rem',
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'var(--color-primary)' : 'var(--text-primary)'
                }}>
                  {cell.day}
                </span>

                {/* Status indicator dots */}
                <div style={{ display: 'flex', gap: '4px', height: '6px', marginTop: '8px' }}>
                  {hasPresent && (
                    <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} />
                  )}
                  {hasLate && (
                    <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning)', boxShadow: '0 0 6px var(--color-warning)' }} />
                  )}
                  {hasAbsent && (
                    <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger)', boxShadow: '0 0 6px var(--color-danger)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </NeuCard>
    );
  };

  // Helper template for clean empty state rendering
  function renderEmptyState() {
    return (
      <NeuCard variant="raised" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <FileText size={48} style={{ strokeWidth: 1.5, color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
          No Attendance Logs Found
        </h4>
        <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
          There are no attendance records registered for this period. Try updating your filters.
        </p>
      </NeuCard>
    );
  }

  // CSV Export Engine
  const handleExportCSV = () => {
    let dataToExport = [...filteredLogsList];
    if (!isAdmin) {
      dataToExport = dataToExport.filter(log => log.userId === currentUser.uid);
    }

    const headers = isAdmin
      ? ['Staff Name', 'Date', 'Check-In', 'Status', 'Marked By']
      : ['Date', 'Check-In', 'Status'];

    const csvRows = [];
    csvRows.push(headers.join(','));

    dataToExport.forEach(log => {
      const row = [];
      if (isAdmin) {
        row.push(`"${staffNameMap[log.userId] || 'Unknown User'}"`);
      }
      row.push(`"${formatDateLabel(log.date)}"`);
      row.push(`"${formatTime(log.checkIn)}"`);
      row.push(`"${log.status}"`);
      if (isAdmin) {
        row.push(`"${log.markedBy || 'manual'}"`);
      }
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Engine (Print-optimized HTML window)
  const handleExportPDF = () => {
    let dataToExport = [...filteredLogsList];
    if (!isAdmin) {
      dataToExport = dataToExport.filter(log => log.userId === currentUser.uid);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is enabled. Please allow pop-ups to export as PDF.');
      return;
    }

    const dateRangeStr = `${formatDateLabel(filterFrom)} to ${formatDateLabel(filterTo)}`;
    const filterSummary = `
      <strong>Date Range:</strong> ${dateRangeStr}<br/>
      <strong>Export Scope:</strong> ${isAdmin ? (selectedStaff ? `Staff Member - ${selectedStaff.name}` : 'All Staff Members') : 'Personal Logs'}<br/>
      <strong>Status Filters:</strong> ${selectedStatuses.join(', ')}
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Brain Stormers Attendance Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
            h1 { font-size: 24px; font-weight: 700; margin-bottom: 5px; color: #0f172a; }
            .subtitle { font-size: 14px; color: #475569; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
            .summary { font-size: 13px; margin-bottom: 30px; color: #334155; line-height: 1.6; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; background-color: #f8fafc; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px 14px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; color: #1e293b; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .status-badge { font-weight: 600; font-size: 12px; text-transform: capitalize; }
            .footer { margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <!-- Print Trigger Header (hidden in final print layout) -->
          <div class="no-print" style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 18px; font-size: 13px; font-weight: 600; font-family: inherit; background-color: #0f172a; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              Print Report
            </button>
          </div>

          <h1>Brain Stormers Coaching Center</h1>
          <div class="subtitle">Staff Attendance Report</div>
          
          <div class="summary">
            ${filterSummary}
            <strong>Exported On:</strong> ${new Date().toLocaleString('en-US')}<br/>
            <strong>Total Logs:</strong> ${dataToExport.length}
          </div>

          <table>
            <thead>
              <tr>
                ${isAdmin ? '<th>Staff Name</th>' : ''}
                <th>Date</th>
                <th>Check-In</th>
                <th>Status</th>
                ${isAdmin ? '<th>Marked By</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${dataToExport.map(log => `
                <tr>
                  ${isAdmin ? `<td>${staffNameMap[log.userId] || 'Unknown User'}</td>` : ''}
                  <td>${formatDateLabel(log.date)}</td>
                  <td>${formatTime(log.checkIn)}</td>
                  <td><span class="status-badge">${log.status}</span></td>
                  ${isAdmin ? `<td>${log.markedBy || 'manual'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Brain Stormers Attendance Management System</span>
            <span>Generated: ${new Date().toISOString()}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get active month scope based on date filters (Admin Only)
  const getSelectedMonthScope = () => {
    if (filterFrom && filterTo) {
      const fromParts = filterFrom.split('-');
      const toParts = filterTo.split('-');
      if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1]) {
        return {
          year: parseInt(fromParts[0], 10),
          month: parseInt(fromParts[1], 10) - 1,
          label: `${calendarMonths[parseInt(fromParts[1], 10) - 1]} ${fromParts[0]}`
        };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      label: `${calendarMonths[today.getMonth()]} ${today.getFullYear()}`
    };
  };

  // Get working days in the month (Admin Only)
  const getWorkingDaysForMonth = (year, month) => {
    const today = new Date();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    let limitDay = lastDay;
    if (year === today.getFullYear() && month === today.getMonth()) {
      limitDay = today.getDate();
    }

    let count = 0;
    for (let d = 1; d <= limitDay; d++) {
      const date = new Date(year, month, d);
      if (date.getDay() !== 5) { // non-Friday
        count++;
      }
    }
    return count;
  };

  // Get working days in the year (Admin Only)
  const getWorkingDaysForYear = (year) => {
    const today = new Date();
    const isCurrentYear = year === today.getFullYear();
    
    const endDay = isCurrentYear ? today : new Date(year, 11, 31);
    const startDay = new Date(year, 0, 1);
    
    let count = 0;
    let current = new Date(startDay.getTime());
    while (current <= endDay) {
      if (current.getDay() !== 5) { // non-Friday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Calculate monthly/yearly summary metrics for active staff roster
  const getMonthlySummaryRoster = () => {
    if (!(isAdmin || isStaff)) return [];
    
    const scope = getSelectedMonthScope();
    const mWorkingDays = getWorkingDaysForMonth(scope.year, scope.month);
    const yWorkingDays = getWorkingDaysForYear(scope.year);
    
    const mPrefix = `${scope.year}-${String(scope.month + 1).padStart(2, '0')}`;
    const yPrefix = `${scope.year}`;

    const roster = rawStaffList.map(staff => {
      // Monthly Logs
      const mLogs = rawLogs.filter(log => 
        log.userId === staff.uid && 
        log.date.startsWith(mPrefix)
      );

      // Yearly Logs
      const yLogs = rawLogs.filter(log => 
        log.userId === staff.uid && 
        log.date.startsWith(yPrefix)
      );

      const mPresent = mLogs.filter(log => log.status === 'present' || log.status === 'late').length;
      const mLate = mLogs.filter(log => log.status === 'late').length;
      const mAbsent = Math.max(0, mWorkingDays - mPresent);
      const mPct = mWorkingDays > 0 ? Math.round((mPresent / mWorkingDays) * 100) : 0;

      const yPresent = yLogs.filter(log => log.status === 'present' || log.status === 'late').length;
      const yLate = yLogs.filter(log => log.status === 'late').length;
      const yAbsent = Math.max(0, yWorkingDays - yPresent);
      const yPct = yWorkingDays > 0 ? Math.round((yPresent / yWorkingDays) * 100) : 0;

      return {
        uid: staff.uid,
        name: staff.name,
        username: staff.username,
        // Monthly Metrics
        mPresent,
        mAbsent,
        mLate,
        mPct,
        // Yearly Metrics
        yPresent,
        yAbsent,
        yLate,
        yPct,
        // Legacy fallback properties for sorting
        present: summaryViewScope === 'Yearly' ? yPresent : mPresent,
        absent: summaryViewScope === 'Yearly' ? yAbsent : mAbsent,
        late: summaryViewScope === 'Yearly' ? yLate : mLate,
        pct: summaryViewScope === 'Yearly' ? yPct : mPct
      };
    });

    roster.sort((a, b) => {
      let field = summarySortField;
      
      // Fallback mappings if sorting field is legacy and we are in Both mode
      if (summaryViewScope === 'Both') {
        if (field === 'pct') field = 'mPct';
        if (field === 'present') field = 'mPresent';
        if (field === 'absent') field = 'mAbsent';
        if (field === 'late') field = 'mLate';
      }

      let valA = a[field] !== undefined ? a[field] : a['pct'];
      let valB = b[field] !== undefined ? b[field] : b['pct'];
      
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return summarySortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return summarySortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return roster;
  };

  // Handle click on summary table sorting header columns
  const handleSortSummary = (field) => {
    if (summarySortField === field) {
      setSummarySortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSummarySortField(field);
      setSummarySortOrder('desc');
    }
  };

  // Render sort arrows
  const renderSortArrow = (field) => {
    if (summarySortField !== field) return null;
    return summarySortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  // SUB-RENDER: Monthly summary table card
  const renderMonthlySummaryTable = () => {
    if (!(isAdmin || isStaff)) return null;
    if (statsLoading) {
      return (
        <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
          <div className="shimmer-block" style={{ height: '24px', width: '40%', borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer-block" style={{ height: '20px', borderRadius: '4px' }} />
            ))}
          </div>
        </NeuCard>
      );
    }

    const scope = getSelectedMonthScope();
    const roster = getMonthlySummaryRoster();

    return (
      <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              {summaryViewScope === 'Monthly' && `Monthly Attendance Summary (${scope.label})`}
              {summaryViewScope === 'Yearly' && `Yearly Attendance Summary (${scope.year})`}
              {summaryViewScope === 'Both' && `Year-to-Date Attendance Summary (${scope.year})`}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Click table headers to sort staff by attendance metrics.
            </p>
          </div>
          <NeuSegmentedControl
            options={['Monthly', 'Yearly', 'Both']}
            selectedValue={summaryViewScope}
            onChange={setSummaryViewScope}
          />
        </div>

        {roster.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            No staff records found.
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="desktop-table-container">
              {summaryViewScope !== 'Both' ? (
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortSummary('name')}>
                        Staff Member{renderSortArrow('name')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary(summaryViewScope === 'Yearly' ? 'yPresent' : 'present')}>
                        Present Days{renderSortArrow(summaryViewScope === 'Yearly' ? 'yPresent' : 'present')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary(summaryViewScope === 'Yearly' ? 'yAbsent' : 'absent')}>
                        Absent Days{renderSortArrow(summaryViewScope === 'Yearly' ? 'yAbsent' : 'absent')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary(summaryViewScope === 'Yearly' ? 'yLate' : 'late')}>
                        Late Days{renderSortArrow(summaryViewScope === 'Yearly' ? 'yLate' : 'late')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary(summaryViewScope === 'Yearly' ? 'yPct' : 'pct')}>
                        Attendance %{renderSortArrow(summaryViewScope === 'Yearly' ? 'yPct' : 'pct')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(row => {
                      const pct = summaryViewScope === 'Yearly' ? row.yPct : row.mPct;
                      const present = summaryViewScope === 'Yearly' ? row.yPresent : row.mPresent;
                      const absent = summaryViewScope === 'Yearly' ? row.yAbsent : row.mAbsent;
                      const late = summaryViewScope === 'Yearly' ? row.yLate : row.mLate;
                      return (
                        <tr key={row.uid}>
                          <td style={{ fontWeight: 600 }}>
                            {row.name} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>@{row.username}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 500 }}>{present}</td>
                          <td style={{ textAlign: 'center', fontWeight: 500 }}>{absent}</td>
                          <td style={{ textAlign: 'center', fontWeight: 500 }}>{late}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 700,
                              color: pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                            }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="neu-table" style={{ borderSpacing: '0 8px' }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ cursor: 'pointer', verticalAlign: 'middle' }} onClick={() => handleSortSummary('name')}>
                        Staff Member{renderSortArrow('name')}
                      </th>
                      <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 600 }}>
                        Monthly Summary ({scope.label})
                      </th>
                      <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 600 }}>
                        Yearly Summary ({scope.year})
                      </th>
                    </tr>
                    <tr>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('mPresent')}>
                        P{renderSortArrow('mPresent')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('mAbsent')}>
                        A{renderSortArrow('mAbsent')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('mLate')}>
                        L{renderSortArrow('mLate')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('mPct')}>
                        %{renderSortArrow('mPct')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('yPresent')}>
                        P{renderSortArrow('yPresent')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('yAbsent')}>
                        A{renderSortArrow('yAbsent')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('yLate')}>
                        L{renderSortArrow('yLate')}
                      </th>
                      <th style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '8px' }} onClick={() => handleSortSummary('yPct')}>
                        %{renderSortArrow('yPct')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(row => (
                      <tr key={row.uid}>
                        <td style={{ fontWeight: 600 }}>
                          {row.name} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>@{row.username}</span>
                        </td>
                        {/* Monthly cols */}
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>{row.mPresent}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>{row.mAbsent}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>{row.mLate}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: row.mPct >= 90 ? 'var(--color-success)' : row.mPct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}>
                            {row.mPct}%
                          </span>
                        </td>
                        {/* Yearly cols */}
                        <td style={{ textAlign: 'center', padding: '12px 8px', borderLeft: '1px dotted var(--border-color)' }}>{row.yPresent}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>{row.yAbsent}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>{row.yLate}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: row.yPct >= 90 ? 'var(--color-success)' : row.yPct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}>
                            {row.yPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile View Stacked Cards */}
            <div className="mobile-cards-container">
              {roster.map(row => {
                const pct = summaryViewScope === 'Yearly' ? row.yPct : row.mPct;
                return (
                  <NeuCard key={row.uid} variant="raised" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block' }}>{row.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{row.username}</span>
                      </div>
                      {summaryViewScope !== 'Both' && (
                        <span style={{
                          fontWeight: 700,
                          color: pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {pct}%
                        </span>
                      )}
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
                    
                    {summaryViewScope === 'Both' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Monthly ({scope.label})</span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>P: <strong>{row.mPresent}</strong> | A: <strong>{row.mAbsent}</strong> | L: <strong>{row.mLate}</strong></span>
                            <span style={{ fontWeight: 700, color: row.mPct >= 90 ? 'var(--color-success)' : row.mPct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{row.mPct}%</span>
                          </div>
                        </div>
                        <div style={{ height: '1px', borderTop: '1px dotted var(--border-color)' }} />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Yearly ({scope.year})</span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>P: <strong>{row.yPresent}</strong> | A: <strong>{row.yAbsent}</strong> | L: <strong>{row.yLate}</strong></span>
                            <span style={{ fontWeight: 700, color: row.yPct >= 90 ? 'var(--color-success)' : row.yPct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{row.yPct}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem', textAlign: 'center' }}>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Present</span>
                          <span style={{ fontWeight: 600 }}>{summaryViewScope === 'Yearly' ? row.yPresent : row.mPresent}</span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Absent</span>
                          <span style={{ fontWeight: 600 }}>{summaryViewScope === 'Yearly' ? row.yAbsent : row.mAbsent}</span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Late</span>
                          <span style={{ fontWeight: 600 }}>{summaryViewScope === 'Yearly' ? row.yLate : row.mLate}</span>
                        </div>
                      </div>
                    )}
                  </NeuCard>
                );
              })}
            </div>
          </>
        )}
      </NeuCard>
    );
  };

  // Profiles Mode Helpers & Stats calculations
  const getIndividualStats = (staffUid) => {
    const workingDays = getWorkingDaysInRange(filterFrom, filterTo);
    const logs = rawLogs.filter(log => 
      log.userId === staffUid && 
      log.date >= filterFrom && 
      log.date <= filterTo
    );
    const present = logs.filter(log => log.status === 'present' || log.status === 'late').length;
    const late = logs.filter(log => log.status === 'late').length;
    const absent = Math.max(0, workingDays - present);
    const pct = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
    
    return { present, absent, late, pct, logs };
  };

  const renderIndividualCalendarGrid = (staffUid) => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({ day: daysInPrevMonth - i, current: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({ day: i, current: true });
    }
    const remainingSlots = 42 - grid.length;
    for (let i = 1; i <= remainingSlots; i++) {
      grid.push({ day: i, current: false });
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Weekday Names row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {weekdays.map((wd, idx) => (
            <div key={idx} style={{ padding: '4px 0' }}>{wd}</div>
          ))}
        </div>

        {/* 42 grid cells */}
        <div className="calendar-days-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {grid.map((cell, idx) => {
            const cellDateStr = getCellDateString(cell.day, cell.current);
            const isToday = cellDateStr === getTodayDateString();
            
            // Check status indicator dots for this day for this specific staff member
            const dayLogs = cellDateStr ? rawLogs.filter(log => log.date === cellDateStr && log.userId === staffUid) : [];
            let hasPresent = false;
            let hasLate = false;
            let hasAbsent = false;

            if (cellDateStr) {
              const userLog = dayLogs[0];
              if (userLog) {
                if (userLog.status === 'present') hasPresent = true;
                else if (userLog.status === 'late') hasLate = true;
                else if (userLog.status === 'absent') hasAbsent = true;
              } else if (cell.current) {
                const cellDate = new Date(year, month, cell.day);
                const today = new Date();
                today.setHours(0,0,0,0);
                if (cellDate < today && cellDate.getDay() !== 5) {
                  hasAbsent = true;
                }
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.current}
                onClick={() => {
                  setSelectedCalendarDay(cellDateStr);
                  setIsCalendarModalOpen(true);
                }}
                className="calendar-day-btn"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  boxShadow: isToday ? 'var(--neu-shadow-pressed-sm)' : 'var(--neu-shadow-raised-sm)',
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '75px',
                  cursor: cell.current ? 'pointer' : 'default',
                  opacity: cell.current ? 1 : 0.35,
                  outline: 'none',
                  transition: 'transform var(--transition-fast), background-color var(--transition-fast)'
                }}
                onMouseOver={(e) => {
                  if (cell.current) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                  }
                }}
                onMouseOut={(e) => {
                  if (cell.current) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  }
                }}
              >
                <span className="calendar-day-num" style={{ fontSize: '0.95rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                  {cell.day}
                </span>
                
                {/* Dots row */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', height: '6px', marginTop: '6px' }}>
                  {hasPresent && <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} title="Present" />}
                  {hasLate && <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning)', boxShadow: '0 0 6px var(--color-warning)' }} title="Late" />}
                  {hasAbsent && <span className="calendar-day-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger)', boxShadow: '0 0 6px var(--color-danger)' }} title="Absent" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStaffProfilesGrid = () => {
    const filteredStaff = rawStaffList.filter(staff => {
      const query = profileSearchQuery.toLowerCase().trim();
      return (
        (staff.name || '').toLowerCase().includes(query) ||
        (staff.username || '').toLowerCase().includes(query) ||
        (staff.phone || '').toLowerCase().includes(query)
      );
    });

    return (
      <div className="profile-animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Staff Profiles
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Select any staff member to view their complete attendance history logs.
            </p>
          </div>
          {rawStaffList.length > 0 && (
            <div ref={profileSearchDropdownRef} style={{ width: '100%', maxWidth: '300px', position: 'relative' }}>
              <NeuInput
                type="text"
                placeholder="Search staff..."
                value={profileSearchQuery}
                onChange={(e) => {
                  setProfileSearchQuery(e.target.value);
                  setIsProfileDropdownOpen(true);
                }}
                onFocus={() => setIsProfileDropdownOpen(true)}
                icon={Search}
                style={{ margin: 0 }}
              />
              {profileSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileSearchQuery('');
                    setIsProfileDropdownOpen(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 10
                  }}
                >
                  <X size={16} />
                </button>
              )}
              {isProfileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '52px',
                  left: 0,
                  right: 0,
                  zIndex: 1010,
                }}>
                  <NeuCard variant="raised" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {filteredStaff.length === 0 ? (
                      <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No matching staff found
                      </div>
                    ) : (
                      filteredStaff.map(staff => (
                        <button
                          key={staff.uid}
                          type="button"
                          onClick={() => {
                            setSelectedProfileStaff(staff);
                            setIsProfileDropdownOpen(false);
                            setProfileSearchQuery('');
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--border-radius-sm)',
                            textAlign: 'left',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'background-color var(--transition-fast)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {staff.name} (@{staff.username})
                        </button>
                      ))
                    )}
                  </NeuCard>
                </div>
              )}
            </div>
          )}
        </div>

        {rawStaffList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            No registered staff members found.
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            No staff profiles match "{profileSearchQuery}".
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '24px' 
          }}>
            {filteredStaff.map(staff => {
              const { pct } = getIndividualStats(staff.uid);
              return (
                <NeuCard 
                  key={staff.uid}
                  variant="raised" 
                  onClick={() => setSelectedProfileStaff(staff)}
                  style={{ 
                    padding: '28px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Initials Avatar */}
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    boxShadow: 'var(--neu-shadow-pressed-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    marginBottom: '16px'
                  }}>
                    {staff.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name and Username */}
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                    {staff.name}
                  </h4>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    padding: '2px 8px',
                    borderRadius: 'var(--border-radius-full)',
                    boxShadow: 'var(--neu-shadow-pressed-sm)',
                    marginBottom: '16px'
                  }}>
                    @{staff.username}
                  </span>

                  <div style={{ 
                    width: '100%', 
                    height: '1px', 
                    backgroundColor: 'var(--border-color)', 
                    margin: '12px 0' 
                  }} />

                  {/* Contact info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span>📞 {staff.phone || 'No phone number'}</span>
                    <span>Joined {formatDateLabel(staff.joinDate ? `${new Date(staff.joinDate.seconds * 1000).toISOString().split('T')[0]}` : '')}</span>
                  </div>

                  {/* Period Stats Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Attendance:</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                    }}>
                      {pct}%
                    </span>
                  </div>
                </NeuCard>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderIndividualHistoryView = () => {
    if (!selectedProfileStaff) return null;
    
    const staff = selectedProfileStaff;
    const { present, absent, late, pct, logs } = getIndividualStats(staff.uid);
    const scope = getSelectedMonthScope();

    // Sort logs descending
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="profile-animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Back Button and Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <NeuButton 
            onClick={() => setSelectedProfileStaff(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ChevronLeft size={18} />
            <span>Back to Profiles</span>
          </NeuButton>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {staff.name}'s History
          </h2>
        </div>

        {/* Profile Details & Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {/* Card 1: Attendance Rate */}
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
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Monthly Attendance</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{pct}%</h3>
            </div>
          </NeuCard>

          {/* Card 2: Present Days */}
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
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Present Days</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{present} Days</h3>
            </div>
          </NeuCard>

          {/* Card 3: Late Days */}
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
              color: 'var(--color-warning)'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Late Days</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{late} Days</h3>
            </div>
          </NeuCard>

          {/* Card 4: Absent Days */}
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
              color: 'var(--color-danger)'
            }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Absent Days</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{absent} Days</h3>
            </div>
          </NeuCard>
        </div>

        {/* History Details and Personal Calendar View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Left card: History Table */}
          <NeuCard variant="raised" style={{ padding: '32px', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Logs ({scope.label})</span>
            </h3>

            {sortedLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                No attendance logs found for this period.
              </div>
            ) : (
              <div className="desktop-table-container">
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Status</th>
                      <th>Marked By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLogs.map((log) => (
                      <tr key={log.id || `${log.userId}_${log.date}`}>
                        <td style={{ fontWeight: 500 }}>{formatDateLabel(log.date)}</td>
                        <td>{formatTime(log.checkIn)}</td>
                        <td>
                          <NeuBadge variant={log.status}>{log.status}</NeuBadge>
                        </td>
                        <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {log.markedBy || 'manual'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeuCard>

          {/* Right card: Personal Month Calendar Grid */}
          <NeuCard variant="raised" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Calendar View</span>
              </h3>
              {/* Calendar Navigator controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <NeuButton onClick={handlePrevCalendarMonth} style={{ padding: '8px' }}>
                  <ChevronLeft size={16} />
                </NeuButton>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', minWidth: '110px', justifyContent: 'center' }}>
                  {calendarMonths[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                </span>
                <NeuButton onClick={handleNextCalendarMonth} style={{ padding: '8px' }}>
                  <ChevronRight size={16} />
                </NeuButton>
              </div>
            </div>
            
            {/* Render Calendar Day Grid filtered for this individual */}
            {renderIndividualCalendarGrid(staff.uid)}
          </NeuCard>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Custom Stylesheet adding pulse animations and Separated Neumorphic Table rows */}
      <style>{`
        @keyframes shimmer-sweep {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .shimmer-block {
          background: linear-gradient(
            90deg,
            var(--bg-surface-elevated) 25%,
            rgba(99, 102, 241, 0.05) 50%,
            var(--bg-surface-elevated) 75%
          );
          background-size: 200% 100%;
          animation: shimmer-sweep 1.8s infinite linear;
          box-shadow: inset -1px -1px 3px var(--color-shadow-light), inset 1px 1px 3px var(--color-shadow-dark);
        }

        .neu-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 12px;
          text-align: left;
        }

        .neu-table th {
          padding: 12px 20px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
        }

        .neu-table td {
          padding: 16px 20px;
          background: var(--bg-surface);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          transition: background-color var(--transition-normal);
        }

        .neu-table tr:hover td {
          background: var(--bg-surface-elevated);
        }

        .neu-table td:first-child {
          border-left: 1px solid var(--border-color);
          border-top-left-radius: var(--border-radius-sm);
          border-bottom-left-radius: var(--border-radius-sm);
        }

        .neu-table td:last-child {
          border-right: 1px solid var(--border-color);
          border-top-right-radius: var(--border-radius-sm);
          border-bottom-right-radius: var(--border-radius-sm);
        }

        .desktop-table-container {
          display: block;
          overflow-x: auto;
        }

        .mobile-cards-container {
          display: none;
        }

        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 16px;
          justify-items: stretch;
          align-items: stretch;
        }

        @media (max-width: 767px) {
          .desktop-table-container {
            display: none;
          }
          .mobile-cards-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .calendar-days-grid {
            gap: 8px;
          }
          .calendar-day-btn {
            min-height: 65px !important;
            padding: 10px 4px !important;
          }
          .calendar-day-num {
            font-size: 0.85rem !important;
          }
          .calendar-day-dot {
            width: 4px !important;
            height: 4px !important;
          }
        }

        @keyframes slideDownFadeIn {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleUpFadeIn {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .profile-animate-fade {
          animation: scaleUpFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* High-contrast styles for the Profiles Mode Toggle */
        .profiles-toggle-custom {
          padding: 8px 16px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-surface);
          box-shadow: var(--neu-shadow-raised-sm);
          transition: all var(--transition-normal);
        }
        .profiles-toggle-custom:hover {
          border-color: var(--border-color-focus);
          box-shadow: var(--neu-shadow-raised-md);
        }
        .profiles-toggle-custom .neu-toggle-track {
          background: rgba(148, 163, 184, 0.1) !important;
          border-color: var(--border-color) !important;
        }
        .profiles-toggle-custom.neu-toggle-active {
          border-color: var(--color-primary-glow) !important;
          box-shadow: var(--neu-shadow-pressed-sm), 0 0 10px rgba(99, 102, 241, 0.1) !important;
        }
        .profiles-toggle-custom.neu-toggle-active .neu-toggle-track {
          background: rgba(99, 102, 241, 0.15) !important;
          border-color: var(--color-primary) !important;
        }
      `}</style>

      {/* Title Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
            Staff Attendance
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {dataScopeLabel} — Logged in as <span style={{ color: 'var(--color-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{userProfile.role}</span>
          </p>
        </div>

        {/* View Switcher and Actions container */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle for Profiles Mode */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            <NeuToggle
              label="Profiles Mode"
              className="profiles-toggle-custom"
              checked={showStaffProfilesView}
              onChange={(val) => {
                setShowStaffProfilesView(val);
                setSelectedProfileStaff(null);
              }}
            />
          </div>

          {!showStaffProfilesView && (
            <NeuSegmentedControl
              options={['Cards + Table', 'Table Only', 'Calendar View']}
              selectedValue={viewMode}
              onChange={handleViewModeChange}
            />
          )}

          {/* Actions Container - Visible to Admin and Staff */}
          {(isAdmin || isStaff) && !showStaffProfilesView && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <NeuButton 
                onClick={handleOpenManualRecordModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} />
                <span>Add Manual Record</span>
              </NeuButton>
            </div>
          )}
        </div>
      </div>

      {/* Info Card explaining the current state */}
      {!showStaffProfilesView && (
        <NeuCard variant="raised" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            Module Overview
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            This page serves as the entry point for staff attendance logging and history tracking. 
            Use the filter bar below to refine records. Statistics and logs will update dynamically.
          </p>
        </NeuCard>
      )}

      {/* Global stats error block */}
      {statsError && (
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
          <span>{statsError}</span>
        </div>
      )}

      {/* Content Render Driven by Profiles Mode Toggle and View Switcher states */}
      {showStaffProfilesView ? (
        <div className="profile-animate-fade" style={{ position: 'relative' }}>
          {selectedProfileStaff ? renderIndividualHistoryView() : renderStaffProfilesGrid()}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          
          {/* VIEW 1: Cards + Table */}
          {viewMode === 'Cards + Table' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {renderSummaryCards()}
              {renderFilterBar()}
              {renderLogsSection()}
            </div>
          )}

          {/* VIEW 2: Table Only */}
          {viewMode === 'Table Only' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {renderFilterBar()}
              {renderLogsSection()}
            </div>
          )}

          {/* VIEW 3: Calendar View */}
          {viewMode === 'Calendar View' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {renderCalendarView()}
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary Table (Admin Only) */}
      {!showStaffProfilesView && renderMonthlySummaryTable()}

      {/* Calendar Popup Day Details Modal */}
      {isCalendarModalOpen && selectedCalendarDay && (
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
        }}>
          <NeuCard
            variant="raised"
            style={{
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close trigger button */}
            <button 
              onClick={() => setIsCalendarModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                {(isAdmin || isStaff) ? 'Staff Attendance Details' : 'My Attendance Details'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Date: {formatDateLabel(selectedCalendarDay)}
              </p>
            </div>

            {/* Modal Body scrollable list */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {(isAdmin || isStaff) ? (
                rawStaffList.map(staff => {
                  const staffLog = rawLogs.find(l => l.date === selectedCalendarDay && l.userId === staff.uid);
                  return (
                    <div 
                      key={staff.uid} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        background: 'var(--bg-surface-elevated)', 
                        borderRadius: 'var(--border-radius-sm)', 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      <div>
                        <h5 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {staff.name}
                        </h5>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          @{staff.username}
                        </span>
                      </div>
                      
                      {staffLog ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                              const remainingMs = getEditableTimeRemaining(staffLog);
                              if (remainingMs > 0) {
                                return (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 600, fontFamily: 'monospace' }}>
                                      {formatCountdown(remainingMs)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCalendarModalOpen(false);
                                        handleOpenSelfEditModal(staffLog);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-primary)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '4px',
                                        borderRadius: 'var(--border-radius-sm)',
                                        boxShadow: 'var(--neu-shadow-raised-sm)',
                                        outline: 'none'
                                      }}
                                    >
                                      <Edit size={10} />
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <NeuBadge variant={staffLog.status}>{staffLog.status}</NeuBadge>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Entry: {formatTime(staffLog.checkIn)}
                          </span>
                        </div>
                      ) : (
                        <NeuBadge variant="absent">Absent</NeuBadge>
                      )}
                    </div>
                  );
                })
              ) : (
                (() => {
                  const myLog = rawLogs.find(l => l.date === selectedCalendarDay);
                  if (myLog) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 16px', 
                          background: 'var(--bg-surface-elevated)', 
                          borderRadius: 'var(--border-radius-sm)', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Status</span>
                          <NeuBadge variant={myLog.status}>{myLog.status}</NeuBadge>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                          <NeuCard variant="inset" style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check-In Time</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                              {formatTime(myLog.checkIn)}
                            </span>
                          </NeuCard>
                        </div>
                        {(() => {
                          const remainingMs = getEditableTimeRemaining(myLog);
                          if (remainingMs > 0) {
                            return (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600, fontFamily: 'monospace' }}>
                                  Editable for {formatCountdown(remainingMs)}
                                </span>
                                <NeuButton 
                                  onClick={() => {
                                    setIsCalendarModalOpen(false);
                                    handleOpenSelfEditModal(myLog);
                                  }} 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Edit size={12} />
                                  <span>Edit</span>
                                </NeuButton>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        No records logged for this day. (Status: Absent)
                      </div>
                    );
                  }
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
              <NeuButton onClick={() => setIsCalendarModalOpen(false)} variant="accent" style={{ padding: '10px 24px' }}>
                Close
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}

      {/* Manual Record Adjustment Form Modal (Sliding Right-Side Drawer) */}
      {isManualRecordModalOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'stretch',
            zIndex: 1100,
            animation: 'fadeIn 0.25s ease-out forwards'
          }}
        >
          {/* Embedded animations for drawer entry */}
          <style>{`
            @keyframes slideInFromRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          {manualSuccess ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: 'var(--bg-base)',
                borderLeft: '1px solid var(--border-color)',
                boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 32px',
                boxSizing: 'border-box',
                gap: '24px',
                textAlign: 'center',
                animation: 'slideInFromRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              {/* Success Checkmark Circle */}
              <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-elevated)',
                boxShadow: 'var(--neu-shadow-pressed-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-success)',
                animation: 'scaleUpAndGlow 0.5s ease-out forwards'
              }}>
                <CheckCircle2 size={54} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Adjustment Saved
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto' }}>
                  The manual attendance record adjustments have been saved, and an audit trail has been logged.
                </p>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: 'var(--bg-base)',
                borderLeft: '1px solid var(--border-color)',
                boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                padding: '40px 32px',
                boxSizing: 'border-box',
                overflowY: 'auto',
                animation: 'slideInFromRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              {/* Header with Close and Icon */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  boxShadow: 'var(--neu-shadow-pressed-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)'
                }}>
                  {manualModalMode === 'edit' ? <Edit size={24} /> : <Plus size={26} />}
                </div>
                <button 
                  onClick={() => setIsManualRecordModalOpen(false)}
                  disabled={manualSubmitting}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    boxShadow: 'var(--neu-shadow-raised-sm)',
                    transition: 'transform var(--transition-fast)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginBottom: '28px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {manualModalMode === 'edit' ? 'Edit Manual Record' : 'Add Manual Record'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {manualModalMode === 'edit' ? 'Correct times or status of the existing log.' : 'Override or log manual entry for staff members.'}
                </p>
              </div>

              <form onSubmit={handleCreateManualRecord} style={{ display: 'flex', flexDirection: 'column', gap: '22px', textAlign: 'left', flex: 1 }}>
                {/* Staff Selector */}
                {manualModalMode === 'edit' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="neu-input-label">Staff Member</label>
                    <NeuInput
                      value={manualStaff?.name || ''}
                      disabled={true}
                      style={{ margin: 0, opacity: 0.8, cursor: 'not-allowed' }}
                    />
                  </div>
                ) : (
                  /* Searchable Staff Selector */
                  <div ref={manualStaffDropdownRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="neu-input-label">Select Staff Member *</label>
                    <div style={{ position: 'relative' }}>
                      <NeuInput
                        placeholder="Type name or username..."
                        value={manualStaffSearch}
                        onChange={(e) => {
                          if (manualStaff) setManualStaff(null);
                          setManualStaffSearch(e.target.value);
                          setIsManualStaffDropdownOpen(true);
                        }}
                        onFocus={() => setIsManualStaffDropdownOpen(true)}
                        style={{ margin: 0 }}
                        disabled={manualSubmitting}
                      />
                      {manualStaff && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualStaff(null);
                            setManualStaffSearch('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                      {isManualStaffDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '52px',
                          left: 0,
                          right: 0,
                          zIndex: 1010,
                        }}>
                          <NeuCard variant="raised" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                            {matchedStaff.length === 0 ? (
                              <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                No active staff found
                              </div>
                            ) : (
                              matchedStaff.map(staff => (
                                <button
                                  key={staff.uid}
                                  type="button"
                                  onClick={() => handleSelectManualStaff(staff)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--border-radius-sm)',
                                    textAlign: 'left',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'background-color var(--transition-fast)'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  {staff.name} (@{staff.username})
                                </button>
                              ))
                            )}
                          </NeuCard>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Date Picker */}
                <NeuDatePicker
                  label={manualModalMode === 'edit' ? "Date" : "Date *"}
                  value={manualDate}
                  onChange={(val) => setManualDate(val)}
                  disabled={manualSubmitting || manualModalMode === 'edit'}
                />

                {/* Time Pickers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <NeuTimePicker
                    label="Check-In Time *"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    required
                    disabled={manualSubmitting}
                  />
                </div>

                {/* Status selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">Status *</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="neu-input"
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-raised-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                    required
                    disabled={manualSubmitting}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>

                {/* Justification Note */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">Reason / Justification *</label>
                  <textarea
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Provide a mandatory reason (e.g. fingerprint scanner failed, staff forgot to check in)"
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-raised-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    required
                    disabled={manualSubmitting}
                  />
                </div>

                {/* Inline Error Block */}
                {manualError && (
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
                    <span style={{ lineHeight: '1.4' }}>{manualError}</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px', paddingTop: '12px' }}>
                  <NeuButton
                    type="button"
                    onClick={() => setIsManualRecordModalOpen(false)}
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={manualSubmitting}
                  >
                    Cancel
                  </NeuButton>
                  <NeuButton
                    type="submit"
                    variant="accent"
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={manualSubmitting}
                  >
                    {manualSubmitting ? 'Saving...' : 'Save Record'}
                  </NeuButton>
                </div>
              </form>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Soft-Delete Confirmation Modal */}
      {isDeleteConfirmModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          {deleteSuccess ? (
            <NeuCard
              variant="raised"
              style={{
                width: '100%',
                maxWidth: '440px',
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                textAlign: 'center',
                alignItems: 'center',
                animation: 'scaleUpAndGlow 0.5s ease-out forwards'
              }}
            >
              {/* Success Checkmark Circle */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-elevated)',
                boxShadow: 'var(--neu-shadow-pressed-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-danger)',
              }}>
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                  Record Deleted
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  The attendance record has been soft-deleted and logged in the immutable audit trail.
                </p>
              </div>
            </NeuCard>
          ) : (
            <NeuCard
              variant="raised"
              style={{
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                textAlign: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsDeleteConfirmModalOpen(false)}
                disabled={deleteSubmitting}
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
                <X size={20} />
              </button>

              {/* Warning Trash Icon Circle */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-elevated)',
                boxShadow: 'var(--neu-shadow-pressed-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                color: 'var(--color-danger)'
              }}>
                <Trash2 size={28} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                  Confirm Soft Deletion
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  You are about to soft-delete the attendance record for:
                  <br />
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {deletingRecord ? staffNameMap[deletingRecord.userId] : 'Unknown'}
                  </strong> on <strong style={{ color: 'var(--text-primary)' }}>
                    {deletingRecord ? formatDateLabel(deletingRecord.date) : ''}
                  </strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmSoftDelete} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                {/* Deletion justification Note */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="neu-input-label">Reason for Deletion *</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Provide a mandatory reason explaining why this log is being soft-deleted (min 10 chars)..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: 'var(--neu-shadow-raised-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    required
                    disabled={deleteSubmitting}
                  />
                </div>

                {/* Inline error block */}
                {deleteError && (
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
                    <span style={{ lineHeight: '1.4' }}>{deleteError}</span>
                  </div>
                )}

                {/* Form Action buttons */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <NeuButton
                    type="button"
                    onClick={() => setIsDeleteConfirmModalOpen(false)}
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={deleteSubmitting}
                  >
                    Cancel
                  </NeuButton>
                  <NeuButton
                    type="submit"
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--color-danger)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      boxShadow: 'var(--neu-shadow-raised-sm)'
                    }}
                    disabled={deleteSubmitting}
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </NeuButton>
                </div>
              </form>
            </NeuCard>
          )}
        </div>,
        document.body
      )}

      {/* Self-Edit/Correction Modal */}
      {isSelfEditModalOpen && selfEditRecord && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <NeuCard
            variant="raised"
            style={{
              width: '100%',
              maxWidth: '440px',
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
              onClick={() => setIsSelfEditModalOpen(false)}
              disabled={selfEditSubmitting}
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
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                Self-Correct Record
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Quickly adjust your check-in time or status if you made an honest mistake.
              </p>
            </div>

            <form onSubmit={handleSaveSelfEdit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Staff Member Info (Non-editable) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="neu-input-label">Staff Member</span>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  {staffNameMap[selfEditRecord.userId] || 'Unknown User'}
                </div>
              </div>

              {/* Date (Non-editable) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="neu-input-label">Date</span>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  {formatDateLabel(selfEditRecord.date)}
                </div>
              </div>

              {/* Check-In Time (Editable) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="selfEditCheckInTime" className="neu-input-label">Check-In Time *</label>
                <input
                  id="selfEditCheckInTime"
                  type="time"
                  value={selfEditCheckIn}
                  onChange={(e) => setSelfEditCheckIn(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    boxShadow: 'var(--neu-shadow-raised-sm)',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status (Editable - Present/Late) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="neu-input-label">Status *</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="selfEditStatus"
                      value="present"
                      checked={selfEditStatus === 'present'}
                      onChange={() => setSelfEditStatus('present')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Present</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="selfEditStatus"
                      value="late"
                      checked={selfEditStatus === 'late'}
                      onChange={() => setSelfEditStatus('late')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Late</span>
                  </label>
                </div>
              </div>

              {/* Inline error block */}
              {selfEditError && (
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
                  <span style={{ lineHeight: '1.4' }}>{selfEditError}</span>
                </div>
              )}

              {/* Form Action buttons */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <NeuButton
                  type="button"
                  onClick={() => setIsSelfEditModalOpen(false)}
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={selfEditSubmitting}
                >
                  Cancel
                </NeuButton>
                <NeuButton
                  type="submit"
                  variant="accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={selfEditSubmitting}
                >
                  {selfEditSubmitting ? 'Saving...' : 'Save Changes'}
                </NeuButton>
              </div>
            </form>
          </NeuCard>
        </div>,
        document.body
      )}

    </div>
  );
}
