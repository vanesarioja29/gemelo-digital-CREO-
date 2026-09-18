import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Filter } from 'lucide-react';

interface Sede { id: number; nombre: string; }
interface Piso { id: number; nombre: string; }
interface Zona { id: number; nombre: string; }

interface FiltroProps {
  onFilterChange: (pisoIds: number[], zonaId: number | null) => void;
}

export default function FiltroContexto({ onFilterChange }: FiltroProps) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSede, setSelectedSede] = useState<number | ''>('');

  const [pisosDisponibles, setPisosDisponibles] = useState<Piso[]>([]);
  const [selectedPisos, setSelectedPisos] = useState<Piso[]>([]);
  const [showPisosDropdown, setShowPisosDropdown] = useState(false);

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [selectedZona, setSelectedZona] = useState<number | ''>('');

  useEffect(() => {
    if (isAdmin) {
      client.get('/admin/sedes?incluirInactivas=false').then(res => {
        setSedes(res.data);
        if (res.data.length > 0) setSelectedSede(res.data[0].id);
      }).catch(console.error);
    } else {
      setSedes([{ id: 1, nombre: 'CREO+ San Isidro' }]);
      setSelectedSede(1);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSede) {
      const endpoint = isAdmin ? `/admin/pisos?sedeId=${selectedSede}&incluirInactivos=false` : `/pisos?sedeId=${selectedSede}`;
      client.get(endpoint).then(res => {
        const p = res.data;
        setPisosDisponibles(p);
        
        // Auto-select based on role
        if (!isAdmin && user?.pisosAsignados?.length) {
          const assigned = p.filter((x: Piso) => user.pisosAsignados.includes(x.id));
          setSelectedPisos(assigned.length > 0 ? assigned : (p.length > 0 ? [p[0]] : []));
        } else if (p.length > 0) {
          setSelectedPisos([p[0]]);
        } else {
          setSelectedPisos([]);
        }
      }).catch(console.error);
    }
  }, [selectedSede, isAdmin, user?.pisosAsignados]);

  useEffect(() => {
    if (selectedPisos.length === 1) {
      const pid = selectedPisos[0].id;
      const endpoint = isAdmin ? `/admin/zonas?pisoId=${pid}&incluirInactivas=false` : `/operador/seguimiento?pisoId=${pid}`;
      client.get(endpoint).then(res => {
        setZonas(res.data);
        setSelectedZona('');
      }).catch(console.error);
    } else {
      setZonas([]);
      setSelectedZona('');
    }
  }, [selectedPisos, isAdmin]);

  // Emit changes to parent
  useEffect(() => {
    const pIds = selectedPisos.map(p => p.id);
    const zId = selectedZona ? Number(selectedZona) : null;
    onFilterChange(pIds, zId);
  }, [selectedPisos, selectedZona, onFilterChange]);

  const unselectedPisos = pisosDisponibles.filter(p => !selectedPisos.find(sp => sp.id === p.id));

  const addPiso = (p: Piso) => {
    setSelectedPisos([...selectedPisos, p]);
    setShowPisosDropdown(false);
  };

  const removePiso = (id: number) => {
    setSelectedPisos(selectedPisos.filter(p => p.id !== id));
  };

  return (
    <div className="bg-white p-4 shadow-sm mb-6 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div className="flex flex-wrap items-center gap-4 text-sm w-full md:w-auto">
        <div className="flex items-center text-creo-vino font-semibold border-r pr-4 border-gray-200">
          <Filter size={16} className="mr-2" /> Contexto
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500">Sede:</span>
          {isAdmin ? (
            <select 
              value={selectedSede} 
              onChange={e => setSelectedSede(Number(e.target.value))}
              className="border-none bg-gray-50 rounded-lg p-1.5 focus:ring-1 focus:ring-creo-vino outline-none font-medium"
            >
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <span className="font-medium bg-gray-50 p-1.5 rounded-lg">{sedes[0]?.nombre || 'Cargando...'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          <span className="text-gray-500">Pisos:</span>
          <div className="flex flex-wrap gap-1 items-center">
            {selectedPisos.map(p => (
              <span key={p.id} className="bg-creo-vino text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                {p.nombre}
                <button onClick={() => removePiso(p.id)} className="ml-1 hover:text-red-200 focus:outline-none">
                  <X size={12} />
                </button>
              </span>
            ))}
            {unselectedPisos.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowPisosDropdown(!showPisosDropdown)}
                  className="text-creo-vino bg-red-50 hover:bg-red-100 px-2 py-1 rounded-full text-xs font-medium flex items-center transition-colors border border-red-100"
                >
                  <Plus size={12} className="mr-1" /> Agregar
                </button>
                {showPisosDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg rounded-lg z-50 w-32 py-1">
                    {unselectedPisos.map(up => (
                      <button 
                        key={up.id} 
                        onClick={() => addPiso(up)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        {up.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedPisos.length === 0 && <span className="text-gray-400 italic text-xs">Ninguno</span>}
          </div>
        </div>

        {selectedPisos.length === 1 && (
          <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
            <span className="text-gray-500">Zona:</span>
            <select 
              value={selectedZona} 
              onChange={e => setSelectedZona(e.target.value ? Number(e.target.value) : '')}
              className="border-none bg-gray-50 rounded-lg p-1.5 focus:ring-1 focus:ring-creo-vino outline-none font-medium"
            >
              <option value="">Todas las zonas</option>
              {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border">
        Mostrando datos de: {sedes.find(s => s.id === selectedSede)?.nombre || 'Sede'} 
        {' · '}
        {selectedPisos.length === 0 ? 'Sin pisos' : selectedPisos.length === 1 ? `${selectedPisos[0].nombre}` : `${selectedPisos.length} pisos`}
        {selectedPisos.length === 1 && selectedZona && ` - ${zonas.find(z => z.id === selectedZona)?.nombre}`}
      </div>
    </div>
  );
}
