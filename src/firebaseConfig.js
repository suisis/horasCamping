// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Soporte doble: Vite (import.meta.env) y CRA (process.env.REACT_APP_*)
const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : {};
const getEnv = (viteKey, craKey) => viteEnv?.[viteKey] || process.env?.[craKey];

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'),
};

// Mensaje claro si falta algo
for (const [k, v] of Object.entries(firebaseConfig)) {
  if (!v) {
    // eslint-disable-next-line no-console
    console.error(`FALTA variable de entorno para ${k}. Define VITE_* (Vite) o REACT_APP_* (CRA).`);
    throw new Error(`Config Firebase incompleta: ${k} no definido`);
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;



