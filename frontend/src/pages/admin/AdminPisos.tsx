import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { Settings, Edit2, Trash2, Plus, AlertCircle, Layers } from 'lucide-react';

interface Piso { id: number; sedeId: number; nombre: string; nivel: number; activo: boolean; }
interface Zona { id: number; pisoId: number; nombre: string; tipo: number; aforoMaximo: number; activa: boolean; enSeguimiento: boolean; }
interface Sede { id: number; nombre: string; }

export default function AdminPisos() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<number | ''>('');
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [selectedPiso, setSelectedPiso] = useState<Piso | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  
  const [error, setError] = useState('');
  
  // Modals / forms
  const [pisoForm, setPisoForm] = useState<Partial<Piso> | null>(null);
  const [zonaForm, setZonaForm] = useState<Partial<Zona> | null>(null);

  useEffect(() => {
    client.get('/admin/sedes?incluirInactivas=false')
      .then(res => setSedes(res.data))
      .catch(() => setError('Error al cargar sedes'));
  }, []);

  useEffect(() => {
    if (selectedSedeId) {
      fetchPisos();
      setSelectedPiso(null);
      setZonas([]);
    } else {
      setPisos([]);
      setSelectedPiso(null);
      setZonas([]);
    }
  }, [selectedSedeId]);

  useEffect(() => {
    if (selectedPiso) {
      fetchZonas();
    }
  }, [selectedPiso]);

  const fetchPisos = async () => {
    try {
      const res = await client.get(`/admin/pisos?sedeId=${selectedSedeId}&incluirInactivos=true`);
      setPisos(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar pisos');
    }
  };

  const fetchZonas = async () => {
    try {
      const res = await client.get(`/admin/zonas?pisoId=${selectedPiso?.id}&incluirInactivas=true`);
      setZonas(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar zonas');
    }
  };

  const handleSavePiso = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (pisoForm?.id) {
        await client.put(`/admin/pisos/${pisoForm.id}`, pisoForm);
      } else {
        await client.post('/admin/pisos', { ...pisoForm, sedeId: selectedSedeId });
      }
      setPisoForm(null);
      fetchPisos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar piso');
    }
  };

  const handleDeletePiso = async (id: number) => {
    if (!window.confirm('¿Eliminar piso?')) return;
    try {
      await client.delete(`/admin/pisos/${id}`);
      fetchPisos();
      if (selectedPiso?.id === id) setSelectedPiso(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar piso');
    }
  };

  const handleSaveZona = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (zonaForm?.id) {
        await client.put(`/admin/zonas/${zonaForm.id}`, zonaForm);
      } else {
        await client.post('/admin/zonas', { ...zonaForm, pisoId: selectedPiso?.id });
      }
      setZonaForm(null);
      fetchZonas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar zona');
    }
  };

  const handleDeleteZona = async (id: number) => {
    if (!window.confirm('¿Eliminar zona?')) return;
    try {
      await client.delete(`/admin/zonas/${id}`);
      fetchZonas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar zona');
    }
  };

  const tipoZonas = [
    { value: 0, label: 'No Definida' },
    { value: 1, label: 'Admisión' },
    { value: 2, label: 'Sala de Espera' },
    { value: 3, label: 'Consultorio' },
    { value: 4, label: 'Triaje' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-creo-vino flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center text-gray-800">
          <Settings className="mr-2 text-creo-vino" /> Pisos y Zonas
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Seleccionar Sede:</label>
          <select 
            value={selectedSedeId} 
            onChange={(e) => setSelectedSedeId(e.target.value ? Number(e.target.value) : '')}
            className="p-2 border rounded outline-none focus:ring-2 focus:ring-creo-vino"
          >
            <option value="">-- Seleccione --</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm border border-red-200">
          <AlertCircle className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedSedeId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna PISOS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 flex items-center"><Layers size={18} className="mr-2"/> Pisos</h3>
              <button 
                onClick={() => { setPisoForm({ nombre: '', nivel: 1, activo: true }); setError(''); }}
                className="text-creo-vino hover:text-red-900 text-sm font-medium flex items-center"
              >
                <Plus size={16} className="mr-1"/> Añadir Piso
              </button>
            </div>
            
            {pisoForm && (
              <form onSubmit={handleSavePiso} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 text-sm">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="text" placeholder="Nombre (ej. Piso 1)" value={pisoForm.nombre} onChange={e => setPisoForm({...pisoForm, nombre: e.target.value})} className="p-2 border rounded w-full" required />
                  <input type="number" placeholder="Nivel (ej. 1)" value={pisoForm.nivel} onChange={e => setPisoForm({...pisoForm, nivel: Number(e.target.value)})} className="p-2 border rounded w-full" required />
                </div>
                {pisoForm.id && (
                  <label className="flex items-center mb-2">
                    <input type="checkbox" checked={pisoForm.activo} onChange={e => setPisoForm({...pisoForm, activo: e.target.checked})} className="mr-2" /> Activo
                  </label>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setPisoForm(null)} className="px-3 py-1 bg-gray-200 rounded">Cancelar</button>
                  <button type="submit" className="px-3 py-1 bg-creo-vino text-white rounded">Guardar</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {pisos.map(p => (
                <div 
                  key={p.id} 
                  className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-colors ${selectedPiso?.id === p.id ? 'border-creo-vino bg-red-50' : 'border-gray-200 hover:bg-gray-50'} ${!p.activo ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedPiso(p)}
                >
                  <div>
                    <span className="font-medium text-gray-800">{p.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2">(Nivel {p.nivel})</span>
                    {!p.activo && <span className="text-xs bg-gray-200 px-1 ml-2 rounded">Inactivo</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setPisoForm(p); }} className="text-blue-600 hover:text-blue-900"><Edit2 size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePiso(p.id); }} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {pisos.length === 0 && <p className="text-sm text-gray-500 italic">No hay pisos.</p>}
            </div>
          </div>

          {/* Columna ZONAS */}
          {selectedPiso && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Zonas de {selectedPiso.nombre}</h3>
                <button 
                  onClick={() => { setZonaForm({ nombre: '', tipo: 0, aforoMaximo: 0, activa: true, enSeguimiento: true }); setError(''); }}
                  className="text-creo-verde hover:text-green-800 text-sm font-medium flex items-center"
                >
                  <Plus size={16} className="mr-1"/> Añadir Zona
                </button>
              </div>

              {zonaForm && (
                <form onSubmit={handleSaveZona} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 text-sm">
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    <input type="text" placeholder="Nombre Zona" value={zonaForm.nombre} onChange={e => setZonaForm({...zonaForm, nombre: e.target.value})} className="p-2 border rounded w-full" required />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={zonaForm.tipo} onChange={e => setZonaForm({...zonaForm, tipo: Number(e.target.value)})} className="p-2 border rounded w-full">
                        {tipoZonas.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input type="number" placeholder="Aforo Max." value={zonaForm.aforoMaximo || ''} onChange={e => setZonaForm({...zonaForm, aforoMaximo: Number(e.target.value)})} className="p-2 border rounded w-full" required />
                    </div>
                  </div>
                  {zonaForm.id && (
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center"><input type="checkbox" checked={zonaForm.activa} onChange={e => setZonaForm({...zonaForm, activa: e.target.checked})} className="mr-1" /> Activa</label>
                      <label className="flex items-center"><input type="checkbox" checked={zonaForm.enSeguimiento} onChange={e => setZonaForm({...zonaForm, enSeguimiento: e.target.checked})} className="mr-1" /> Seguimiento</label>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setZonaForm(null)} className="px-3 py-1 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-3 py-1 bg-creo-verde text-white rounded">Guardar</button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {zonas.map(z => (
                  <div key={z.id} className={`p-3 rounded-lg border border-gray-200 flex justify-between items-center ${!z.activa ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{z.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {tipoZonas.find(t => t.value === z.tipo)?.label} | Aforo: {z.aforoMaximo}
                        {!z.activa && ' | Inactiva'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setZonaForm(z)} className="text-blue-600 hover:text-blue-900"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteZona(z.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {zonas.length === 0 && <p className="text-sm text-gray-500 italic">No hay zonas en este piso.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
