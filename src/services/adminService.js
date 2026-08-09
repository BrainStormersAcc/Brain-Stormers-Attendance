import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  deleteUser,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase.js';

// Helper to convert plain username or email into standard email format for Firebase Auth
export const formatUsernameToEmail = (username) => {
  if (!username) return '';
  if (username.includes('@')) {
    return username; // If it's already an email, return as-is
  }
  // Internally append domain to support non-email plain usernames
  return `${username}@brainstormers.internal`;
};

// Helper to create a staff user in Auth and Firestore without logging the current Admin out
export const createStaffAccount = async ({ name, username, phone, password }) => {
  const appName = `TempRegisterApp-${Math.random().toString(36).substr(2, 9)}`;
  const tempApp = initializeApp(firebaseConfig, appName);
  const tempAuth = getAuth(tempApp);

  try {
    // 1. Format username to valid email internally for Firebase Auth
    const authEmail = formatUsernameToEmail(username);

    // 2. Create credential
    const userCredential = await createUserWithEmailAndPassword(tempAuth, authEmail, password);
    const user = userCredential.user;
    
    // 3. Clear session on temporary app context
    await signOut(tempAuth);

    // 4. Create profile document in Firestore users collection (storing credentials)
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      name,
      role: 'staff',
      username, // Storing raw username
      phone,
      password, // Storing password so Admin can see and edit
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
    
    return staffList.sort((a, b) => {
      const dateA = a.joinDate?.seconds || 0;
      const dateB = b.joinDate?.seconds || 0;
      return dateB - dateA;
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

// Edit staff info and credentials in Firestore and Firebase Auth
export const editStaffCredentials = async (uid, oldUsername, oldPassword, { name, username, phone, password }) => {
  const appName = `TempEditApp-${Math.random().toString(36).substr(2, 9)}`;
  const tempApp = initializeApp(firebaseConfig, appName);
  const tempAuth = getAuth(tempApp);

  try {
    // Determine if auth updates are necessary
    const usernameChanged = username !== oldUsername;
    const passwordChanged = password !== oldPassword;

    if (usernameChanged || passwordChanged) {
      // 1. Sign in as the staff member to gain edit capability
      const oldAuthEmail = formatUsernameToEmail(oldUsername);
      const userCredential = await signInWithEmailAndPassword(tempAuth, oldAuthEmail, oldPassword);
      const user = userCredential.user;

      // 2. Apply email update if username changed
      if (usernameChanged) {
        const newAuthEmail = formatUsernameToEmail(username);
        await updateEmail(user, newAuthEmail);
      }

      // 3. Apply password update if password changed
      if (passwordChanged) {
        await updatePassword(user, password);
      }

      // 4. Sign out temporary instance
      await signOut(tempAuth);
    }

    // 5. Update Firestore user document
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      name,
      username,
      phone,
      password
    });

    return { success: true };
  } catch (error) {
    console.error('Error in editStaffCredentials:', error);
    throw error;
  }
};

// Delete staff account in Firestore and Firebase Auth
export const deleteStaffAccount = async (uid, username, password) => {
  const appName = `TempDeleteApp-${Math.random().toString(36).substr(2, 9)}`;
  const tempApp = initializeApp(firebaseConfig, appName);
  const tempAuth = getAuth(tempApp);

  try {
    // 1. Sign in as the staff member
    const authEmail = formatUsernameToEmail(username);
    const userCredential = await signInWithEmailAndPassword(tempAuth, authEmail, password);
    const user = userCredential.user;

    // 2. Delete Auth record
    await deleteUser(user);

    // 3. Sign out temporary app
    await signOut(tempAuth);

    // 4. Delete Firestore profile document
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);

    return { success: true };
  } catch (error) {
    console.error('Error in deleteStaffAccount, attempting Firestore fallback delete:', error);
    
    // Fallback: If Auth deletion fails (e.g. user was deleted from Auth manually), still delete Firestore document
    try {
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);
      return { success: true, firestoreOnly: true };
    } catch (dbError) {
      console.error('Failed to delete Firestore document after Auth fail:', dbError);
      throw dbError;
    }
  }
};

// Fetch all attendance logs from Firestore attendance collection
export const getAllAttendance = async () => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    const logs = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isDeleted !== true) {
        logs.push({ id: doc.id, ...data });
      }
    });
    
    return logs;
  } catch (error) {
    console.error('Error in getAllAttendance:', error);
    throw error;
  }
};

// Fetch all audit logs from Firestore auditLogs collection
export const getAllAuditLogs = async () => {
  try {
    const auditLogsRef = collection(db, 'auditLogs');
    const querySnapshot = await getDocs(auditLogsRef);
    
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort chronologically (most recent first)
    return logs.sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error in getAllAuditLogs:', error);
    throw error;
  }
};

// Purge all attendance records and audit logs to reset system (Admin-only)
export const purgeAllAttendanceData = async () => {
  try {
    // 1. Fetch all attendance docs
    const attendanceRef = collection(db, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    
    // 2. Fetch all audit logs
    const auditLogsRef = collection(db, 'auditLogs');
    const auditLogsSnapshot = await getDocs(auditLogsRef);
    
    const deletePromises = [];
    
    attendanceSnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, 'attendance', document.id)));
    });
    
    auditLogsSnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, 'auditLogs', document.id)));
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error in purgeAllAttendanceData:', error);
    throw error;
  }
};
