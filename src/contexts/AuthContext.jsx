console.log('[AuthContext] EFFECT FILE LOADED');
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword,
  updateEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import Loader from '../shared/components/Loader.jsx';

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

  // Sync user role changes to Electron host
  useEffect(() => {
    console.log('[AuthContext] userProfile changed:', userProfile);
    console.log('[AuthContext] window.settingsAPI present:', !!window.settingsAPI);
    if (window.settingsAPI) {
      console.log('[AuthContext] window.settingsAPI.notifyRole present:', !!window.settingsAPI.notifyRole);
    }
    if (window.settingsAPI && window.settingsAPI.notifyRole) {
      const role = userProfile?.role || null;
      console.log('[AuthContext] Calling notifyRole with role:', role);
      window.settingsAPI.notifyRole(role);
    }
  }, [userProfile]);

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
    const authEmail = email.includes('@') ? email : `${email}@brainstormers.internal`;
    return signInWithEmailAndPassword(auth, authEmail, password);
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

  // Update admin credentials and profile details dynamically
  const updateAdminProfile = async (currentPassword, { name, username, phone, password }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently authenticated.');

    // 1. Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // 2. Update email in Auth if changed
    const newAuthEmail = username.includes('@') ? username : `${username}@brainstormers.internal`;
    if (newAuthEmail !== user.email) {
      try {
        await updateEmail(user, newAuthEmail);
      } catch (emailErr) {
        console.warn('Email update rejected by Firebase Auth:', emailErr);
        if (emailErr.code === 'auth/operation-not-allowed') {
          throw new Error('Username changes are disabled by your Firebase configuration.');
        }
        throw emailErr;
      }
    }

    // 3. Update password in Auth if changed
    if (password !== userProfile.password) {
      await updatePassword(user, password);
    }

    // 4. Update Firestore profile document
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      name,
      username,
      phone,
      password
    });

    // Update usernameIndex lookup mapping
    if (userProfile && userProfile.username && userProfile.username !== username) {
      try {
        await deleteDoc(doc(db, 'usernameIndex', userProfile.username.toLowerCase().trim()));
      } catch (delErr) {
        console.warn('Failed to delete old usernameIndex doc for admin:', delErr);
      }
    }
    const indexDocRef = doc(db, 'usernameIndex', username.toLowerCase().trim());
    await setDoc(indexDocRef, {
      email: newAuthEmail,
      role: 'admin',
      uid: user.uid
    });

    // 5. Sync updates to local state profile
    setUserProfile(prev => ({
      ...prev,
      name,
      username,
      phone,
      password
    }));

    return { success: true };
  };

  // Update user profile avatar dynamically
  const updateAvatar = async (avatar) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently authenticated.');

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { avatar });

    // Sync updates to local state profile
    setUserProfile(prev => ({
      ...prev,
      avatar
    }));
  };

  // Migration: If logged-in user is admin, trigger a silent backfill of the usernameIndex collection
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const runBackfill = async () => {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          usersSnapshot.forEach(async (uDoc) => {
            const data = uDoc.data();
            if (data.username) {
              const usernameLower = data.username.toLowerCase().trim();
              const authEmail = data.username.includes('@') ? data.username : `${data.username}@brainstormers.internal`;
              await setDoc(doc(db, 'usernameIndex', usernameLower), {
                email: authEmail,
                role: data.role || 'staff',
                uid: uDoc.id
              });
            }
          });
          console.log('[Migration] usernameIndex backfill migration complete.');
        } catch (migErr) {
          console.warn('[Migration] Failed to run usernameIndex backfill:', migErr);
        }
      };
      runBackfill();
    }
  }, [userProfile]);

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdminModalOpen,
    setIsAdminModalOpen,
    login,
    logout,
    changePassword,
    updateAdminProfile,
    updateAvatar
  };



  return (
    <AuthContext.Provider value={value}>
      {loading ? <Loader fullPage={true} /> : children}
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
