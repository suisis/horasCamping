// src/pages/Registro.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { Eye, EyeOff } from 'lucide-react';

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    password: '', // para usuarios NO master
    clave: ''     // para master (se usará como password en Auth)
  });

  const [mostrarPass, setMostrarPass] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Cambia este número por el del master
  const esMaster = formData.telefono.trim() === '666666666';

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { nombre, apellido, telefono, correo, password, clave } = formData;

    if (!nombre || !apellido || !telefono || !correo) {
      Swal.fire('Error', 'Todos los campos (nombre, apellido, teléfono, correo) son obligatorios.', 'error');
      return;
    }

    // Para master, exigimos "clave"; para no master, exigimos "password"
    if (esMaster && !clave) {
      Swal.fire('Error', 'Debes escribir una CLAVE para el usuario master.', 'error');
      return;
    }
    if (!esMaster && !password) {
      Swal.fire('Error', 'Debes escribir una CONTRASEÑA.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1) Crear usuario en Auth
      const passFinal = esMaster ? clave : password;
      const cred = await createUserWithEmailAndPassword(auth, correo.trim(), passFinal);
      const user = cred.user;

      // 2) Calcular expiración
      let primerAcceso = new Date().toISOString();
      let expiracion = null; // ilimitada para master
      if (!esMaster) {
        const ahora = new Date();
        const exp = new Date(ahora);
        exp.setDate(exp.getDate() + 3);
        expiracion = exp.toISOString();
      }

      // 3) Guardar perfil en Firestore (registros/{uid})
      await setDoc(doc(db, 'registros', user.uid), {
        uid: user.uid,
        nombre,
        apellido,
        telefono,
        correo: correo.trim(),
        esMaster,
        // Campos de compatibilidad con tu lógica anterior
        clave: esMaster ? passFinal : '', // no se usará en client, pero lo dejamos por compatibilidad
        primerAcceso,
        expiracion,                       // null si master (ilimitado)
        creadoEn: serverTimestamp(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Registro exitoso',
        html: esMaster
          ? `<p>✅ Registro como <strong>MASTER</strong> completado.</p>
              <p>Tu <strong>Clave</strong> será tu contraseña de acceso.</p>`
          : `<p>✅ Registro completado.</p>
              <p>Ahora puedes iniciar sesión con tu correo y contraseña.</p>`,
        confirmButtonText: 'Ir a iniciar sesión'
      });

      navigate('/login');
    } catch (error) {
      console.error('Error al registrar:', error.code, error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fef9f4] to-[#e0e7ff] px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 backdrop-blur-md p-8 rounded-lg shadow-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-[#002c54]">Registro</h2>

        <input
          name="nombre"
          type="text"
          placeholder="Nombre"
          value={formData.nombre}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          name="apellido"
          type="text"
          placeholder="Apellido"
          value={formData.apellido}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          name="telefono"
          type="tel"
          placeholder="Número de teléfono"
          value={formData.telefono}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          name="correo"
          type="email"
          placeholder="Correo electrónico"
          value={formData.correo}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        {/* Si es master, pedimos CLAVE (será su password en Auth).
            Si no es master, pedimos CONTRASEÑA normal. */}
        {esMaster ? (
          <div className="relative">
            <input
              name="clave"
              type={mostrarClave ? 'text' : 'password'}
              placeholder="Clave (master)"
              value={formData.clave}
              onChange={handleChange}
              className="w-full p-2 border rounded pr-10"
              required
            />
            <div
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500"
              onClick={() => setMostrarClave(!mostrarClave)}
              title={mostrarClave ? 'Ocultar' : 'Mostrar'}
            >
              {mostrarClave ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              name="password"
              type={mostrarPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded pr-10"
              required
            />
            <div
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500"
              onClick={() => setMostrarPass(!mostrarPass)}
              title={mostrarPass ? 'Ocultar' : 'Mostrar'}
            >
              {mostrarPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 max-w-[160px] bg-[#002c54] text-white px-6 py-2 rounded hover:bg-[#004080] transition disabled:opacity-60"
          >
            {loading ? 'Registrando…' : 'Registrarse'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 max-w-[160px] bg-gray-200 text-[#002c54] px-6 py-2 rounded hover:bg-gray-300 transition"
          >
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}




