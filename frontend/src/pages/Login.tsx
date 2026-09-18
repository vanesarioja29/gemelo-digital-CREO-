import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-creo-vino">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-creo-vino text-white p-3 rounded-full mb-4 shadow-md">
            <Activity size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">GD-CREO+</h1>
          <p className="text-gray-500 text-sm">Gemelo Digital de Flujo Hospitalario</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center mb-6 border border-red-200">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-creo-vino focus:border-transparent outline-none"
              placeholder="Ingrese su usuario..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-creo-vino focus:border-transparent outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-creo-vino hover:bg-red-900 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
