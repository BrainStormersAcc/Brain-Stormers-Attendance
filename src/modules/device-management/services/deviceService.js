import { db } from '../../../config/firebase.js';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

const collectionRef = collection(db, 'devices');

export const getDevices = async () => {
  const q = query(collectionRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const devices = [];
  querySnapshot.forEach((doc) => {
    devices.push({ id: doc.id, ...doc.data() });
  });
  return devices;
};

export const addDevice = async (deviceData) => {
  const docRef = await addDoc(collectionRef, {
    ...deviceData,
    active: true,
    createdAt: serverTimestamp(),
    lastFetchedAt: null
  });
  return docRef.id;
};

export const updateDevice = async (id, updateData) => {
  const docRef = doc(db, 'devices', id);
  await updateDoc(docRef, updateData);
};

export const deleteDevice = async (id) => {
  const docRef = doc(db, 'devices', id);
  await deleteDoc(docRef);
};
