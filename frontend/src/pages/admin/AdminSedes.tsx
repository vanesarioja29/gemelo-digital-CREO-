import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { Map, Edit2, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Sede {
  id: number;
  nombre: string;
  direccion: string;
  activa: boolean;
}

export default function AdminSedes() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentSede, setCurrentSede] = useState<Partial<Sede>>({ nombre: '', direccion: '' });

  const fetchSedes = async () => {
    try {
      const res = await client.get('/admin/sedes?incluirInactivas=true');
      setSedes(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar sedes');
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (currentSede.id) {
        await client.put(`/admin/sedes/${currentSede.id}`, currentSede);
      } else {
        await client.post('/admin/sedes', currentSede);
      }
      setIsEditing(false);
      setCurrentSede({ nombre: '', direccion: '' });
      fetchSedes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la sede');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Deseas eliminar/desactivar esta sede?')) return;
    try {
      await client.delete(`/admin/sedes/${id}`);
      fetchSedes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar la sede');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border-t-4 border-creo-vino">
        <h2 className="text-xl font-bold flex items-center text-gray-800">
          <Map className="mr-2 text-creo-vino" /> Administración de Sedes
        </h2>
        {!isEditing && (
          <button 
            onClick={() => { setIsEditing(true); setCurrentSede({ nombre: '', direccion: '', activa: true }); setError(''); }}
            className="bg-creo-vino hover:bg-red-900 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <Plus size={16} className="mr-1" /> Nueva Sede
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm border border-red-200">
          <AlertCircle className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">{currentSede.id ? 'Editar Sede' : 'Nueva Sede'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={currentSede.nombre}
                  onChange={e => setCurrentSede({...currentSede, nombre: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-creo-vino outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input 
                  type="text" 
                  value={currentSede.direccion}
                  onChange={e => setCurrentSede({...currentSede, direccion: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-creo-vino outline-none" 
                  required 
                />
              </div>
              {currentSede.id && (
                <div className="flex items-center mt-6">
                  <input 
                    type="checkbox" 
                    checked={currentSede.activa} 
                    onChange={e => setCurrentSede({...currentSede, activa: e.target.checked})}
                    className="h-4 w-4 text-creo-vino rounded" 
                  />
                  <label className="ml-2 block text-sm text-gray-900">Activa</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-creo-vino text-white rounded hover:bg-red-900"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sedes.map(sede => (
              <tr key={sede.id} className={sede.activa ? '' : 'bg-gray-50 opacity-75'}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sede.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sede.direccion}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sede.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {sede.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => { setCurrentSede(sede); setIsEditing(true); setError(''); }} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(sede.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {sedes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay sedes registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
