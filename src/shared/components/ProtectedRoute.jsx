import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!userProfile || userProfile.role !== requiredRole)) {
    // Redirect unauthorized user to their respective valid dashboard route
    if (userProfile?.role === 'staff') {
      return <Navigate to="/staff-attendance" replace />;
    }
    if (userProfile?.role === 'admin') {
      return <Navigate to="/" replace />;
    }
    // Fallback if role is unrecognized
    return <Navigate to="/login" replace />;
  }

  return children;
}
