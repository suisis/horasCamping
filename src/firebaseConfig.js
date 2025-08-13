// src/firebaseConfig.js (versión simple para CRA: sin variables de entorno)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCKyFJ8C5VPY77r8FURuojEN6hd_x9CQyY",
  authDomain: "horascamping2025.firebaseapp.com",
  projectId: "horascamping2025",
  storageBucket: "horascamping2025.firebasestorage.app",
  messagingSenderId: "86910353141",
  appId: "1:86910353141:web:aceb6eed619658494b4fbc",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;




