import { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Clock, CheckCircle, MapPin, Download } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import FiltroContexto from '../components/FiltroContexto';

// Componente hijo para aislar la carga y renderizado por cada piso
function PisoDashboardPanel({ 
  pisoId, 
  zonaId, 
  pisoName, 
  actividad, 
  onExport, 
  userRol 
}: { 
  pisoId: number, 
  zonaId: number | null, 
  pisoName: string, 
  actividad: any[], 
  onExport: (pId: number) => void,
  userRol: string | undefined
}) {
  const [kpis, setKpis] = useState<any>({ aforoActual: 0, tiempoEsperaPromedio: 0, duracionConsultaPromedio: 0, pacientesAtendidos: 0 });
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

  const totalAforoMaximo = mapaCalor.reduce((acc, z) => acc + z.aforoMaximo, 0);
  const aforoPct = totalAforoMaximo > 0 ? (kpis.aforoActual / totalAforoMaximo) * 100 : 0;
  
  let aforoColor = 'border-creo-verde';
  let aforoText = 'Normal';
  let aforoTextColor = 'text-creo-verde';
  if (aforoPct >= 100) { aforoColor = 'border-creo-vino'; aforoText = 'Límite excedido'; aforoTextColor = 'text-creo-vino'; }
  else if (aforoPct >= 70) { aforoColor = 'border-creo-naranja'; aforoText = 'Cerca del límite'; aforoTextColor = 'text-creo-naranja'; }

  const subtituloAlcance = zonaId ? `Zona filtrada · ${pisoName}` : `Todas las zonas · ${pisoName}`;

  let zonaMasSaturada = '';
  if (!zonaId && mapaCalor.length > 0) {
    const maxZ = mapaCalor.reduce((max, z) => max.porcentaje > z.porcentaje ? max : z);
    zonaMasSaturada = maxZ.nombre;
  }

  const enCircuito = actividad.filter(a => a.estado === 'EnCircuito');
  const atendidos = actividad.filter(a => a.estado === 'Atendido');

  const calcMinutes = (ingreso: string, salida: string | null) => {
    const start = new Date(ingreso).getTime();
    const end = salida ? new Date(salida).getTime() : new Date().getTime();
    return Math.floor((end - start) / 60000);
  };

  const getBarColor = (entry: any) => {
    const threshold = totalAforoMaximo > 0 ? (entry.aforo / totalAforoMaximo) * 100 : 0;
    if (threshold >= 100) return '#AA0831'; // rojo vino
    if (threshold >= 70) return '#f97316'; // naranja
    return '#16a34a'; // verde
  };

  return (
    <div className="space-y-6 mb-8 border-b pb-8 last:border-0">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-gray-800">{pisoName}</h3>
        {zonaId && <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs">Zona Filtrada</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Aforo Actual */}
        <div className={`bg-white p-5 rounded-xl shadow border-t-4 ${aforoColor} flex flex-col justify-between h-full`}>
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-800 font-bold text-sm">Aforo Actual</p>
                <p className="text-gray-400 text-[10px]">{subtituloAlcance}</p>
              </div>
              <div className="bg-red-50 p-2 rounded-lg">
                <Users className="text-creo-vino" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-2">{kpis.aforoActual} <span className="text-sm font-normal text-gray-500">/ {totalAforoMaximo} pac.</span></p>
            {!zonaId && zonaMasSaturada && <p className="text-[10px] text-gray-400 mt-1">Zona más saturada: {zonaMasSaturada}</p>}
          </div>
          <p className={`text-xs font-medium mt-4 ${aforoTextColor}`}>{aforoText}</p>
        </div>

        {/* Tiempo Espera */}
        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-creo-naranja flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-800 font-bold text-sm">T. Espera Prom.</p>
                <p className="text-gray-400 text-[10px]">{subtituloAlcance}</p>
              </div>
              <div className="bg-orange-50 p-2 rounded-lg">
                <Clock className="text-creo-naranja" size={20} />
              </div>
            </div>
            {kpis.tiempoEsperaPromedio === null ? (
              <p className="text-sm italic text-gray-400 mt-4">No aplica a esta zona</p>
            ) : (
              <p className="text-3xl font-bold text-gray-800 mt-2">{kpis.tiempoEsperaPromedio} <span className="text-sm font-normal text-gray-500">min</span></p>
            )}
          </div>
          {kpis.tiempoEsperaPromedio !== null && <p className="text-xs font-medium mt-4 text-gray-400">&nbsp;</p>}
        </div>

        {/* Tiempo Consulta */}
        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-creo-verde flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-800 font-bold text-sm">T. Consulta Prom.</p>
                <p className="text-gray-400 text-[10px]">{subtituloAlcance}</p>
              </div>
              <div className="bg-green-50 p-2 rounded-lg">
                <Activity className="text-creo-verde" size={20} />
              </div>
            </div>
            {kpis.duracionConsultaPromedio === null ? (
              <p className="text-sm italic text-gray-400 mt-4">No aplica a esta zona</p>
            ) : (
              <p className="text-3xl font-bold text-gray-800 mt-2">{kpis.duracionConsultaPromedio} <span className="text-sm font-normal text-gray-500">min</span></p>
            )}
          </div>
          {kpis.duracionConsultaPromedio !== null && <p className="text-xs font-medium mt-4 text-gray-400">&nbsp;</p>}
        </div>

        {/* Atendidos */}
        <div className="bg-white p-5 rounded-xl shadow border-t-4 border-blue-500 flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-800 font-bold text-sm">Atendidos Hoy</p>
                <p className="text-gray-400 text-[10px]">{subtituloAlcance}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <CheckCircle className="text-blue-500" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-2">{kpis.pacientesAtendidos}</p>
          </div>
          <p className="text-xs font-medium mt-4 text-gray-400">&nbsp;</p>
        </div>
      </div>

      {/* Row 1: Mapa de Calor + Actividad en Circuito */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mapa de Calor */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 flex-1">
            <h2 className="text-lg font-bold mb-4 text-creo-vino flex items-center">
              <MapPin className="mr-2" size={20} /> Mapa de Calor (Zonas en seguimiento)
            </h2>
            <div className="flex flex-wrap gap-4">
              {mapaCalor.map(z => {
                const isEspera = z.nombre.toLowerCase().includes('espera');
                let colorClass = 'bg-gray-200 border-gray-300 text-gray-800';
                if (z.color === 'verde') colorClass = 'bg-creo-verde text-white border-green-700';
                if (z.color === 'amarillo') colorClass = 'bg-creo-naranja text-white border-orange-600';
                if (z.color === 'rojo') colorClass = 'bg-creo-vino text-white border-red-900';

                return (
                  <div key={z.zonaId} className={`p-4 rounded-lg shadow-sm border-2 flex flex-col items-center justify-center text-center h-28 ${colorClass} ${isEspera ? 'flex-[2] min-w-[200px]' : 'flex-1 min-w-[120px]'}`}>
                    <p className="font-semibold text-sm leading-tight">{z.nombre}</p>
                    <p className="text-3xl font-bold my-1">{z.ocupacion} <span className="text-sm font-normal opacity-80">/ {z.aforoMaximo}</span></p>
                    <p className="text-xs opacity-90">{Math.round(z.porcentaje)}% ocupado</p>
                  </div>
                );
              })}
              {mapaCalor.length === 0 && <p className="text-gray-500 text-sm w-full">No hay zonas activas en seguimiento en este piso.</p>}
            </div>

            {/* Leyenda de Colores */}
            {mapaCalor.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-gray-600 bg-gray-50 p-3 rounded border inline-flex items-center">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-creo-verde"></span> Normal</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-creo-naranja"></span> Cerca del límite</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-creo-vino"></span> Límite excedido</div>
              </div>
            )}
          </div>
        </div>

        {/* Actividad en Circuito (Specific to this Piso) */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-lg font-bold text-creo-vino flex items-center">
                Actividad en Circuito
              </h2>
              {userRol !== 'Gerencia' && (
                <button 
                  onClick={() => onExport(pisoId)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                  title="Exportar Actividad de Hoy (CSV)"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
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

      {/* Row 2: Aforo Histórico (100% width) */}
      <div className="grid grid-cols-1">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 w-full">
          <h2 className="text-lg font-bold mb-4 text-creo-vino">Aforo Histórico</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aforoHistorico}>
                <XAxis dataKey="hora" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="aforo" radius={[4, 4, 0, 0]}>
                  {aforoHistorico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
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
  const [actividades, setActividades] = useState<Record<number, any[]>>({});
  const [nombresPisos, setNombresPisos] = useState<Record<number, string>>({});

  useEffect(() => {
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

  useEffect(() => {
    const fetchActividad = async () => {
      if (filtros.pisoIds.length === 0) {
        setActividades({});
        return;
      }
      try {
        const promises = filtros.pisoIds.map(pId => {
          let qs = `?pisoId=${pId}&limit=10`;
          if (filtros.zonaId) qs += `&zonaId=${filtros.zonaId}`;
          return client.get(`/dashboard/actividad-circuito${qs}`).then(res => ({ pId, data: res.data }));
        });
        
        const results = await Promise.all(promises);
        const newAct: Record<number, any[]> = {};
        results.forEach(res => {
          newAct[res.pId] = res.data;
        });
        setActividades(newAct);
      } catch (error) {
        console.error("Error fetching actividad", error);
      }
    };
    
    fetchActividad();
    const interval = setInterval(fetchActividad, 5000);
    return () => clearInterval(interval);
  }, [filtros]);

  const handleExportar = async (pId: number) => {
    try {
      const params = new URLSearchParams();
      params.append('pisoId', pId.toString());
      if (filtros.zonaId) params.append('zonaId', filtros.zonaId.toString());
      params.append('desde', new Date().toISOString().split('T')[0]); 

      const res = await client.get(`/operador/reportes/exportar?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `actividad_piso${pId}_hoy.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Exportar falló", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <FiltroContexto onFilterChange={handleFilterChange} />

      <div>
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
              actividad={actividades[pId] || []}
              onExport={handleExportar}
              userRol={user?.rol}
            />
          ))
        )}
      </div>
    </div>
  );
}
