// src/firebaseUtils.js
import {
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

const PARTIDAS = 'partidas';
const partidasRef = collection(db, PARTIDAS);

// --- Helpers ---
function requireAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión.');
  return user;
}

function buildCreador() {
  const user = auth.currentUser;
  const usuarioLS = JSON.parse(localStorage.getItem('usuarioActivo') || '{}');
  const visible =
    usuarioLS?.nombre && usuarioLS?.apellido
      ? `${usuarioLS.nombre}_${usuarioLS.apellido}`.replace(/\s+/g, '_')
      : (user?.email || 'Anonimo');
  return visible;
}

// =============== Crear/guardar (con ID opcional) ===============
export const guardarPartidaFirestore = async (partida, id = null) => {
  const user = requireAuth();

  const creador = buildCreador();
  const fechaISO = new Date().toISOString();
  const idDocumento = id || `${creador}_${fechaISO.split('T')[0]}_${Date.now()}`;

  const payload = {
    ...partida,
    uid: user.uid,                // 🔒 NECESARIO para pasar reglas
    creadoPor: creador,
    fecha: partida?.fecha || fechaISO, // para tu UI
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };

  // Si existe id => sobrescribe (merge) tras validar propiedad si ya existiera
  const ref = doc(db, PARTIDAS, idDocumento);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().uid !== user.uid) {
    throw new Error('No tienes permiso para sobrescribir esta partida.');
  }

  await setDoc(ref, payload, { merge: true });
  return idDocumento;
};

// =============== Listar SOLO mis partidas ===============
export const obtenerPartidasFirestore = async () => {
  const user = requireAuth();

  // Filtra por uid del usuario autenticado
  // TIP: si Firestore te pide índice por combinar where+orderBy, elimina orderBy o crea el índice sugerido.
  const q = query(
    partidasRef,
    where('uid', '==', user.uid),
    orderBy('fecha', 'desc') // <- opcional; quítalo si te pide índice y no quieres crearlo aún
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => {
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

// =============== Obtener una partida por ID (verifica propiedad) ===============
export const obtenerPartidaPorId = async (id) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('La partida no existe');

  const data = snap.data();
  if (data.uid !== user.uid) {
    throw new Error('No tienes permiso para ver esta partida');
  }

  return { id: snap.id, ...data };
};

// =============== Actualizar (solo si es mía) ===============
export const actualizarPartidaFirestore = async (id, nuevosDatos) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('La partida no existe');

  const data = snap.data();
  if (data.uid !== user.uid) {
    throw new Error('No tienes permiso para editar esta partida');
  }

  const updatePayload = {
    ...nuevosDatos,
    fecha: nuevosDatos?.fecha || new Date().toISOString(),
    actualizadoEn: serverTimestamp(),
  };

  await updateDoc(ref, updatePayload);
  return true;
};

// =============== Borrar (solo si es mía) ===============
export const borrarPartidaFirestore = async (id) => {
  const user = requireAuth();

  const ref = doc(db, PARTIDAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.uid !== user.uid) {
    throw new Error('No tienes permiso para borrar esta partida');
  }

  await deleteDoc(ref);
};








