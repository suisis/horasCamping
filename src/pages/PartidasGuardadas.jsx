import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  obtenerPartidasFirestore,
  borrarPartidaFirestore,
  actualizarPartidaFirestore
} from '../firebaseUtils';

export default function PartidasGuardadas() {
  const [partidas, setPartidas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const desdeRondas = location.state?.desdeRondas || false;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCargando(true);
      if (!user) {
        setPartidas([]);
        setCargando(false);
        Swal.fire('Sesión requerida', 'Inicia sesión para ver tus partidas.', 'info');
        return;
      }
      try {
        const datos = await obtenerPartidasFirestore();
        setPartidas(datos);
      } catch (e) {
        console.error('Error cargando partidas:', e);
        Swal.fire('Error', 'No se pudieron cargar tus partidas (permisos o sesión).', 'error');
        setPartidas([]);
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, []);

  const cargarPartida = (partida) => {
    // Guarda datos en localStorage
    localStorage.setItem('rondas', JSON.stringify(partida.rondas || []));
    localStorage.setItem('numEquipos', String(partida.equipos ?? 0));
    localStorage.setItem('numPistas', String(partida.pistas ?? 0));
    localStorage.setItem('nombresEquipos', JSON.stringify(partida.nombresEquipos || []));
    localStorage.setItem('partidaId', partida.id); // importante

    // Agrupar las rondas planas por número de ronda (si vienen planas)
    const agrupadas = (partida.rondas || []).reduce((acc, enf) => {
      const idx = (enf.ronda ?? 1) - 1;
      if (!acc[idx]) acc[idx] = [];
      acc[idx].push(enf);
      return acc;
    }, []);

    localStorage.setItem('rondas', JSON.stringify(agrupadas));
    localStorage.setItem('partidasGuardadas', JSON.stringify([{ ...partida }]));

    Swal.fire('Partida cargada', 'Has restaurado una partida anterior', 'success').then(() => {
      navigate('/rondas');
    });
  };

  const borrarPartida = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar esta partida?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    });

    if (!confirm.isConfirmed) return;

    try {
      await borrarPartidaFirestore(id);
      setPartidas(prev => prev.filter((p) => p.id !== id));
      Swal.fire('Eliminada', 'La partida ha sido eliminada de la nube', 'success');
    } catch (e) {
      console.error('Error al eliminar:', e);
      Swal.fire('Error', 'No tienes permiso para borrar esta partida.', 'error');
    }
  };

  const renombrarPartida = async (partida) => {
    const { value: nuevoNombre } = await Swal.fire({
      title: 'Renombrar Partida',
      input: 'text',
      inputLabel: 'Nuevo nombre de la partida',
      inputValue: partida.nombre || '',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) return 'El nombre no puede estar vacío';
      }
    });

    if (!nuevoNombre) return;

    try {
      await actualizarPartidaFirestore(partida.id, { nombre: nuevoNombre });
      setPartidas(prev =>
        prev.map((p) => (p.id === partida.id ? { ...p, nombre: nuevoNombre } : p))
      );
      Swal.fire('Nombre actualizado', 'La partida ha sido renombrada', 'success');
    } catch (e) {
      console.error('Error al renombrar:', e);
      Swal.fire('Error', 'No tienes permiso para editar esta partida.', 'error');
    }
  };

  const descargarPartidaJSON = (partida) => {
    const nombreArchivo = (partida.nombre || `partida_${partida.id}`).replace(/\s+/g, '_') + '.json';
    const jsonData = JSON.stringify(partida, null, 2);

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatFecha = (val) => {
    // val puede ser ISO string o undefined
    const d = val ? new Date(val) : new Date();
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
    // si guardases serverTimestamp(), aquí habría que usar toDate() tras leer el snap
  };

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold text-green-800 mb-6">Partidas Guardadas (en la nube)</h2>

      {cargando ? (
        <p className="text-gray-600">Cargando…</p>
      ) : partidas.length === 0 ? (
        <p className="text-gray-600">No hay partidas guardadas en Firestore.</p>
      ) : (
        <ul className="space-y-4">
          {partidas.map((partida) => (
            <li key={partida.id} className="border p-4 rounded shadow-md bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-green-700 mb-1">
                    {partida.nombre || `Partida sin nombre`}
                  </h3>
                  <p className="text-sm text-gray-600">Fecha: {formatFecha(partida.fecha)}</p>
                  <p className="text-sm text-gray-600">
                    Equipos: {partida.equipos} | Pistas: {partida.pistas}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => cargarPartida(partida)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Cargar
                  </button>
                  <button
                    onClick={() => renombrarPartida(partida)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={() => descargarPartidaJSON(partida)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Descargar JSON
                  </button>
                  <button
                    onClick={() => borrarPartida(partida.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/configuracion')}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Volver a Configuración
      </button>

      {desdeRondas && (
        <button
          onClick={() => navigate('/rondas')}
          className="mt-2 ml-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Volver a Rondas
        </button>
      )}
    </div>
  );
}




