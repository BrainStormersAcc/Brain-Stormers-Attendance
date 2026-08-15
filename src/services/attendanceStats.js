// Utility to get today's local date string in YYYY-MM-DD format
export const getLocalTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Calculate elapsed working days in the current month up to today (excluding Fridays)
export const getElapsedWorkingDays = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  let workingDays = 0;
  for (let d = 1; d <= today.getDate(); d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay(); // 5 = Friday
    if (dayOfWeek !== 5) {
      workingDays++;
    }
  }
  return workingDays;
};

// Calculate working days in a custom date range (excluding Fridays)
export const getWorkingDaysInRange = (from, to) => {
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

// Calculate all team stats for today
export const getTeamStats = (staffList, attendanceLogs) => {
  const todayStr = getLocalTodayString();
  const activeStaff = staffList.filter(s => s.active);
  const activeStaffCount = activeStaff.length;
  
  const todayLogs = attendanceLogs.filter(log => log.date === todayStr);
  const presentCount = todayLogs.filter(log => {
    const statusLower = log.status?.toLowerCase();
    return statusLower === 'present' || statusLower === 'late';
  }).length;
  
  const lateCount = todayLogs.filter(log => log.status?.toLowerCase() === 'late').length;
  const absentCount = Math.max(0, activeStaffCount - presentCount);

  return {
    todayStr,
    activeStaffCount,
    presentCount,
    lateCount,
    absentCount,
    todayLogs
  };
};

// Calculate personal stats for a specific user
export const getPersonalStats = (userId, attendanceLogs) => {
  const todayStr = getLocalTodayString();
  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
  const elapsedWorkingDays = getElapsedWorkingDays();

  // Find today's record
  const todayRecord = attendanceLogs.find(log => log.userId === userId && log.date === todayStr);
  let myStatusToday = 'Not marked yet';
  if (todayRecord) {
    const statusLower = todayRecord.status?.toLowerCase();
    if (statusLower === 'present') myStatusToday = 'Present';
    else if (statusLower === 'late') myStatusToday = 'Present (Late)';
    else if (statusLower === 'absent') myStatusToday = 'Absent';
  }

  // Monthly stats
  const myPresentCount = attendanceLogs.filter(log => {
    const statusLower = log.status?.toLowerCase();
    return log.userId === userId && 
      log.date.startsWith(currentMonthStr) && 
      (statusLower === 'present' || statusLower === 'late');
  }).length;

  const myLateCount = attendanceLogs.filter(log => {
    const statusLower = log.status?.toLowerCase();
    return log.userId === userId && 
      log.date.startsWith(currentMonthStr) && 
      statusLower === 'late';
  }).length;

  const myAbsentCount = Math.max(0, elapsedWorkingDays - myPresentCount);

  const myAttendancePct = elapsedWorkingDays > 0 
    ? Math.min(100, Math.round((myPresentCount / elapsedWorkingDays) * 100)) 
    : 0;

  return {
    myStatusToday,
    myPresentCount,
    myLateCount,
    myAbsentCount,
    myAttendancePct
  };
};

// Calculate Present/Absent/Late metrics for any custom array of logs and working days
export const getStatsForLogs = (logs, workingDays) => {
  const present = logs.filter(log => {
    const statusLower = log.status?.toLowerCase();
    return statusLower === 'present' || statusLower === 'late';
  }).length;
  const late = logs.filter(log => log.status?.toLowerCase() === 'late').length;
  const absent = Math.max(0, workingDays - present);
  const pct = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
  return { present, late, absent, pct };
};
