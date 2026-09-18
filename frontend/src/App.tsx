import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admision from './components/Admision';
import { useAuth } from './context/AuthContext';

import AdminSedes from './pages/admin/AdminSedes';
import AdminPisos from './pages/admin/AdminPisos';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import OperadorSeguimiento from './pages/operador/OperadorSeguimiento';
import OperadorReportes from './pages/operador/OperadorReportes';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.rol)) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="admision" element={
          <ProtectedRoute allowedRoles={['Administrador', 'Operador']}>
            <Admision />
          </ProtectedRoute>
        } />

        {/* Administrador Routes */}
        <Route path="admin/sedes" element={
          <ProtectedRoute allowedRoles={['Administrador']}>
            <AdminSedes />
          </ProtectedRoute>
        } />
        <Route path="admin/pisos" element={
          <ProtectedRoute allowedRoles={['Administrador']}>
            <AdminPisos />
          </ProtectedRoute>
        } />
        <Route path="admin/usuarios" element={
          <ProtectedRoute allowedRoles={['Administrador']}>
            <AdminUsuarios />
          </ProtectedRoute>
        } />

        {/* Operador/Administrador Routes */}
        <Route path="operador/config" element={
          <ProtectedRoute allowedRoles={['Administrador', 'Operador']}>
            <OperadorSeguimiento />
          </ProtectedRoute>
        } />
        <Route path="operador/reportes" element={
          <ProtectedRoute allowedRoles={['Administrador', 'Operador']}>
            <OperadorReportes />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
