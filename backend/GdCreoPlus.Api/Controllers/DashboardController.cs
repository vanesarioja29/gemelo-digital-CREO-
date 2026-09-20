using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    private List<int>? GetAssignedPisos()
    {
        if (User.IsInRole(Rol.Operador.ToString()))
            return User.Claims.Where(c => c.Type == "PisoAsignado").Select(c => int.Parse(c.Value)).ToList();
        return null;
    }

    private bool IsPisoAllowed(int? pisoId, List<int>? assignedPisos)
    {
        if (assignedPisos == null) return true;
        if (!pisoId.HasValue) return true;
        return assignedPisos.Contains(pisoId.Value);
    }

    private async Task<bool> ValidatePisoAndZonaAsync(int? pisoId, int? zonaId, List<int>? assignedPisos)
    {
        if (!IsPisoAllowed(pisoId, assignedPisos)) return false;
        
        if (zonaId.HasValue)
        {
            var zona = await _context.Zonas.FindAsync(zonaId.Value);
            if (zona == null || !zona.EnSeguimiento) return false;
            if (assignedPisos != null && !assignedPisos.Contains(zona.PisoId)) return false;
        }
        
        return true;
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis([FromQuery] int? pisoId, [FromQuery] int? zonaId)
    {
        var assignedPisos = GetAssignedPisos();
        if (!await ValidatePisoAndZonaAsync(pisoId, zonaId, assignedPisos)) return Forbid();

        var qEnCircuito = _context.SesionesCircuito.Include(s => s.ZonaActual).Where(s => s.Estado == EstadoSesion.EnCircuito && s.ZonaActual != null && s.ZonaActual.EnSeguimiento);

        if (zonaId.HasValue) 
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActualId == zonaId);
        }
        else if (pisoId.HasValue)
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId);
        }
        else if (assignedPisos != null)
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));
        }

        var aforoActual = await qEnCircuito.CountAsync();
        
        var hoy = DateTime.UtcNow.Date;
        
        var atendidos = await _context.SesionesCircuito.CountAsync(s => s.Estado == EstadoSesion.Atendido && s.HoraSalida != null && s.HoraSalida.Value.Date == hoy);
        
        var qSesionesHoy = _context.SesionesCircuito
            .Where(s => s.Estado == EstadoSesion.Atendido && s.HoraSalida != null && s.HoraSalida.Value.Date == hoy);

        if (zonaId.HasValue) {
            qSesionesHoy = qSesionesHoy.Where(s => _context.EventosDeteccion.Any(e => e.TarjetaId == s.TarjetaId && e.TimestampUtc >= s.HoraIngreso && e.ZonaId == zonaId));
        }
        else if (pisoId.HasValue) {
            qSesionesHoy = qSesionesHoy.Where(s => _context.EventosDeteccion.Any(e => e.TarjetaId == s.TarjetaId && e.TimestampUtc >= s.HoraIngreso && e.Zona.PisoId == pisoId));
        }
        else if (assignedPisos != null) {
            qSesionesHoy = qSesionesHoy.Where(s => _context.EventosDeteccion.Any(e => e.TarjetaId == s.TarjetaId && e.TimestampUtc >= s.HoraIngreso && assignedPisos.Contains(e.Zona.PisoId)));
        }

        var sesionesHoy = await qSesionesHoy.ToListAsync();

        double? tiempoEsperaPromedioMins = sesionesHoy.Any() ? Math.Round(sesionesHoy.Average(s => s.TiempoEsperaSegundos) / 60.0, 1) : 0;
        double? duracionConsultaPromedioMins = sesionesHoy.Any() ? Math.Round(sesionesHoy.Average(s => s.DuracionConsultaSegundos) / 60.0, 1) : 0;

        if (zonaId.HasValue)
        {
            var zona = await _context.Zonas.FindAsync(zonaId.Value);
            if (zona != null)
            {
                if (zona.Tipo == TipoZona.SalaDeEspera) duracionConsultaPromedioMins = null;
                else if (zona.Tipo == TipoZona.Consultorio) tiempoEsperaPromedioMins = null;
                else if (zona.Tipo == TipoZona.Admision) { tiempoEsperaPromedioMins = null; duracionConsultaPromedioMins = null; }
            }
        }

        return Ok(new {
            AforoActual = aforoActual,
            TiempoEsperaPromedio = tiempoEsperaPromedioMins,
            DuracionConsultaPromedio = duracionConsultaPromedioMins,
            PacientesAtendidos = atendidos
        });
    }

    [HttpGet("mapa-calor")]
    public async Task<IActionResult> GetMapaCalor([FromQuery] int? pisoId)
    {
        var assignedPisos = GetAssignedPisos();
        if (!IsPisoAllowed(pisoId, assignedPisos)) return Forbid();

        var query = _context.Zonas.Where(z => z.Activa && z.EnSeguimiento).AsQueryable();
        if (pisoId.HasValue) query = query.Where(z => z.PisoId == pisoId.Value);
        else if (assignedPisos != null) query = query.Where(z => assignedPisos.Contains(z.PisoId));

        var zonas = await query.ToListAsync();
        var result = new List<object>();

        foreach (var z in zonas)
        {
            var ocupacion = await _context.SesionesCircuito.CountAsync(s => s.ZonaActualId == z.Id && s.Estado == EstadoSesion.EnCircuito);
            var porcentaje = z.AforoMaximo > 0 ? (double)ocupacion / z.AforoMaximo * 100 : 0;
            string color = porcentaje < 70 ? "verde" : (porcentaje < 100 ? "amarillo" : "rojo");

            result.Add(new {
                ZonaId = z.Id,
                z.Nombre,
                Ocupacion = ocupacion,
                z.AforoMaximo,
                Porcentaje = porcentaje,
                Color = color
            });
        }
        return Ok(result);
    }

    [HttpGet("actividad-circuito")]
    public async Task<IActionResult> GetActividad([FromQuery] int? pisoId, [FromQuery] int? zonaId, [FromQuery] int limit = 6)
    {
        var assignedPisos = GetAssignedPisos();
        if (!await ValidatePisoAndZonaAsync(pisoId, zonaId, assignedPisos)) return Forbid();

        var query = _context.SesionesCircuito
            .Include(s => s.ZonaActual)
            .Where(s => s.ZonaActual != null && s.ZonaActual.EnSeguimiento)
            .OrderByDescending(s => s.HoraIngreso)
            .AsQueryable();

        if (zonaId.HasValue) 
            query = query.Where(s => s.ZonaActualId == zonaId.Value);
        else if (pisoId.HasValue)
            query = query.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId.Value);
        else if (assignedPisos != null)
            query = query.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));

        var result = await query.Take(limit).Select(s => new {
            s.Id,
            s.CodigoPacienteAnonimo,
            Estado = s.Estado.ToString(),
            ZonaActual = s.ZonaActual != null ? s.ZonaActual.Nombre : "Ninguna",
            ZonaActualTipo = s.ZonaActual != null ? s.ZonaActual.Tipo.ToString() : null,
            s.HoraIngreso,
            s.HoraSalida
        }).ToListAsync();

        return Ok(result);
    }

    [HttpGet("aforo-historico")]
    public async Task<IActionResult> GetAforoHistorico([FromQuery] int? pisoId, [FromQuery] int? zonaId, [FromQuery] string fecha)
    {
        var assignedPisos = GetAssignedPisos();
        if (!await ValidatePisoAndZonaAsync(pisoId, zonaId, assignedPisos)) return Forbid();

        var hoyLocal = DateTime.UtcNow.AddHours(-5).Date;
        var startUtc = hoyLocal.AddHours(5);
        var endUtc = startUtc.AddDays(1);

        var sesiones = await _context.SesionesCircuito
            .Where(s => s.HoraIngreso < endUtc && (s.HoraSalida == null || s.HoraSalida >= startUtc))
            .ToListAsync();

        var tarjetaIds = sesiones.Select(s => s.TarjetaId).Distinct().ToList();

        var eventos = await _context.EventosDeteccion
            .Include(e => e.Zona)
            .Where(e => tarjetaIds.Contains(e.TarjetaId) && e.TimestampUtc < endUtc)
            .ToListAsync();

        int minLocalHour = 7;
        int maxLocalHour = 19;
        
        var eventosHoy = eventos.Where(e => e.TimestampUtc >= startUtc).ToList();
        if (eventosHoy.Any())
        {
            minLocalHour = Math.Min(minLocalHour, eventosHoy.Min(e => e.TimestampUtc.AddHours(-5).Hour));
            maxLocalHour = Math.Max(maxLocalHour, eventosHoy.Max(e => e.TimestampUtc.AddHours(-5).Hour));
        }

        var data = new List<object>();
        for (int h = minLocalHour; h <= maxLocalHour; h++)
        {
            int maxAforo = 0;
            foreach (int m in new[] { 0, 15, 30, 45 })
            {
                var tUtc = startUtc.AddHours(h).AddMinutes(m);
                int countT = 0;

                foreach (var s in sesiones)
                {
                    if (s.HoraIngreso <= tUtc && (s.HoraSalida == null || s.HoraSalida >= tUtc))
                    {
                        var lastEvt = eventos
                            .Where(e => e.TarjetaId == s.TarjetaId && e.TimestampUtc <= tUtc)
                            .OrderByDescending(e => e.TimestampUtc)
                            .FirstOrDefault();

                        if (lastEvt != null)
                        {
                            bool matches = false;
                            if (zonaId.HasValue) matches = lastEvt.ZonaId == zonaId.Value;
                            else if (pisoId.HasValue) matches = lastEvt.Zona.PisoId == pisoId.Value;
                            else if (assignedPisos != null) matches = assignedPisos.Contains(lastEvt.Zona.PisoId);
                            else matches = true;

                            if (matches) countT++;
                        }
                    }
                }
                maxAforo = Math.Max(maxAforo, countT);
            }

            data.Add(new {
                Hora = $"{h:00}:00",
                Aforo = maxAforo
            });
        }

        return Ok(data);
    }
}
