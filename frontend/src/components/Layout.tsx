import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, QrCode, Map, Settings, Users, FileText } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-creo-vino text-white p-4 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold flex items-center">
              <Activity className="mr-2" /> GD-CREO+
            </h1>
            <nav className="hidden md:flex gap-1 bg-white/10 p-1 rounded-lg">
              <NavLink 
                to="/dashboard" 
                className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
              >
                Dashboard
              </NavLink>
              
              {user.rol !== 'Gerencia' && (
                <NavLink 
                  to="/admision" 
                  className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                >
                  <QrCode size={16} className="mr-1" /> Admisión
                </NavLink>
              )}

              {user.rol === 'Administrador' && (
                <>
                  <NavLink 
                    to="/admin/sedes" 
                    className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                  >
                    <Map size={16} className="mr-1" /> Sedes
                  </NavLink>
                  <NavLink 
                    to="/admin/pisos" 
                    className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                  >
                    <Settings size={16} className="mr-1" /> Pisos & Zonas
                  </NavLink>
                  <NavLink 
                    to="/admin/usuarios" 
                    className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                  >
                    <Users size={16} className="mr-1" /> Usuarios
                  </NavLink>
                </>
              )}

              {(user.rol === 'Operador' || user.rol === 'Administrador') && (
                <>
                  <NavLink 
                    to="/operador/config" 
                    className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                  >
                    <Settings size={16} className="mr-1" /> Seg. Zonas
                  </NavLink>
                  <NavLink 
                    to="/operador/reportes" 
                    className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive ? 'bg-white text-creo-vino shadow' : 'text-white hover:bg-white/20'}`}
                  >
                    <FileText size={16} className="mr-1" /> Reportes
                  </NavLink>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right hidden sm:block">
              <p className="font-semibold">{user.nombreCompleto}</p>
              <p className="text-white/70 text-xs">{user.rol}</p>
            </div>
            <button 
              onClick={logout} 
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        
        {/* Mobile Nav would go here, omitting for brevity or simply relying on responsive flex-wrap */}
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
