// src/firebaseUtils.js
import {
  setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  doc, collection, query, where, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

const PARTIDAS = 'partidas';
const partidasRef = collection(db, PARTIDAS);

// --- Helpers ---
function requireAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay usuario autenticado');
  return user;
}

function buildCreador() {
  const user = auth.currentUser;
  const usuarioLS = JSON.parse(localStorage.getItem('usuarioActivo') || '{}');
  return (usuarioLS?.nombre && usuarioLS?.apellido)
    ? `${usuarioLS.nombre}_${usuarioLS.apellido}`.replace(/\s+/g, '_')
    : (user?.email || 'Anonimo');
}

export const guardarPartidaFirestore = async (partida, id = null) => {
  const user = requireAuth();

  const creador = buildCreador();
  const fechaISO = new Date().toISOString();
  const idDocumento = id || `${creador}_${fechaISO.split('T')[0]}_${Date.now()}`;

  const payload = {
    ...partida,
    uid: user.uid,                         // 🔑 reglas
    creadoPor: creador,
    fecha: partida?.fecha || fechaISO,     // para listar
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };

  const ref = doc(db, PARTIDAS, idDocumento);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().uid !== user.uid) {
    throw new Error('No tienes permiso para sobrescribir esta partida');
  }

  await setDoc(ref, payload, { merge: true });
  return idDocumento;
};

export const obtenerPartidasFirestore = async () => {
  const user = requireAuth();

  // 🔒 Solo mis partidas (sin orderBy para evitar índice)
  const q = query(partidasRef, where('uid', '==', user.uid));
  const snap = await getDocs(q);

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      fecha: data.fecha || new Date().toISOString(),
      equipos: data.equipos ?? 0,
      pistas: data.pistas ?? 0,
      nombresEquipos: Array.isArray(data.nombresEquipos) ? data.nombresEquipos : [],
      rondas: Array.isArray(data.rondas) ? data.rondas : [],
    };
  });
};

export const obtenerPartidaPorId = async (id) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('La partida no existe');

  const data = snap.data();
  if (data.uid !== user.uid) throw new Error('No tienes permiso para ver esta partida');

  return { id: snap.id, ...data };
};

export const actualizarPartidaFirestore = async (id, nuevosDatos) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('La partida no existe');

  const data = snap.data();
  if (data.uid !== user.uid) throw new Error('No tienes permiso para editar esta partida');

  await updateDoc(ref, {
    ...nuevosDatos,
    fecha: nuevosDatos?.fecha || new Date().toISOString(),
    actualizadoEn: serverTimestamp(),
  });
  return true;
};

export const borrarPartidaFirestore = async (id) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.uid !== user.uid) throw new Error('No tienes permiso para borrar esta partida');

  await deleteDoc(ref);
};









