import { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Clock, CheckCircle, MapPin, Download, AlertTriangle, Globe } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
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

  const filteredMapaCalor = zonaId ? mapaCalor.filter(z => z.zonaId === zonaId) : mapaCalor;
  const totalAforoMaximo = filteredMapaCalor.reduce((acc, z) => acc + z.aforoMaximo, 0);
  const aforoPct = totalAforoMaximo > 0 ? (kpis.aforoActual / totalAforoMaximo) * 100 : 0;
  
  let aforoColor = 'border-creo-verde';
  let aforoText = 'Normal';
  let aforoTextColor = 'text-creo-verde';
  let aforoIconBg = 'bg-green-50';
  if (aforoPct >= 100) { aforoColor = 'border-creo-vino'; aforoText = 'Límite excedido'; aforoTextColor = 'text-creo-vino'; aforoIconBg = 'bg-red-50'; }
  else if (aforoPct >= 70) { aforoColor = 'border-creo-naranja'; aforoText = 'Cerca del límite'; aforoTextColor = 'text-creo-naranja'; aforoIconBg = 'bg-orange-50'; }

  const subtituloAlcance = zonaId ? `Zona filtrada · ${pisoName}` : `Todas las zonas · ${pisoName}`;

  let zonaMasSaturada = '';
  if (!zonaId && mapaCalor.length > 0) {
    const maxZ = mapaCalor.reduce((max, z) => max.porcentaje > z.porcentaje ? max : z);
    zonaMasSaturada = maxZ.nombre;
  }

  const zonaName = zonaId && filteredMapaCalor.length > 0 ? filteredMapaCalor[0].nombre : 'Todas las zonas';

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
    if (threshold >= 70) return '#FBB000'; // amarillo/naranja
    return '#2E8B57'; // verde
  };

  return (
    <div className="space-y-6 mb-8 border-b pb-8 last:border-0">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-gray-800">{pisoName}</h3>
        {zonaId && <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs">Zona Filtrada</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {/* Aforo Actual */}
        <div className={`bg-white rounded-xl p-5 shadow-sm border-t-4 flex flex-col gap-2 relative overflow-hidden transition-colors ${aforoColor}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-800 font-bold text-sm flex items-center gap-1.5">
                Aforo Actual
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">{subtituloAlcance}</p>
            </div>
            <div className={`${aforoIconBg} p-2 rounded-lg shrink-0`}>
              <Users size={20} className={aforoTextColor} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-gray-800 tracking-tight">{kpis.aforoActual}</span>
            <span className="text-gray-500 font-medium">/ {totalAforoMaximo} pac.</span>
          </div>
          {!zonaId && zonaMasSaturada && (
            <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
              Zona más saturada: {zonaMasSaturada}
            </div>
          )}
          <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${aforoTextColor}`}>
            {aforoText}
          </div>
        </div>

        {/* Tiempo Espera */}
        <div className="bg-white rounded-xl p-5 shadow-sm border-t-4 border-t-gray-200 flex flex-col gap-2 relative overflow-hidden transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-800 font-bold text-sm flex items-center gap-1.5">
                Tiempo Espera Prom.
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">Zonas de espera · {pisoName}</p>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg shrink-0">
              <Clock size={20} className="text-gray-400" />
            </div>
          </div>
          {kpis.tiempoEsperaPromedio !== null ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-gray-800 tracking-tight">{kpis.tiempoEsperaPromedio}</span>
                <span className="text-gray-500 font-medium">min</span>
              </div>
              <div className="text-xs font-bold flex items-center gap-1 mt-1 text-gray-500">
                ↑ 5 min vs ayer
              </div>
            </>
          ) : (
            <div className="flex items-center h-[52px] mt-1">
              <span className="text-sm font-medium text-gray-500 italic">No aplica a esta zona</span>
            </div>
          )}
        </div>

        {/* Duracion Consulta */}
        <div className="bg-white rounded-xl p-5 shadow-sm border-t-4 border-t-gray-200 flex flex-col gap-2 relative overflow-hidden transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-800 font-bold text-sm flex items-center gap-1.5">
                Duración Prom. Consulta
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">Consultorios · {pisoName}</p>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg shrink-0">
              <Activity size={20} className="text-gray-400" />
            </div>
          </div>
          {kpis.duracionConsultaPromedio !== null ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-gray-800 tracking-tight">{kpis.duracionConsultaPromedio}</span>
                <span className="text-gray-500 font-medium">min</span>
              </div>
              <div className="text-xs font-bold flex items-center gap-1 mt-1 text-gray-500">
                Dentro de lo esperado
              </div>
            </>
          ) : (
            <div className="flex items-center h-[52px] mt-1">
              <span className="text-sm font-medium text-gray-500 italic">No aplica a esta zona</span>
            </div>
          )}
        </div>

        {/* Atendidos */}
        <div className="bg-white rounded-xl p-5 shadow-sm border-t-4 border-t-gray-200 flex flex-col gap-2 relative overflow-hidden transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-800 font-bold text-sm flex items-center gap-1.5">
                <Globe size={14} className="text-gray-500" /> Pacientes Atendidos
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">Total Clínica · Todos los pisos</p>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg shrink-0">
              <CheckCircle size={20} className="text-gray-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-gray-800 tracking-tight">{kpis.pacientesAtendidos}</span>
            <span className="text-gray-500 font-medium">hoy</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
            Actualizado en tiempo real
          </div>
        </div>
      </div>

      {/* Row 1: Mapa de Calor + Actividad en Circuito */}
      <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 lg:h-[400px] min-h-[400px]">
        
        {/* Mapa de Calor */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col lg:w-[60%] border border-gray-100 h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Mapa de Calor en Tiempo Real
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Distribución de aforo por zonas</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="w-2 h-2 rounded-full bg-creo-verde animate-pulse"></span> Actualizado: hace 3 seg
              </div>
            </div>
            
            <div className="relative flex-1 bg-gray-50 rounded-xl border border-gray-100 overflow-visible min-h-[200px] flex items-center justify-between p-4 lg:p-6 gap-2 lg:gap-4 w-full h-full">
              {mapaCalor.map((z) => {
                const isSelected = !zonaId || (zonaId && z.zonaId === zonaId); // assuming we have the current selected filter logic
                let bgClass = 'bg-creo-verde';
                let label = 'Normal';
                if (z.color === 'amarillo') { bgClass = 'bg-creo-naranja'; label = 'Cerca del límite'; }
                if (z.color === 'rojo') { bgClass = 'bg-creo-vino'; label = 'Límite excedido'; }
                
                let widthClass = "w-1/4";
                let heightClass = "h-[50%]";
                if (z.nombre === "Sala de Espera General" || z.nombre.toLowerCase().includes('espera')) {
                  widthClass = "w-2/4";
                  heightClass = "h-[90%]";
                } else if (z.nombre === "Consultorio Piloto" || z.nombre.toLowerCase().includes('consultorio')) {
                  heightClass = "h-[40%]";
                }

                return (
                  <div key={z.zonaId} className={`relative ${widthClass} ${heightClass} group transition-all duration-300 ${!isSelected ? "opacity-40 grayscale" : "opacity-100"}`}>
                    <div className={`absolute inset-0 rounded-xl shadow-sm flex flex-col items-center justify-center text-white transition-colors ${bgClass}`}>
                      <div className="flex items-center justify-center gap-1 font-bold text-center px-1 text-xs lg:text-sm">
                        {z.nombre.toLowerCase().includes('espera') && <AlertTriangle size={14} className="shrink-0" />}
                        {z.nombre}
                      </div>
                      <span className="text-sm font-bold mt-1 bg-black/20 px-2 py-0.5 rounded-full">{z.ocupacion} pac.</span>
                    </div>
                    
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="font-bold text-sm mb-1">{z.nombre}</div>
                      <div className="text-xs text-gray-500 mb-1">Aforo actual: <span className="font-bold text-gray-800">{z.ocupacion} pacientes</span></div>
                      <div className="text-xs text-gray-500 mb-2">Aforo máximo: {z.aforoMaximo} pacientes</div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded ${bgClass}`}></div>
                        Estado: {label}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 text-[10px] lg:text-xs font-medium text-gray-500 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-creo-verde"></div> Normal</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-creo-naranja"></div> Cerca del límite</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-creo-vino"></div> Límite excedido</div>
              </div>
          </div>
        </div>

        {/* Actividad en Circuito */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col lg:w-[40%] border border-gray-100 h-full overflow-hidden">
          <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 shrink-0">
              <h2 className="text-lg font-bold text-gray-800">Actividad en Circuito</h2>
              <div className="flex items-center gap-2 self-start">
                <span className="bg-gray-100 px-2.5 py-1.5 rounded-md text-xs font-semibold text-gray-800 shadow-sm shrink-0">
                  {pisoName} {zonaName !== 'Todas las zonas' ? `· ${zonaName}` : ''}
                </span>
                {userRol !== 'Gerencia' && (
                  <div className="relative group">
                    <button onClick={() => onExport(pisoId)} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-800 hover:bg-gray-50 shadow-sm cursor-pointer">
                      <Download size={14} className="text-gray-500" /> Exportar CSV
                    </button>
                    <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 text-white text-[11px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Exporta el historial completo del día para el filtro actual.
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-2 px-1 shrink-0">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Paciente / Estado</h3>
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tiempo en circuito</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {enCircuito.map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${act.zonaActualTipo === 'Consultorio' ? 'bg-creo-naranja' : 'bg-gray-500'}`}></div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{act.codigoPacienteAnonimo}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium"><MapPin size={12} /> {act.zonaActual}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-gray-800 font-medium flex items-center justify-end gap-1.5">
                          <Clock size={12} className="text-creo-vino animate-pulse" />
                          {act.zonaActualTipo === 'Consultorio' ? 'En consulta:' : 'Esperando:'} {calcMinutes(act.horaIngreso, null)} min
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">Ingreso: {new Date(act.horaIngreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    </div>
                  ))}
                  {enCircuito.length === 0 && <div className="text-center py-4 text-sm text-gray-500 font-medium">No hay pacientes activos en esta zona.</div>}
                </div>

                {atendidos.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 px-1 my-1 opacity-50">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Atendidos</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {atendidos.map((act) => (
                        <div key={act.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:bg-gray-100 opacity-80">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-10 rounded-full bg-creo-verde"></div>
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">{act.codigoPacienteAnonimo}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><CheckCircle size={12} /> Atendido</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm text-gray-800 font-medium">Duración total: {calcMinutes(act.horaIngreso, act.horaSalida)} min</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Ingreso: {new Date(act.horaIngreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} <span className="mx-1 opacity-50">•</span> Salida: {act.horaSalida ? new Date(act.horaSalida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* Row 2: Aforo Histórico (100% width) */}
      <div className="grid grid-cols-1">
        <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 shrink-0 flex flex-col h-64 w-full">
          <div className="mb-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Aforo Histórico — {pisoName} · {zonaName}</h2>
            <p className="text-gray-500 text-sm">Evolución de la jornada vs. límite recomendado ({totalAforoMaximo} pacientes)</p>
          </div>
          <div className="w-full flex-1 min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={aforoHistorico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#6E6E6E', fontSize: 12 }} dy={10} />
                <YAxis domain={[0, (dataMax: number) => Math.max(dataMax, totalAforoMaximo) + Math.ceil(totalAforoMaximo * 0.15)]} axisLine={false} tickLine={false} tick={{ fill: '#6E6E6E', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F7F7F8' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={totalAforoMaximo} stroke="#6E6E6E" strokeDasharray="3 3" />
                <Bar dataKey="aforo" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {aforoHistorico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
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
