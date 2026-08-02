import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts and Global Pages
import Login from './pages/Login';
import DashboardLayout from './shared/components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import NotFound from './pages/NotFound';
import StyleGuide from './pages/StyleGuide';

// Module Pages
import StaffDashboard from './modules/staff-attendance/pages/StaffDashboard';

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
              <ProtectedRoute requiredRole="admin">
                <DashboardHome />
              </ProtectedRoute>
            } 
          />
          
          {/* Style Guide Sandbox Route - only available in development mode */}
          {import.meta.env.DEV && (
            <Route path="style-guide" element={<StyleGuide />} />
          )}
          
          {/* Module-Specific Route - restricted to staff role */}
          <Route 
            path="staff-attendance/*" 
            element={
              <ProtectedRoute requiredRole="staff">
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
