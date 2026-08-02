import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts and Global Pages
import Login from './pages/Login';
import DashboardLayout from './shared/components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import NotFound from './pages/NotFound';

// Module Pages
import StaffDashboard from './modules/staff-attendance/pages/StaffDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout wrapping page views */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          
          {/* Module-Specific Route */}
          <Route path="staff-attendance/*" element={<StaffDashboard />} />
          
          {/* Future feature modules can be added here seamlessly */}
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
