import { useState, useEffect } from 'react';
import client from '../../api/client';
import { FileText, Download, AlertCircle, Filter } from 'lucide-react';

interface Reporte {
  fecha: string;
  piso: string;
  zona: string;
  codigoPacienteAnonimo: string;
  horaIngreso: string;
  horaSalida: string | null;
  tiempoEsperaMinutos: number;
  duracionConsultaMinutos: number;
  estado: string;
}

interface Piso { id: number; nombre: string; sede: { nombre: string } }
interface Zona { id: number; nombre: string; }

export default function OperadorReportes() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [error, setError] = useState('');
  
  // Filters
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pisoId, setPisoId] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [estado, setEstado] = useState('');

  const [pisos, setPisos] = useState<Piso[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);

  useEffect(() => {
    // Cargar pisos permitidos
    client.get('/pisos').then(res => setPisos(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (pisoId) {
      client.get(`/zonas?pisoId=${pisoId}`).then(res => setZonas(res.data)).catch(console.error);
    } else {
      setZonas([]);
      setZonaId('');
    }
  }, [pisoId]);

  const fetchReportes = async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', new Date(desde).toISOString());
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        params.append('hasta', hastaDate.toISOString());
      }
      if (pisoId) params.append('pisoId', pisoId);
      if (zonaId) params.append('zonaId', zonaId);
      if (estado) params.append('estado', estado);

      const res = await client.get(`/operador/reportes?${params.toString()}`);
      setReportes(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar reportes');
    }
  };

  const handleExportar = async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', new Date(desde).toISOString());
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        params.append('hasta', hastaDate.toISOString());
      }
      if (pisoId) params.append('pisoId', pisoId);
      if (zonaId) params.append('zonaId', zonaId);
      if (estado) params.append('estado', estado);

      const res = await client.get(`/operador/reportes/exportar?${params.toString()}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reportes_creoplus_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError('Error al exportar los reportes. Verifica los filtros.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-creo-vino">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center text-gray-800">
            <FileText className="mr-2 text-creo-vino" /> Reportes de Actividad
          </h2>
          <button 
            onClick={handleExportar}
            className="bg-creo-verde hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <Download size={16} className="mr-2" /> Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-full p-2 border rounded outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-full p-2 border rounded outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Piso</label>
            <select value={pisoId} onChange={e => setPisoId(e.target.value)} className="w-full p-2 border rounded outline-none text-sm">
              <option value="">Todos los permitidos</option>
              {pisos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Zona</label>
            <select value={zonaId} onChange={e => setZonaId(e.target.value)} className="w-full p-2 border rounded outline-none text-sm" disabled={!pisoId}>
              <option value="">Todas</option>
              {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full p-2 border rounded outline-none text-sm">
              <option value="">Cualquiera</option>
              <option value="0">En Circuito</option>
              <option value="1">Atendido</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={fetchReportes} className="bg-creo-vino text-white px-6 py-2 rounded-lg flex items-center font-medium hover:bg-red-900">
            <Filter size={16} className="mr-2" /> Aplicar Filtros
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm border border-red-200 mb-4">
            <AlertCircle className="mr-2 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* Tabla */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piso / Zona</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente (UUID)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso - Salida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempos (Esp / Cons)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportes.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.fecha}</td>
                  <td className="px-4 py-3 text-gray-600">{r.piso} - {r.zona}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.codigoPacienteAnonimo}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.horaIngreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                    {r.horaSalida ? ` - ${new Date(r.horaSalida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ' - ...'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.tiempoEsperaMinutos}m / {r.duracionConsultaMinutos}m
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.estado === 'Atendido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {reportes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">Presiona "Aplicar Filtros" para ver resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
