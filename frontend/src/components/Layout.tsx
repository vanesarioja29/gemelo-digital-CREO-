import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, QrCode, Map, Settings, Users, FileText, Grid } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/sedes')) return 'Panel de Administración - Sedes';
    if (path.startsWith('/admin/pisos')) return 'Panel de Administración - Pisos y Zonas';
    if (path.startsWith('/admin/usuarios')) return 'Panel de Administración - Usuarios';
    if (path.startsWith('/admin')) return 'Panel de Administración';
    if (path.startsWith('/dashboard')) return 'Dashboard General';
    if (path.startsWith('/admision')) return 'Admisión de Pacientes';
    if (path.startsWith('/operador/config')) return 'Configuración de Seguimiento';
    if (path.startsWith('/operador/reportes')) return 'Reportes Históricos';
    return 'GD-CREO+';
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center mb-1 ${
      isActive ? 'bg-creo-vino text-white shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold flex items-center text-white">
            <Activity className="mr-2 text-creo-vino" /> GD-CREO+
          </h1>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <Grid size={18} className="mr-3" /> Dashboard
            </NavLink>
            
            {user.rol !== 'Gerencia' && (
              <NavLink to="/admision" className={navItemClass}>
                <QrCode size={18} className="mr-3" /> Admisión
              </NavLink>
            )}

            {user.rol === 'Administrador' && (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administración
                </div>
                <NavLink to="/admin/sedes" className={navItemClass}>
                  <Map size={18} className="mr-3" /> Sedes
                </NavLink>
                <NavLink to="/admin/pisos" className={navItemClass}>
                  <Settings size={18} className="mr-3" /> Pisos & Zonas
                </NavLink>
                <NavLink to="/admin/usuarios" className={navItemClass}>
                  <Users size={18} className="mr-3" /> Usuarios
                </NavLink>
              </>
            )}

            {(user.rol === 'Operador' || user.rol === 'Administrador') && (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Monitoreo
                </div>
                <NavLink to="/operador/config" className={navItemClass}>
                  <Settings size={18} className="mr-3" /> Seg. Zonas
                </NavLink>
                <NavLink to="/operador/reportes" className={navItemClass}>
                  <FileText size={18} className="mr-3" /> Reportes
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-creo-vino text-white p-4 shadow-md z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-wide">
              {getPageTitle()}
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-sm leading-tight">{user.nombreCompleto}</p>
                <p className="text-white/80 text-xs">{user.rol}</p>
              </div>
              <button 
                onClick={logout} 
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors focus:ring-2 focus:ring-white"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
