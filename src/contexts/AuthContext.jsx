import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserProfile({ uid: user.uid, ...userDoc.data() });
          } else {
            console.warn(`No user document found for UID: ${user.uid}`);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setUserProfile(null);
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Global key listener for Ctrl+Shift+Alt+A shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Login handler
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout handler
  const logout = async () => {
    return signOut(auth);
  };

  // Change password handler
  const changePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently authenticated.');

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    return updatePassword(user, newPassword);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdminModalOpen,
    setIsAdminModalOpen,
    login,
    logout,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
