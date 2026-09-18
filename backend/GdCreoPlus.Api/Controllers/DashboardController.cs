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
        var qAtendidos = _context.SesionesCircuito.Include(s => s.ZonaActual).Where(s => s.Estado == EstadoSesion.Atendido);

        if (zonaId.HasValue) 
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActualId == zonaId);
            qAtendidos = qAtendidos.Where(s => s.ZonaActualId == zonaId);
        }
        else if (pisoId.HasValue)
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId);
            qAtendidos = qAtendidos.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId); 
        }
        else if (assignedPisos != null)
        {
            qEnCircuito = qEnCircuito.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));
            qAtendidos = qAtendidos.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));
        }

        var aforoActual = await qEnCircuito.CountAsync();
        
        var atendidos = await qAtendidos.CountAsync();
        
        var hoy = DateTime.UtcNow.Date;
        var qSesionesHoy = _context.SesionesCircuito
            .Where(s => s.Estado == EstadoSesion.Atendido && s.HoraSalida != null && s.HoraSalida.Value.Date == hoy);

        if (zonaId.HasValue) qSesionesHoy = qSesionesHoy.Where(s => s.ZonaActualId == zonaId);
        else if (pisoId.HasValue) qSesionesHoy = qSesionesHoy.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId);
        else if (assignedPisos != null) qSesionesHoy = qSesionesHoy.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));

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

        var hoy = DateTime.UtcNow.Date;
        var qEventos = _context.EventosDeteccion.Where(e => e.TimestampUtc.Date == hoy);

        if (zonaId.HasValue)
            qEventos = qEventos.Where(e => e.ZonaId == zonaId.Value);
        else if (pisoId.HasValue)
            qEventos = qEventos.Where(e => e.Zona.PisoId == pisoId.Value);
        else if (assignedPisos != null)
            qEventos = qEventos.Where(e => assignedPisos.Contains(e.Zona.PisoId));

        var eventos = await qEventos.ToListAsync();

        var agrupadoporHora = eventos
            .GroupBy(e => e.TimestampUtc.Hour)
            .ToDictionary(g => g.Key, g => g.Select(e => e.TarjetaId).Distinct().Count());

        int startHour = 7;
        int endHour = 19;
        
        if (agrupadoporHora.Any())
        {
            startHour = Math.Min(startHour, agrupadoporHora.Keys.Min());
            endHour = Math.Max(endHour, agrupadoporHora.Keys.Max());
        }

        var data = Enumerable.Range(startHour, endHour - startHour + 1).Select(h => new {
            Hora = $"{h:00}:00",
            Aforo = agrupadoporHora.ContainsKey(h) ? agrupadoporHora[h] : 0
        });

        return Ok(data);
    }
}
