// src/pages/LoginWithEmail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  doc, getDoc, setDoc,
  query, where, collection, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function LoginWithEmail() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!correo || !password) {
      Swal.fire('Error', 'Debes introducir correo y contraseña.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1) Auth
      const cred = await signInWithEmailAndPassword(auth, correo.trim(), password);
      const user = cred.user; // <-- aquí tienes el uid correcto

      // 2) Intentar leer perfil en registros/{uid}
      let perfil;
      const refUid = doc(db, 'registros', user.uid);
      const snapUid = await getDoc(refUid);

      if (snapUid.exists()) {
        perfil = { id: snapUid.id, ...snapUid.data() };
      } else {
        // 3) Buscar documento "antiguo" por correo
        const q = query(collection(db, 'registros'), where('correo', '==', user.email));
        const qs = await getDocs(q);

        if (!qs.empty) {
          const oldDoc = qs.docs[0];
          const oldData = oldDoc.data();

          // 3.a) Migrar a registros/{uid} si el id es distinto
          const dataNormalizada = {
            uid: user.uid,
            nombre: oldData.nombre || '',
            apellido: oldData.apellido || '',
            telefono: oldData.telefono || '',
            correo: user.email,
            esMaster: oldData.esMaster === true || oldData.master === true || false,
            // compatibilidad
            clave: '',
            // fechas (si ya había las respetamos)
            primerAcceso: oldData.primerAcceso || new Date().toISOString(),
            expiracion: (oldData.esMaster === true || oldData.master === true) ? null : (oldData.expiracion || null),
            creadoEn: oldData.creadoEn || serverTimestamp(),
          };

          await setDoc(refUid, dataNormalizada, { merge: true });
          // (Opcional) podrías borrar el doc antiguo aquí si quieres, yo lo dejo por si acaso
          perfil = { id: user.uid, ...dataNormalizada };
        } else {
          // 4) No hay perfil en ningún lado → crear uno mínimo
          const esMasterPorCorreo = false; // si quieres, mete aquí un whitelist por email
          const ahora = new Date();
          const exp = new Date(ahora);
          exp.setDate(exp.getDate() + 3);

          const nuevo = {
            uid: user.uid,
            nombre: '',
            apellido: '',
            telefono: '',
            correo: user.email,
            esMaster: esMasterPorCorreo,
            clave: '',
            primerAcceso: ahora.toISOString(),
            expiracion: esMasterPorCorreo ? null : exp.toISOString(),
            creadoEn: serverTimestamp(),
          };

          await setDoc(refUid, nuevo, { merge: true });
          perfil = { id: user.uid, ...nuevo };
        }
      }

      // 5) Guardar sesión “visible” y continuar
      localStorage.setItem('usuarioActivo', JSON.stringify({
        uid: perfil.id,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        telefono: perfil.telefono,
        correo: perfil.correo,
        master: perfil.esMaster === true,
      }));

      // Mensaje de bienvenida (con caducidad si no es master)
      let html = '';
      if (perfil.esMaster) {
        html = '<strong>✅ Acceso MASTER (ilimitado)</strong>';
      } else if (perfil.expiracion) {
        const fechaExp = new Date(perfil.expiracion);
        const diff = fechaExp - new Date();
        if (diff <= 24 * 60 * 60 * 1000) {
          const horas = Math.ceil(diff / (1000 * 60 * 60));
          html = `<strong>⚠️ Tu acceso caduca en ${horas} hora(s)</strong>`;
        } else {
          const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
          html = `Tu acceso es válido durante <strong>${dias} día(s)</strong> más.`;
        }
      }

      await Swal.fire({
        icon: 'success',
        title: `Bienvenido, ${perfil.nombre || ''}`.trim() || 'Bienvenido',
        html,
        confirmButtonText: 'Continuar',
      });

      navigate('/configuracion');
    } catch (error) {
      console.error('Error al iniciar sesión:', error.code, error.message);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        Swal.fire('Credenciales inválidas', 'La contraseña no coincide o la cuenta no existe en Auth. Si eres MASTER, asegúrate de que tu contraseña tenga al menos 6 caracteres.', 'error');
      } else if (error.code === 'auth/user-not-found') {
        Swal.fire('Usuario no encontrado', 'No existe cuenta con ese correo. Regístrate o revisa el email.', 'error');
      } else {
        Swal.fire('Error al iniciar sesión', error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fef9f4] to-[#e0e7ff] px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#002c54]">Iniciar sesión</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full px-4 py-2 border rounded"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña / Clave"
          className="w-full px-4 py-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 max-w-[160px] bg-[#002c54] text-white px-6 py-2 rounded hover:bg-[#004080] transition disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 max-w-[160px] bg-gray-200 text-[#002c54] px-6 py-2 rounded hover:bg-gray-300 transition"
          >
            Volver
          </button>
        </div>

        <p className="text-sm text-gray-500">
          ¿No tienes una cuenta?{' '}
          <span
            onClick={() => navigate('/registro')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Regístrate aquí
          </span>
        </p>
      </div>
    </div>
  );
}










