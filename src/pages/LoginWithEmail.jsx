// src/pages/LoginWithEmail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginWithEmail() {
  const [email, setEmail] = useState('');
  const [passwordOrClave, setPasswordOrClave] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [soyMaster, setSoyMaster] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !passwordOrClave) {
      Swal.fire('Error', 'Debes rellenar todos los campos', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1) Autenticación con Auth (para master y no master)
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), passwordOrClave);
      const user = userCred.user;

      // 2) Perfil en Firestore (doc por UID)
      let perfil;
      const docRef = doc(db, 'registros', user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        perfil = { id: snap.id, ...snap.data() };
      } else {
        // Compatibilidad por si ya tienes docs antiguos por correo
        const q = query(collection(db, 'registros'), where('correo', '==', email.trim()));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const d = qs.docs[0];
          perfil = { id: d.id, ...d.data() };
        }
      }

      if (!perfil) {
        Swal.fire('Error', 'No se encontró tu perfil en Firestore.', 'error');
        return;
      }

      // 3) Persistir sesión visible para tu app
      localStorage.setItem('usuarioActivo', JSON.stringify({
        uid: perfil.id,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.correo,
        telefono: perfil.telefono,
        master: perfil.esMaster === true,
      }));

      await Swal.fire({
        icon: 'success',
        title: `Bienvenido, ${perfil.nombre || ''}`.trim(),
        html: (perfil.esMaster ? '<strong>Acceso como MASTER</strong>' : ''),
        confirmButtonText: 'Continuar',
      });

      navigate('/configuracion');
    } catch (error) {
      console.error('Error al iniciar sesión:', error.code, error.message);
      Swal.fire('Error al iniciar sesión', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fef9f4] to-[#e0e7ff] px-4">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#002c54]">Iniciar sesión</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full px-4 py-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={soyMaster}
              onChange={(e) => setSoyMaster(e.target.checked)}
            />
            Soy master
          </label>
          <span className="text-gray-500">
            {soyMaster ? 'Introduce tu Clave (password de Auth)' : 'Introduce tu Contraseña'}
          </span>
        </div>

        <div className="relative">
          <input
            type={mostrar ? 'text' : 'password'}
            placeholder={soyMaster ? 'Clave (master)' : 'Contraseña'}
            className="w-full px-4 py-2 border rounded pr-10"
            value={passwordOrClave}
            onChange={(e) => setPasswordOrClave(e.target.value)}
            required
          />
          <div
            className="absolute right-2 top-2 cursor-pointer text-gray-500"
            onClick={() => setMostrar(!mostrar)}
          >
            {mostrar ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#002c54] text-white px-6 py-2 rounded hover:bg-[#004080] transition disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>

        <p className="text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <span
            onClick={() => navigate('/registro')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Regístrate aquí
          </span>
        </p>
      </form>
    </div>
  );
}







