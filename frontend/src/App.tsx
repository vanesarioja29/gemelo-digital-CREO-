import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, Clock, CheckCircle, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [kpis, setKpis] = useState({ aforoActual: 0, tiempoEsperaPromedio: 0, duracionConsultaPromedio: 0, pacientesAtendidos: 0 });
  const [mapaCalor, setMapaCalor] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [aforoHistorico, setAforoHistorico] = useState<any[]>([]);

  useEffect(() => {
    // Para simplificar, obtenemos los datos al montar (en real-time se usaría polling o SignalR/WebSocket)
    const fetchData = async () => {
      try {
        const [kpiRes, mapaRes, actRes, aforoRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/kpis`),
          axios.get(`${API_BASE}/dashboard/mapa-calor`),
          axios.get(`${API_BASE}/dashboard/actividad-circuito?limit=6`),
          axios.get(`${API_BASE}/dashboard/aforo-historico?fecha=hoy`)
        ]);
        
        setKpis(kpiRes.data);
        setMapaCalor(mapaRes.data);
        setActividad(actRes.data);
        setAforoHistorico(aforoRes.data);
      } catch (error) {
        console.error("Error fetching data, using mock data for UI", error);
        // Fallback mock data in case backend isn't up
        setKpis({ aforoActual: 15, tiempoEsperaPromedio: 22, duracionConsultaPromedio: 18, pacientesAtendidos: 45 });
        setMapaCalor([
          { zonaId: 1, nombre: 'Admisión', ocupacion: 2, aforoMaximo: 10, porcentaje: 20, color: 'verde' },
          { zonaId: 2, nombre: 'Sala de Espera General', ocupacion: 18, aforoMaximo: 20, porcentaje: 90, color: 'amarillo' },
          { zonaId: 3, nombre: 'Consultorio Piloto', ocupacion: 3, aforoMaximo: 3, porcentaje: 100, color: 'rojo' }
        ]);
        setActividad([
          { id: 1, codigoPacienteAnonimo: 'Paciente #123', zonaActual: 'Consultorio Piloto', estado: 'EnCircuito' },
          { id: 2, codigoPacienteAnonimo: 'Paciente #456', zonaActual: 'Sala de Espera', estado: 'EnCircuito' },
        ]);
        setAforoHistorico([{ hora: '8:00', aforo: 5 }, { hora: '9:00', aforo: 12 }, { hora: '10:00', aforo: 25 }]);
      }
    };
    fetchData();
  }, []);

  const getColorClass = (colorStr: string) => {
    if (colorStr === 'verde') return 'bg-creo-verde text-white';
    if (colorStr === 'amarillo') return 'bg-creo-naranja text-white';
    if (colorStr === 'rojo') return 'bg-red-600 text-white';
    return 'bg-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-creo-vino text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Activity className="mr-2" /> GD-CREO+ Dashboard
          </h1>
          <div className="text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">Sede: CREO+ San Isidro</span>
            <span className="bg-white/20 px-3 py-1 rounded-full ml-2">Piso: 1</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top KPIs Row (Spans full width) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-vino flex items-center">
            <Users className="text-creo-vino mr-4" size={32} />
            <div>
              <p className="text-creo-gris text-sm">Aforo Actual</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.aforoActual}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-naranja flex items-center">
            <Clock className="text-creo-naranja mr-4" size={32} />
            <div>
              <p className="text-creo-gris text-sm">T. Espera Prom.</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.tiempoEsperaPromedio} min</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-verde flex items-center">
            <Activity className="text-creo-verde mr-4" size={32} />
            <div>
              <p className="text-creo-gris text-sm">T. Consulta Prom.</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.duracionConsultaPromedio} min</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500 flex items-center">
            <CheckCircle className="text-blue-500 mr-4" size={32} />
            <div>
              <p className="text-creo-gris text-sm">Pacientes Atendidos</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.pacientesAtendidos}</p>
            </div>
          </div>
        </div>

        {/* Mapa de Calor y Actividad */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4 text-creo-vino border-b pb-2 flex items-center">
              <MapPin className="mr-2" /> Mapa de Calor (Zonas)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mapaCalor.map(z => (
                <div key={z.zonaId} className={`p-4 rounded-lg shadow-sm border flex flex-col items-center justify-center text-center h-32 ${getColorClass(z.color)}`}>
                  <p className="font-semibold">{z.nombre}</p>
                  <p className="text-3xl font-bold">{z.ocupacion} / {z.aforoMaximo}</p>
                  <p className="text-sm opacity-80">{Math.round(z.porcentaje)}% ocupado</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4 text-creo-vino border-b pb-2">Aforo Histórico</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aforoHistorico}>
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="aforo" fill="#AA0831" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Actividad en Circuito (Sidebar) */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow h-full">
            <h2 className="text-xl font-bold mb-4 text-creo-vino border-b pb-2">Actividad en Circuito</h2>
            <div className="space-y-4">
              {actividad.map(act => (
                <div key={act.id} className="border-l-2 border-creo-naranja pl-3">
                  <p className="font-bold text-gray-800">{act.codigoPacienteAnonimo}</p>
                  <p className="text-sm text-creo-gris flex justify-between">
                    <span>{act.zonaActual}</span>
                    <span className="bg-gray-100 px-2 rounded text-xs">{act.estado}</span>
                  </p>
                </div>
              ))}
              {actividad.length === 0 && (
                <p className="text-gray-500 italic">No hay actividad reciente.</p>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
