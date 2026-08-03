import React, { useState, useEffect, useRef } from 'react';
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
  X
} from 'lucide-react';
import NeuCard from '../../../shared/components/NeuCard.jsx';
import NeuButton from '../../../shared/components/NeuButton.jsx';
import NeuBadge from '../../../shared/components/NeuBadge.jsx';
import NeuDatePicker from '../../../shared/components/NeuDatePicker.jsx';
import NeuInput from '../../../shared/components/NeuInput.jsx';
import NeuSegmentedControl from '../../../shared/components/NeuSegmentedControl.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Loader from '../../../shared/components/Loader.jsx';
import { db } from '../../../config/firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { getAllStaff, getAllAttendance } from '../../../services/adminService.js';

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

  // Calendar states
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isManualRecordModalOpen, setIsManualRecordModalOpen] = useState(false);

  // Summary sort states (Admin Only)
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

  // Fetch full records list initially
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const fetchRawData = async () => {
      setDataLoading(true);
      setDataError('');
      try {
        if (userProfile.role === 'admin') {
          // 1. Fetch active staff list
          const staffList = await getAllStaff();
          const activeStaff = staffList.filter(s => s.active);
          setRawStaffList(activeStaff);

          // Build Name lookup map
          const nameMap = {};
          activeStaff.forEach(s => {
            nameMap[s.uid] = s.name;
          });
          setStaffNameMap(nameMap);

          // 2. Fetch all attendance logs
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
            userLogs.push(doc.data());
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

    fetchRawData();
  }, [currentUser, userProfile]);

  if (loading || !userProfile) {
    return <Loader />;
  }

  const isAdmin = userProfile.role === 'admin';
  const dataScopeLabel = isAdmin 
    ? 'All Staff Attendance Data (Admin Scope)' 
    : 'Personal Attendance Data (Staff Scope)';

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

    // 2. Selected Staff Member Filter (Admin Only)
    if (isAdmin && selectedStaff) {
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

    if (isAdmin) {
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
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              boxShadow: 'var(--neu-shadow-pressed-sm)',
              animation: 'pulse 1.5s infinite ease-in-out'
            }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ height: '14px', width: '65%', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <div style={{ height: '24px', width: '35%', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
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
            <div style={{
              height: '16px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
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
          <div style={{ height: '14px', width: '30%', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '24px', width: '20%', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '12px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ height: '32px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '32px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
      </NeuCard>
    ));
  };

  // SUB-RENDER: Summary Cards View
  const renderSummaryCards = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {isAdmin ? (
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

          {/* Filter by Staff member (Admin only) */}
          {isAdmin && (
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
                    {isAdmin && <th>Staff Name</th>}
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                    {isAdmin && <th>Marked By</th>}
                  </tr>
                </thead>
                <tbody>
                  {renderTableSkeleton(isAdmin ? 6 : 4)}
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
                    {isAdmin && <th>Staff Name</th>}
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                    {isAdmin && <th>Marked By</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id || `${log.userId}_${log.date}`}>
                      {isAdmin && (
                        <td style={{ fontWeight: 600 }}>
                          {staffNameMap[log.userId] || 'Unknown User'}
                        </td>
                      )}
                      <td style={{ fontWeight: 500 }}>
                        {formatDateLabel(log.date)}
                      </td>
                      <td>{formatTime(log.checkIn)}</td>
                      <td>{formatTime(log.checkOut)}</td>
                      <td>
                        <NeuBadge variant={log.status}>{log.status}</NeuBadge>
                      </td>
                      {isAdmin && (
                        <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {log.markedBy || 'manual'}
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
                  {isAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Staff Name:</span>
                      <span style={{ fontWeight: 600 }}>{staffNameMap[log.userId] || 'Unknown User'}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px', 
                    fontSize: '0.85rem', 
                    borderTop: isAdmin ? 'none' : '1px solid var(--border-color)', 
                    paddingTop: isAdmin ? '0' : '10px' 
                  }}>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Check-In</span>
                      <span style={{ fontWeight: 600 }}>{formatTime(log.checkIn)}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Check-Out</span>
                      <span style={{ fontWeight: 600 }}>{formatTime(log.checkOut)}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--text-muted)', 
                      borderTop: '1px dotted var(--border-color)', 
                      paddingTop: '8px', 
                      display: 'flex', 
                      justifyContent: 'space-between' 
                    }}>
                      <span>Marked By:</span>
                      <span style={{ textTransform: 'capitalize' }}>{log.markedBy || 'manual'}</span>
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
      ? ['Staff Name', 'Date', 'Check-In', 'Check-Out', 'Status', 'Marked By']
      : ['Date', 'Check-In', 'Check-Out', 'Status'];

    const csvRows = [];
    csvRows.push(headers.join(','));

    dataToExport.forEach(log => {
      const row = [];
      if (isAdmin) {
        row.push(`"${staffNameMap[log.userId] || 'Unknown User'}"`);
      }
      row.push(`"${formatDateLabel(log.date)}"`);
      row.push(`"${formatTime(log.checkIn)}"`);
      row.push(`"${formatTime(log.checkOut)}"`);
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
                <th>Check-Out</th>
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
                  <td>${formatTime(log.checkOut)}</td>
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

  // Calculate monthly summary metrics for active staff roster (Admin Only)
  const getMonthlySummaryRoster = () => {
    if (!isAdmin) return [];
    
    const scope = getSelectedMonthScope();
    const workingDays = getWorkingDaysForMonth(scope.year, scope.month);
    const prefix = `${scope.year}-${String(scope.month + 1).padStart(2, '0')}`;

    const roster = rawStaffList.map(staff => {
      const staffLogs = rawLogs.filter(log => 
        log.userId === staff.uid && 
        log.date.startsWith(prefix)
      );

      const presentCount = staffLogs.filter(log => log.status === 'present' || log.status === 'late').length;
      const lateCount = staffLogs.filter(log => log.status === 'late').length;
      const absentCount = Math.max(0, workingDays - presentCount);
      const pct = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

      return {
        uid: staff.uid,
        name: staff.name,
        username: staff.username,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        pct: pct
      };
    });

    roster.sort((a, b) => {
      let valA = a[summarySortField];
      let valB = b[summarySortField];
      
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
    if (!isAdmin) return null;

    const scope = getSelectedMonthScope();
    const roster = getMonthlySummaryRoster();

    return (
      <NeuCard variant="raised" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
            Monthly Attendance Summary ({scope.label})
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Click table headers to sort staff by attendance metrics.
          </p>
        </div>

        {roster.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            No staff records found.
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="desktop-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSortSummary('name')}>
                      Staff Member{renderSortArrow('name')}
                    </th>
                    <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary('present')}>
                      Present Days{renderSortArrow('present')}
                    </th>
                    <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary('absent')}>
                      Absent Days{renderSortArrow('absent')}
                    </th>
                    <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary('late')}>
                      Late Days{renderSortArrow('late')}
                    </th>
                    <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSortSummary('pct')}>
                      Attendance %{renderSortArrow('pct')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(row => (
                    <tr key={row.uid}>
                      <td style={{ fontWeight: 600 }}>
                        {row.name} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>@{row.username}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{row.present}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{row.absent}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{row.late}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          color: row.pct >= 90 ? 'var(--color-success)' : row.pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {row.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Stacked Cards */}
            <div className="mobile-cards-container">
              {roster.map(row => (
                <NeuCard key={row.uid} variant="raised" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                    <span style={{
                      fontWeight: 700,
                      color: row.pct >= 90 ? 'var(--color-success)' : row.pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)'
                    }}>
                      {row.pct}%
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Present</span>
                      <span style={{ fontWeight: 600 }}>{row.present}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Absent</span>
                      <span style={{ fontWeight: 600 }}>{row.absent}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Late</span>
                      <span style={{ fontWeight: 600 }}>{row.late}</span>
                    </div>
                  </div>
                </NeuCard>
              ))}
            </div>
          </>
        )}
      </NeuCard>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Custom Stylesheet adding pulse animations and Separated Neumorphic Table rows */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.65; }
          50% { opacity: 1; }
          100% { opacity: 0.65; }
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
          <NeuSegmentedControl
            options={['Cards + Table', 'Table Only', 'Calendar View']}
            selectedValue={viewMode}
            onChange={handleViewModeChange}
          />

          {/* Admin-only Actions Container - Conditional Rendering */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <NeuButton 
                onClick={() => setIsManualRecordModalOpen(true)}
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
      <NeuCard variant="raised" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
          Module Overview
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          This page serves as the entry point for staff attendance logging and history tracking. 
          Use the filter bar below to refine records. Statistics and logs will update dynamically.
        </p>
      </NeuCard>

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

      {/* Content Render Driven by View Switcher state */}
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

      {/* Monthly Summary Table (Admin Only) */}
      {renderMonthlySummaryTable()}

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
                {isAdmin ? 'Staff Attendance Details' : 'My Attendance Details'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Date: {formatDateLabel(selectedCalendarDay)}
              </p>
            </div>

            {/* Modal Body scrollable list */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {isAdmin ? (
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
                          <NeuBadge variant={staffLog.status}>{staffLog.status}</NeuBadge>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatTime(staffLog.checkIn)} - {formatTime(staffLog.checkOut)}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <NeuCard variant="inset" style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check-In Time</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                              {formatTime(myLog.checkIn)}
                            </span>
                          </NeuCard>
                          <NeuCard variant="inset" style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check-Out Time</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                              {formatTime(myLog.checkOut)}
                            </span>
                          </NeuCard>
                        </div>
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

      {/* Manual Record Adjustment Placeholder Modal */}
      {isManualRecordModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
              maxWidth: '460px',
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
              onClick={() => setIsManualRecordModalOpen(false)}
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

            {/* Modal Icon Indicator */}
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
              color: 'var(--color-primary)'
            }}>
              <Plus size={32} />
            </div>

            {/* Modal Info */}
            <div>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                Manual Record Adjustment
              </h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Feature Under Construction
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                This feature will allow administrators to manually override, insert, or delete staff attendance logs. It is scheduled for integration in the upcoming system enhancement phase.
              </p>
            </div>

            {/* Action button */}
            <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <NeuButton onClick={() => setIsManualRecordModalOpen(false)} variant="accent" style={{ padding: '10px 32px' }}>
                Understood
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}

    </div>
  );
}
