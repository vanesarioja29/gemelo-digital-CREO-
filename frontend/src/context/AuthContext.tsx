import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export type Rol = 'Administrador' | 'Operador' | 'Gerencia';

interface User {
  nombreCompleto: string;
  rol: Rol;
  pisosAsignados: number[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('gdcreo_token');
    const storedUser = localStorage.getItem('gdcreo_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (nombreUsuario: string, password: string) => {
    try {
      const res = await client.post('/auth/login', { nombreUsuario, password });
      const { token, rol, nombreCompleto, pisosAsignados } = res.data;
      
      const userData: User = { nombreCompleto, rol, pisosAsignados };
      
      localStorage.setItem('gdcreo_token', token);
      localStorage.setItem('gdcreo_user', JSON.stringify(userData));
      
      setToken(token);
      setUser(userData);
      
      navigate('/');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error en el inicio de sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('gdcreo_token');
    localStorage.removeItem('gdcreo_user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
