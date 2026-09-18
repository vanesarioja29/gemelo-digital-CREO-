import { useState, useEffect } from 'react';
import client from '../../api/client';
import { Settings, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Zona { id: number; nombre: string; enSeguimiento: boolean; }
interface Piso { id: number; nombre: string; sede: { nombre: string } }

export default function OperadorSeguimiento() {
  const { user } = useAuth();
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [selectedPiso, setSelectedPiso] = useState<number | ''>('');
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si es admin, puede ver todos los pisos. Si es operador, ve solo los suyos.
    const fetchPisos = async () => {
      try {
        const url = user?.rol === 'Administrador' ? '/admin/pisos' : '/pisos';
        const res = await client.get(url);
        setPisos(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPisos();
  }, [user]);

  useEffect(() => {
    if (selectedPiso) {
      fetchZonas();
    } else {
      setZonas([]);
    }
  }, [selectedPiso]);

  const fetchZonas = async () => {
    try {
      const res = await client.get(`/operador/seguimiento?pisoId=${selectedPiso}`);
      setZonas(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar zonas');
    }
  };

  const handleToggle = async (zonaId: number, currentEstado: boolean) => {
    try {
      await client.put(`/operador/seguimiento/${zonaId}`, { enSeguimiento: !currentEstado });
      setZonas(zonas.map(z => z.id === zonaId ? { ...z, enSeguimiento: !currentEstado } : z));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar zona');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-creo-vino">
        <h2 className="text-xl font-bold flex items-center text-gray-800 mb-4">
          <Settings className="mr-2 text-creo-vino" /> Configuración de Seguimiento (Radar)
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Activa o desactiva qué zonas deseas monitorear activamente en tu Dashboard. Las zonas apagadas no se mostrarán en el mapa de calor ni computarán en los KPIs en vivo.
        </p>

        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-700">Seleccionar Piso:</label>
          <select 
            value={selectedPiso} 
            onChange={(e) => setSelectedPiso(e.target.value ? Number(e.target.value) : '')}
            className="p-2 border rounded outline-none focus:ring-2 focus:ring-creo-vino flex-1 max-w-sm"
          >
            <option value="">-- Seleccione un piso --</option>
            {pisos.map(p => <option key={p.id} value={p.id}>{p.sede?.nombre} - {p.nombre}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm border border-red-200 mb-4">
            <AlertCircle className="mr-2 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        {selectedPiso && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Zonas Activas del Piso</h3>
            {zonas.map(z => (
              <div key={z.id} className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${z.enSeguimiento ? 'bg-red-50 border-creo-vino' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`font-medium ${z.enSeguimiento ? 'text-creo-vino' : 'text-gray-500'}`}>{z.nombre}</span>
                <button 
                  onClick={() => handleToggle(z.id, z.enSeguimiento)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${z.enSeguimiento ? 'text-creo-vino bg-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  {z.enSeguimiento ? (
                    <><ToggleRight size={24} className="text-creo-verde" /> ON</>
                  ) : (
                    <><ToggleLeft size={24} className="text-gray-400" /> OFF</>
                  )}
                </button>
              </div>
            ))}
            {zonas.length === 0 && <p className="text-gray-500 text-sm">No hay zonas activas en este piso.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
