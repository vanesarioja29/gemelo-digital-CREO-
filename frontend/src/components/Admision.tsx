import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { QrCode, AlertCircle, CheckCircle, Search } from 'lucide-react';

export default function Admision() {
  const [codigoQR, setCodigoQR] = useState('');
  const [tarjetas, setTarjetas] = useState<{ id: number, codigoUUID: string }[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'ingreso' | 'salida' | 'error', texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTarjetas();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const fetchTarjetas = async () => {
    try {
      const res = await client.get(`/admision/tarjetas-disponibles`);
      setTarjetas(res.data);
    } catch (error) {
      console.error("Error fetching tarjetas", error);
    }
  };

  const handleEscanear = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codigoQR.trim()) return;

    setCargando(true);
    setMensaje(null);

    try {
      const res = await client.post(`/admision/escanear`, { codigoQR });
      const data = res.data;

      if (data.accion === 'ingreso') {
        setMensaje({
          tipo: 'ingreso',
          texto: `Ingreso registrado: ${data.codigoPaciente}`
        });
      } else if (data.accion === 'salida') {
        setMensaje({
          tipo: 'salida',
          texto: `Salida registrada: ${data.codigoPaciente} — Espera: ${data.tiempoEsperaMinutos} min, Consulta: ${data.duracionConsultaMinutos} min`
        });
      }
    } catch (error: any) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.error || 'Error al procesar la tarjeta'
      });
    } finally {
      setCargando(false);
      setCodigoQR('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-md border-t-4 border-creo-vino">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <QrCode className="mr-3 text-creo-vino" size={28} />
          Admisión: Escáner de Tarjetas
        </h2>

        <form onSubmit={handleEscanear} className="flex gap-4 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={codigoQR}
            onChange={(e) => setCodigoQR(e.target.value)}
            placeholder="Acerque la tarjeta al lector o ingrese el código..."
            className="flex-1 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-creo-vino focus:border-transparent outline-none text-lg"
            disabled={cargando}
          />
          <button
            type="submit"
            disabled={cargando || !codigoQR.trim()}
            className="bg-creo-vino hover:bg-red-800 text-white font-bold py-4 px-8 rounded-lg transition-colors disabled:opacity-50"
          >
            {cargando ? 'Procesando...' : 'Escanear'}
          </button>
        </form>

        {mensaje && (
          <div className={`p-4 rounded-lg flex items-center mb-6 text-lg font-medium
            ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : ''}
            ${mensaje.tipo === 'ingreso' ? 'bg-blue-100 text-blue-700 border border-blue-300' : ''}
            ${mensaje.tipo === 'salida' ? 'bg-green-100 text-green-700 border border-green-300' : ''}
          `}>
            {mensaje.tipo === 'error' ? <AlertCircle className="mr-3" /> : <CheckCircle className="mr-3" />}
            {mensaje.texto}
          </div>
        )}
      </div>

      {/* Lista de tarjetas para probar (Mocking scanner) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <Search className="mr-2" size={20} /> Tarjetas Registradas (Para pruebas)
        </h3>
        {tarjetas.length === 0 ? (
          <p className="text-gray-500 italic">No hay tarjetas registradas en la base de datos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tarjetas.map(t => (
              <button
                key={t.id}
                onClick={() => setCodigoQR(t.codigoUUID)}
                className="text-left p-3 hover:bg-gray-50 border border-gray-100 rounded-md truncate transition-colors text-sm text-gray-600 hover:text-creo-vino hover:border-creo-vino"
                title="Haga clic para copiar al escáner"
              >
                {t.codigoUUID}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
