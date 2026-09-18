import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { Users, Edit2, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Piso { id: number; nombre: string; sede: { nombre: string } }
interface Usuario { id: number; nombreUsuario: string; nombreCompleto: string; rol: string; activo: boolean; pisosAsignados: number[] }

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [todosPisos, setTodosPisos] = useState<Piso[]>([]);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({ nombreUsuario: '', nombreCompleto: '', rol: 1, password: '', pisosAsignados: [] });

  const roles = [
    { value: 0, label: 'Administrador' },
    { value: 1, label: 'Operador' },
    { value: 2, label: 'Gerencia' }
  ];

  useEffect(() => {
    fetchUsuarios();
    fetchPisos();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await client.get('/admin/usuarios?incluirInactivos=true');
      setUsuarios(res.data);
    } catch (err: any) {
      setError('Error al cargar usuarios');
    }
  };

  const fetchPisos = async () => {
    try {
      // Get all pisos to allow assigning to operator
      const res = await client.get('/admin/pisos?incluirInactivos=false');
      setTodosPisos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await client.put(`/admin/usuarios/${form.id}`, form);
      } else {
        await client.post('/admin/usuarios', form);
      }
      setIsEditing(false);
      fetchUsuarios();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar/Desactivar usuario?')) return;
    try {
      await client.delete(`/admin/usuarios/${id}`);
      fetchUsuarios();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const handlePisoToggle = (pisoId: number) => {
    const arr = form.pisosAsignados;
    if (arr.includes(pisoId)) {
      setForm({ ...form, pisosAsignados: arr.filter((id: number) => id !== pisoId) });
    } else {
      setForm({ ...form, pisosAsignados: [...arr, pisoId] });
    }
  };

  const openNew = () => {
    setForm({ nombreUsuario: '', nombreCompleto: '', rol: 1, password: '', pisosAsignados: [], activo: true });
    setIsEditing(true);
  };

  const openEdit = (u: Usuario) => {
    setForm({ 
      id: u.id, 
      nombreUsuario: u.nombreUsuario, 
      nombreCompleto: u.nombreCompleto, 
      rol: roles.find(r => r.label === u.rol)?.value || 1, 
      password: '', 
      activo: u.activo,
      pisosAsignados: u.pisosAsignados
    });
    setIsEditing(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border-t-4 border-creo-vino">
        <h2 className="text-xl font-bold flex items-center text-gray-800">
          <Users className="mr-2 text-creo-vino" /> Administración de Usuarios
        </h2>
        {!isEditing && (
          <button onClick={openNew} className="bg-creo-vino text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-red-900">
            <Plus size={16} className="mr-1" /> Nuevo Usuario
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm border border-red-200">
          <AlertCircle className="mr-2 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">{form.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nombre Completo</label>
                <input type="text" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-creo-vino focus:ring-2" required />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Usuario</label>
                <input type="text" value={form.nombreUsuario} onChange={e => setForm({...form, nombreUsuario: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-creo-vino focus:ring-2" required />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Contraseña {form.id && '(Dejar en blanco para no cambiar)'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-creo-vino focus:ring-2" required={!form.id} minLength={6} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Rol</label>
                <select value={form.rol} onChange={e => setForm({...form, rol: Number(e.target.value)})} className="w-full p-2 border rounded outline-none focus:ring-creo-vino focus:ring-2">
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {form.rol === 1 && ( // Operador
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pisos Asignados</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {todosPisos.map(p => (
                    <label key={p.id} className="flex items-center space-x-2 text-sm bg-white p-2 border rounded">
                      <input 
                        type="checkbox" 
                        checked={form.pisosAsignados.includes(p.id)}
                        onChange={() => handlePisoToggle(p.id)}
                        className="text-creo-vino rounded focus:ring-creo-vino"
                      />
                      <span>{p.sede?.nombre} - {p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.id && (
              <div className="flex items-center mt-4">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="mr-2 rounded" />
                <label className="text-sm">Usuario Activo</label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-creo-vino text-white rounded hover:bg-red-900">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map(u => (
              <tr key={u.id} className={!u.activo ? 'bg-gray-50 opacity-75' : ''}>
                <td className="px-6 py-4 font-medium">{u.nombreUsuario}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.nombreCompleto}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{u.rol}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(u)} className="text-blue-600 mr-3"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
