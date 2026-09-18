import { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Clock, CheckCircle, MapPin, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import FiltroContexto from '../components/FiltroContexto';

// Componente hijo para aislar la carga y renderizado por cada piso
function PisoDashboardPanel({ pisoId, zonaId, pisoName }: { pisoId: number, zonaId: number | null, pisoName: string }) {
  const [kpis, setKpis] = useState({ aforoActual: 0, tiempoEsperaPromedio: 0, duracionConsultaPromedio: 0, pacientesAtendidos: 0 });
  const [mapaCalor, setMapaCalor] = useState<any[]>([]);
  const [aforoHistorico, setAforoHistorico] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let qs = `?pisoId=${pisoId}`;
        if (zonaId) qs += `&zonaId=${zonaId}`;

        const [kpiRes, mapaRes, aforoRes] = await Promise.all([
          client.get(`/dashboard/kpis${qs}`),
          client.get(`/dashboard/mapa-calor${qs}`),
          client.get(`/dashboard/aforo-historico${qs}&fecha=hoy`)
        ]);
        
        setKpis(kpiRes.data);
        setMapaCalor(mapaRes.data);
        setAforoHistorico(aforoRes.data);
      } catch (error) {
        console.error("Error fetching data for piso", pisoId, error);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [pisoId, zonaId]);

  const getColorClass = (colorStr: string) => {
    if (colorStr === 'verde') return 'bg-creo-verde text-white border-green-700';
    if (colorStr === 'amarillo') return 'bg-creo-naranja text-white border-orange-600';
    if (colorStr === 'rojo') return 'bg-red-600 text-white border-red-800';
    return 'bg-gray-200 border-gray-300';
  };

  return (
    <div className="space-y-6 mb-8 border-b pb-8 last:border-0">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-gray-800">{pisoName}</h3>
        {zonaId && <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs">Zona Filtrada</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-vino flex items-center">
          <Users className="text-creo-vino mr-4" size={32} />
          <div>
            <p className="text-creo-gris text-xs font-semibold uppercase">Aforo Actual</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.aforoActual}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-naranja flex items-center">
          <Clock className="text-creo-naranja mr-4" size={32} />
          <div>
            <p className="text-creo-gris text-xs font-semibold uppercase">T. Espera Prom.</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.tiempoEsperaPromedio} min</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-creo-verde flex items-center">
          <Activity className="text-creo-verde mr-4" size={32} />
          <div>
            <p className="text-creo-gris text-xs font-semibold uppercase">T. Consulta Prom.</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.duracionConsultaPromedio} min</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500 flex items-center">
          <CheckCircle className="text-blue-500 mr-4" size={32} />
          <div>
            <p className="text-creo-gris text-xs font-semibold uppercase">Atendidos Hoy</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.pacientesAtendidos}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold mb-4 text-creo-vino flex items-center">
            <MapPin className="mr-2" size={20} /> Mapa de Calor (Zonas en seguimiento)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mapaCalor.map(z => (
              <div key={z.zonaId} className={`p-4 rounded-lg shadow-sm border-2 flex flex-col items-center justify-center text-center h-28 ${getColorClass(z.color)}`}>
                <p className="font-semibold text-sm leading-tight">{z.nombre}</p>
                <p className="text-3xl font-bold my-1">{z.ocupacion} <span className="text-sm font-normal opacity-80">/ {z.aforoMaximo}</span></p>
                <p className="text-xs opacity-90">{Math.round(z.porcentaje)}% ocupado</p>
              </div>
            ))}
            {mapaCalor.length === 0 && <p className="text-gray-500 text-sm col-span-2">No hay zonas activas en seguimiento en este piso.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold mb-4 text-creo-vino">Aforo Histórico</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aforoHistorico}>
                <XAxis dataKey="hora" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="aforo" fill="#AA0831" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState<{pisoIds: number[], zonaId: number | null}>({ pisoIds: [], zonaId: null });
  const [actividad, setActividad] = useState<any[]>([]);

  // We need piso names to pass to the component. We can fetch them or pass just IDs.
  // We'll fetch them from client once, or rely on the endpoints.
  const [nombresPisos, setNombresPisos] = useState<Record<number, string>>({});

  useEffect(() => {
    // Resolve names for the UI
    const fetchNombres = async () => {
      try {
        const endpoint = user?.rol === 'Administrador' ? '/admin/pisos?incluirInactivos=false' : '/pisos';
        const res = await client.get(endpoint);
        const dict: Record<number, string> = {};
        res.data.forEach((p: any) => dict[p.id] = p.nombre);
        setNombresPisos(dict);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNombres();
  }, [user]);

  const handleFilterChange = useCallback((pisoIds: number[], zonaId: number | null) => {
    setFiltros({ pisoIds, zonaId });
  }, []);

  // Fetch combined Actividad for all selected pisos
  useEffect(() => {
    const fetchActividad = async () => {
      if (filtros.pisoIds.length === 0) {
        setActividad([]);
        return;
      }
      try {
        // Fetch actividad for each selected piso and combine them
        const promises = filtros.pisoIds.map(pId => {
          let qs = `?pisoId=${pId}&limit=10`;
          if (filtros.zonaId) qs += `&zonaId=${filtros.zonaId}`;
          return client.get(`/dashboard/actividad-circuito${qs}`);
        });
        
        const results = await Promise.all(promises);
        let combined: any[] = [];
        results.forEach(res => combined = combined.concat(res.data));
        
        // Sort by HoraIngreso desc
        combined.sort((a, b) => new Date(b.horaIngreso).getTime() - new Date(a.horaIngreso).getTime());
        setActividad(combined.slice(0, 15)); // Limit total combined
      } catch (error) {
        console.error("Error fetching actividad", error);
      }
    };
    
    fetchActividad();
    const interval = setInterval(fetchActividad, 5000);
    return () => clearInterval(interval);
  }, [filtros]);

  const handleExportar = async () => {
    try {
      const params = new URLSearchParams();
      filtros.pisoIds.forEach(id => params.append('pisoId', id.toString())); // Assuming backend can handle multiple, or we just take the first. Wait, backend /operador/reportes/exportar takes single pisoId? We will just pass the first one for now or let the user use the reportes page.
      if (filtros.pisoIds.length > 0) params.append('pisoId', filtros.pisoIds[0].toString());
      if (filtros.zonaId) params.append('zonaId', filtros.zonaId.toString());
      params.append('desde', new Date().toISOString().split('T')[0]); // Solo hoy

      const res = await client.get(`/operador/reportes/exportar?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `actividad_hoy.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Exportar falló", error);
    }
  };

  const enCircuito = actividad.filter(a => a.estado === 'EnCircuito');
  const atendidos = actividad.filter(a => a.estado === 'Atendido');

  const calcMinutes = (ingreso: string, salida: string | null) => {
    const start = new Date(ingreso).getTime();
    const end = salida ? new Date(salida).getTime() : new Date().getTime();
    return Math.floor((end - start) / 60000);
  };

  return (
    <div className="flex flex-col h-full">
      <FiltroContexto onFilterChange={handleFilterChange} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Col: KPI Panels per Piso */}
        <div className="xl:col-span-2">
          {filtros.pisoIds.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center border text-gray-500">
              Seleccione al menos un piso en el filtro superior para visualizar datos.
            </div>
          ) : (
            filtros.pisoIds.map(pId => (
              <PisoDashboardPanel 
                key={pId} 
                pisoId={pId} 
                zonaId={filtros.zonaId} 
                pisoName={nombresPisos[pId] || `Piso ${pId}`} 
              />
            ))
          )}
        </div>

        {/* Right Col: Actividad en Circuito Global */}
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-4">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-creo-vino flex items-center">
                  Actividad en Circuito
                </h2>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {filtros.pisoIds.map(pId => (
                    <span key={pId} className="bg-red-50 text-creo-vino text-[10px] px-2 py-0.5 rounded border border-red-100 font-medium">
                      {nombresPisos[pId] || `Piso ${pId}`}
                    </span>
                  ))}
                </div>
              </div>
              {user?.rol !== 'Gerencia' && (
                <button 
                  onClick={handleExportar}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                  title="Exportar Actividad de Hoy (CSV)"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Activos */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">En Seguimiento (Activos)</h3>
                <div className="space-y-3">
                  {enCircuito.map(act => (
                    <div key={act.id} className="border-l-4 border-creo-naranja pl-3 py-1 bg-gray-50/50 rounded-r">
                      <p className="font-bold text-gray-800 text-sm">{act.codigoPacienteAnonimo}</p>
                      <p className="text-xs text-gray-600 flex justify-between mt-1">
                        <span className="font-medium text-creo-vino">{act.zonaActual}</span>
                        <span className="text-creo-naranja font-medium">En espera: {calcMinutes(act.horaIngreso, null)} min</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Ingresó: {new Date(act.horaIngreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ))}
                  {enCircuito.length === 0 && <p className="text-xs text-gray-400 italic">No hay pacientes activos.</p>}
                </div>
              </div>

              {/* Atendidos */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pt-2 border-t">Atendidos Recientemente</h3>
                <div className="space-y-3">
                  {atendidos.map(act => (
                    <div key={act.id} className="border-l-4 border-creo-verde pl-3 py-1 bg-gray-50/50 rounded-r opacity-80">
                      <p className="font-bold text-gray-700 text-sm">{act.codigoPacienteAnonimo}</p>
                      <p className="text-xs text-gray-600 flex justify-between mt-1">
                        <span className="font-medium text-gray-500">{act.zonaActual}</span>
                        <span className="text-creo-verde font-medium">Total: {calcMinutes(act.horaIngreso, act.horaSalida)} min</span>
                      </p>
                    </div>
                  ))}
                  {atendidos.length === 0 && <p className="text-xs text-gray-400 italic">No hay pacientes atendidos recientemente.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
