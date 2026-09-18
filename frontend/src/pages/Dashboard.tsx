import { useState, useEffect } from 'react';
import { Activity, Users, Clock, CheckCircle, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';

export default function Dashboard() {
  const [kpis, setKpis] = useState({ aforoActual: 0, tiempoEsperaPromedio: 0, duracionConsultaPromedio: 0, pacientesAtendidos: 0 });
  const [mapaCalor, setMapaCalor] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [aforoHistorico, setAforoHistorico] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, mapaRes, actRes, aforoRes] = await Promise.all([
          client.get(`/dashboard/kpis`),
          client.get(`/dashboard/mapa-calor`),
          client.get(`/dashboard/actividad-circuito?limit=6`),
          client.get(`/dashboard/aforo-historico?fecha=hoy`)
        ]);
        
        setKpis(kpiRes.data);
        setMapaCalor(mapaRes.data);
        setActividad(actRes.data);
        setAforoHistorico(aforoRes.data);
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getColorClass = (colorStr: string) => {
    if (colorStr === 'verde') return 'bg-creo-verde text-white';
    if (colorStr === 'amarillo') return 'bg-creo-naranja text-white';
    if (colorStr === 'rojo') return 'bg-red-600 text-white';
    return 'bg-gray-200';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4 text-creo-vino border-b pb-2 flex items-center">
            <MapPin className="mr-2" /> Mapa de Calor (Zonas en seguimiento)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mapaCalor.map(z => (
              <div key={z.zonaId} className={`p-4 rounded-lg shadow-sm border flex flex-col items-center justify-center text-center h-32 ${getColorClass(z.color)}`}>
                <p className="font-semibold">{z.nombre}</p>
                <p className="text-3xl font-bold">{z.ocupacion} / {z.aforoMaximo}</p>
                <p className="text-sm opacity-80">{Math.round(z.porcentaje)}% ocupado</p>
              </div>
            ))}
            {mapaCalor.length === 0 && <p className="text-gray-500 col-span-3 text-center">No hay zonas activas en seguimiento.</p>}
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

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow h-full">
          <h2 className="text-xl font-bold mb-4 text-creo-vino border-b pb-2">Actividad Reciente</h2>
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
              <p className="text-gray-500 italic">No hay actividad reciente en las zonas vigiladas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
