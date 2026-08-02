import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase.js';

// Helper to create a staff user in Auth and Firestore without logging the current Admin out
export const createStaffAccount = async ({ name, username, phone, password }) => {
  // Initialize a secondary Firebase application context dynamically to prevent session collision
  const appName = `TempRegisterApp-${Math.random().toString(36).substr(2, 9)}`;
  const tempApp = initializeApp(firebaseConfig, appName);
  const tempAuth = getAuth(tempApp);

  try {
    // Create credential
    const userCredential = await createUserWithEmailAndPassword(tempAuth, username, password);
    const user = userCredential.user;
    
    // Clear session on secondary auth app context
    await signOut(tempAuth);

    // Create profile document in Firestore users collection
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      name,
      role: 'staff',
      username, // username matches their Email/Login
      phone,
      joinDate: serverTimestamp(),
      active: true
    });

    return { uid: user.uid, success: true };
  } catch (error) {
    console.error('Error in createStaffAccount:', error);
    throw error;
  }
};

// Fetch all staff members from Firestore users collection
export const getAllStaff = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'staff'));
    const querySnapshot = await getDocs(q);
    
    const staffList = [];
    querySnapshot.forEach((doc) => {
      staffList.push({ uid: doc.id, ...doc.data() });
    });
    
    // Sort by name or join date
    return staffList.sort((a, b) => {
      const dateA = a.joinDate?.seconds || 0;
      const dateB = b.joinDate?.seconds || 0;
      return dateB - dateA; // Newest first
    });
  } catch (error) {
    console.error('Error in getAllStaff:', error);
    throw error;
  }
};

// Toggle active status in Firestore users collection
export const toggleStaffStatus = async (uid, active) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    return updateDoc(userDocRef, { active });
  } catch (error) {
    console.error('Error in toggleStaffStatus:', error);
    throw error;
  }
};

// Edit staff info in Firestore users collection
export const editStaffInfo = async (uid, { name, phone }) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    return updateDoc(userDocRef, { name, phone });
  } catch (error) {
    console.error('Error in editStaffInfo:', error);
    throw error;
  }
};

// Fetch all attendance logs from Firestore attendance collection
export const getAllAttendance = async () => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    return logs;
  } catch (error) {
    console.error('Error in getAllAttendance:', error);
    throw error;
  }
};

