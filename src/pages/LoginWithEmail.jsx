// src/pages/LoginWithEmail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
      // 1) Iniciar sesión en Auth
      const cred = await signInWithEmailAndPassword(auth, correo.trim(), password);
      const user = cred.user;

      // 2) Obtener datos adicionales del perfil en Firestore
      const docRef = doc(db, 'registros', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Swal.fire('Error', 'No se encontraron datos de usuario en la base de datos.', 'error');
        return;
      }

      const data = docSnap.data();

      const esMaster = data.esMaster === true;

      if (!esMaster) {
        // Verificar caducidad
        if (!data.expiracion) {
          Swal.fire('Error', 'Este usuario no tiene fecha de expiración asignada.', 'error');
          return;
        }
        const fechaExp = new Date(data.expiracion);
        if (new Date() > fechaExp) {
          Swal.fire('Acceso caducado', 'Tu acceso ha expirado, contacta con soporte.', 'warning');
          return;
        }
      }

      // 3) Guardar sesión en localStorage
      localStorage.setItem(
        'usuarioActivo',
        JSON.stringify({
          uid: user.uid,
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          correo: data.correo,
          master: esMaster
        })
      );

      // 4) Mensaje de bienvenida
      let mensajeTiempo = '';
      if (!esMaster) {
        const fechaExp = new Date(data.expiracion);
        const diffMs = fechaExp - new Date();
        const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (dias <= 1) {
          const horas = Math.ceil(diffMs / (1000 * 60 * 60));
          mensajeTiempo = `<strong>⚠️ Tu acceso caduca en ${horas} hora(s)</strong>`;
        } else {
          mensajeTiempo = `Tu acceso es válido durante <strong>${dias} día(s)</strong> más.`;
        }
      } else {
        mensajeTiempo = `<strong>✅ Tu clave es ilimitada.</strong>`;
      }

      await Swal.fire({
        icon: 'success',
        title: `Bienvenido, ${data.nombre}`,
        html: `<p>${mensajeTiempo}</p>`,
        confirmButtonText: 'Continuar'
      });

      navigate('/configuracion');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Swal.fire('Error', error.message, 'error');
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









