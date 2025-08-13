// src/pages/RegisterWithEmail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterWithEmail() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!nombre || !apellido || !correo || !telefono || !password) {
      Swal.fire('Error', 'Todos los campos son obligatorios.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1) Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, correo.trim(), password);
      const user = userCredential.user;

      // 2) Crear doc en registros/{uid}
      const ahora = new Date();
      const exp = new Date(ahora);
      exp.setDate(exp.getDate() + 3);

      await setDoc(doc(db, 'registros', user.uid), {
        uid: user.uid,
        nombre,
        apellido,
        correo: correo.trim(),
        telefono,
        esMaster: false,                 // por seguridad, el master lo marca un admin
        clave: '',                       // compatibilidad (no se usa con Auth)
        primerAcceso: ahora.toISOString(),
        expiracion: exp.toISOString(),   // puedes quitar expiración si no la usas ya
        creadoEn: serverTimestamp(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Registro completado',
        text: 'Ahora puedes iniciar sesión con tu correo y contraseña.',
        confirmButtonText: 'Ir a login',
      });

      navigate('/login');
    } catch (error) {
      console.error('❌ Error en el registro:', error.code, error.message);
      Swal.fire('Error al registrar', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fef9f4] to-[#e0e7ff] px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#002c54]">Registro de usuario</h2>

        <input
          type="text"
          placeholder="Nombre"
          className="w-full px-4 py-2 border rounded"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="text"
          placeholder="Apellido"
          className="w-full px-4 py-2 border rounded"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full px-4 py-2 border rounded"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Teléfono"
          className="w-full px-4 py-2 border rounded"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        <div className="relative">
          <input
            type={mostrarTexto ? 'text' : 'password'}
            placeholder="Contraseña"
            className="w-full px-4 py-2 border rounded pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div
            className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
            onClick={() => setMostrarTexto(!mostrarTexto)}
          >
            {mostrarTexto ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-[#002c54] text-white px-6 py-2 rounded hover:bg-[#004080] transition disabled:opacity-60"
        >
          {loading ? 'Registrando…' : 'Registrarse'}
        </button>

        <p className="text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Inicia sesión aquí
          </span>
        </p>
      </div>
    </div>
  );
}





