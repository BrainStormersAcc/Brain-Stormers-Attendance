import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts and Global Pages
import Login from './pages/Login';
import DashboardLayout from './shared/components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import AuditLog from './pages/AuditLog';
import MisuseMonitoring from './pages/MisuseMonitoring';
import NotFound from './pages/NotFound';
import StyleGuide from './pages/StyleGuide';

// Module Pages
import StaffDashboard from './modules/staff-attendance/pages/StaffDashboard';
import DeviceList from './modules/device-management/pages/DeviceList';

// Route Protection and Modal
import ProtectedRoute from './shared/components/ProtectedRoute.jsx';
import AdminLoginModal from './shared/components/AdminLoginModal.jsx';

function App() {
  return (
    <Router>
      <AdminLoginModal />
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout wrapping page views */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin Control Panel - restricted to admin role */}
          <Route 
            index 
            element={
              <ProtectedRoute>
                <DashboardHome view="overview" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="staff-management" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardHome view="staff" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="attendance-records" 
            element={
              <ProtectedRoute>
                <DashboardHome view="records" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin-settings" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardHome view="admin-settings" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="enroll-staff" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardHome view="enroll-staff" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="audit-log" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AuditLog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="misuse-monitoring" 
            element={
              <ProtectedRoute requiredRole="admin">
                <MisuseMonitoring />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="device-management" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DeviceList />
              </ProtectedRoute>
            } 
          />
          
          {/* Style Guide Sandbox Route - only available in development mode */}
          {import.meta.env.DEV && (
            <Route path="style-guide" element={<StyleGuide />} />
          )}
          
          {/* Module-Specific Route - shared by admin and staff roles */}
          <Route 
            path="staff-attendance/*" 
            element={
              <ProtectedRoute>
                <StaffDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Future feature modules can be added here seamlessly */}
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
