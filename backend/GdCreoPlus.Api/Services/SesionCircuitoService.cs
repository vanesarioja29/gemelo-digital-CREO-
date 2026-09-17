using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Services;

public class SesionCircuitoService
{
    private readonly AppDbContext _context;

    public SesionCircuitoService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SesionCircuito> AbrirSesion(string codigoUUID)
    {
        var tarjeta = await _context.Tarjetas.FirstOrDefaultAsync(t => t.CodigoUUID == codigoUUID);
        if (tarjeta == null)
            throw new Exception("Tarjeta no reconocida.");

        var sesionActiva = await _context.SesionesCircuito
            .FirstOrDefaultAsync(s => s.TarjetaId == tarjeta.Id && s.Estado == EstadoSesion.EnCircuito);

        if (sesionActiva != null)
            throw new Exception("La tarjeta ya tiene un circuito activo.");

        var zonaAdmision = await _context.Zonas.FirstOrDefaultAsync(z => z.Tipo == TipoZona.Admision);
        if (zonaAdmision == null)
            throw new Exception("No existe una zona de Admisión configurada.");

        // Generar CodigoPacienteAnonimo único (Paciente # + 3 dígitos)
        var rnd = new Random();
        string codigoPaciente;
        while (true)
        {
            codigoPaciente = $"Paciente #{rnd.Next(100, 1000)}";
            if (!await _context.SesionesCircuito.AnyAsync(s => s.CodigoPacienteAnonimo == codigoPaciente && s.Estado == EstadoSesion.EnCircuito))
                break;
        }

        var ahora = DateTime.UtcNow;

        var nuevaSesion = new SesionCircuito
        {
            TarjetaId = tarjeta.Id,
            CodigoPacienteAnonimo = codigoPaciente,
            ZonaActualId = zonaAdmision.Id,
            Estado = EstadoSesion.EnCircuito,
            HoraIngreso = ahora
        };

        _context.SesionesCircuito.Add(nuevaSesion);

        var dbEvent = new EventoDeteccion
        {
            TarjetaId = tarjeta.Id,
            ZonaId = zonaAdmision.Id,
            TimestampUtc = ahora,
            ValorRSSI = -50 // Valor por defecto
        };
        _context.EventosDeteccion.Add(dbEvent);

        await _context.SaveChangesAsync();

        return nuevaSesion;
    }

    public async Task<SesionCircuito> CerrarSesion(string codigoUUID)
    {
        var tarjeta = await _context.Tarjetas.FirstOrDefaultAsync(t => t.CodigoUUID == codigoUUID);
        if (tarjeta == null)
            throw new Exception("Tarjeta no reconocida.");

        var sesion = await _context.SesionesCircuito
            .Include(s => s.Tarjeta)
            .FirstOrDefaultAsync(s => s.TarjetaId == tarjeta.Id && s.Estado == EstadoSesion.EnCircuito);

        if (sesion == null)
            throw new Exception("No hay un circuito activo para esta tarjeta.");

        var ahora = DateTime.UtcNow;
        sesion.Estado = EstadoSesion.Atendido;
        sesion.HoraSalida = ahora;
        sesion.ZonaActualId = null;

        var minEspera = await _context.EventosDeteccion
            .Where(e => e.TarjetaId == tarjeta.Id && e.TimestampUtc >= sesion.HoraIngreso && e.Zona.Tipo == TipoZona.SalaDeEspera)
            .MinAsync(e => (DateTime?)e.TimestampUtc);
        
        var minConsulta = await _context.EventosDeteccion
            .Where(e => e.TarjetaId == tarjeta.Id && e.TimestampUtc >= sesion.HoraIngreso && e.Zona.Tipo == TipoZona.Consultorio)
            .MinAsync(e => (DateTime?)e.TimestampUtc);

        if (minEspera.HasValue && minConsulta.HasValue)
        {
            sesion.TiempoEsperaSegundos = (int)(minConsulta.Value - minEspera.Value).TotalSeconds;
        }
        else if (minEspera.HasValue)
        {
            sesion.TiempoEsperaSegundos = (int)(ahora - minEspera.Value).TotalSeconds;
        }

        if (minConsulta.HasValue)
        {
            sesion.DuracionConsultaSegundos = (int)(ahora - minConsulta.Value).TotalSeconds;
        }

        await _context.SaveChangesAsync();

        return sesion;
    }
}
