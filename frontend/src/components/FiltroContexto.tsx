import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Plus } from 'lucide-react';

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
    <div className="bg-white px-4 md:px-6 py-3 mb-6 -mx-4 md:-mx-6 -mt-4 md:-mt-6 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-sm">
      <div className="flex flex-wrap items-center gap-6 text-sm w-full md:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Sede:</span>
          {isAdmin ? (
            <select 
              value={selectedSede} 
              onChange={e => setSelectedSede(Number(e.target.value))}
              className="border border-gray-200 bg-white rounded-lg p-1.5 focus:ring-1 focus:ring-creo-vino outline-none font-medium"
            >
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <span className="font-medium bg-white border border-gray-200 p-1.5 rounded-lg">{sedes[0]?.nombre || 'Cargando...'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 relative border-l pl-6 border-gray-200">
          <span className="text-gray-500">Pisos:</span>
          <div className="flex flex-wrap gap-2 items-center">
            {selectedPisos.map(p => (
              <span key={p.id} className="bg-red-50 text-creo-vino border border-red-100 px-3 py-1 rounded-md text-sm font-medium flex items-center">
                {p.nombre}
                <button onClick={() => removePiso(p.id)} className="ml-2 hover:text-creo-vino/70 focus:outline-none">
                  <X size={14} />
                </button>
              </span>
            ))}
            {unselectedPisos.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowPisosDropdown(!showPisosDropdown)}
                  className="text-gray-500 bg-white hover:bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors border border-gray-200 border-dashed"
                >
                  <Plus size={14} className="mr-1" /> Agregar
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
            {selectedPisos.length === 0 && <span className="text-gray-400 italic text-sm">Ninguno</span>}
          </div>
        </div>

        {selectedPisos.length === 1 && (
          <div className="flex items-center gap-2 border-l pl-6 border-gray-200">
            <span className="text-gray-500">Zona:</span>
            <select 
              value={selectedZona} 
              onChange={e => setSelectedZona(e.target.value ? Number(e.target.value) : '')}
              className="border border-gray-200 bg-white rounded-lg p-1.5 focus:ring-1 focus:ring-creo-vino outline-none font-medium"
            >
              <option value="">Todas las zonas</option>
              {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        Mostrando datos de: <span className="font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">{sedes.find(s => s.id === selectedSede)?.nombre || 'Sede'} 
        {' · '}
        {selectedPisos.length === 0 ? 'Sin pisos' : selectedPisos.length === 1 ? `${selectedPisos[0].nombre}` : `${selectedPisos.length} pisos`}
        {selectedPisos.length === 1 && selectedZona && ` · ${zonas.find(z => z.id === selectedZona)?.nombre}`}
        </span>
      </div>
    </div>
  );
}
