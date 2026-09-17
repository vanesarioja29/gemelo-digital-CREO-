using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;
using System.Security.Claims;
using System.Text;

namespace GdCreoPlus.Api.Controllers;

[Authorize(Roles = "Operador,Administrador")]
[ApiController]
[Route("api/operador")]
public class OperadorController : ControllerBase
{
    private readonly AppDbContext _context;

    public OperadorController(AppDbContext context)
    {
        _context = context;
    }

    private List<int>? GetAssignedPisos()
    {
        if (User.IsInRole(Rol.Operador.ToString()))
            return User.Claims.Where(c => c.Type == "PisoAsignado").Select(c => int.Parse(c.Value)).ToList();
        return null;
    }

    private bool IsPisoAllowed(int pisoId, List<int>? assignedPisos)
    {
        if (assignedPisos == null) return true;
        return assignedPisos.Contains(pisoId);
    }

    [HttpGet("seguimiento")]
    public async Task<IActionResult> GetSeguimiento([FromQuery] int pisoId)
    {
        var assignedPisos = GetAssignedPisos();
        if (!IsPisoAllowed(pisoId, assignedPisos)) return Forbid();

        var zonas = await _context.Zonas
            .Where(z => z.PisoId == pisoId && z.Activa)
            .Select(z => new { z.Id, z.Nombre, z.EnSeguimiento })
            .ToListAsync();

        return Ok(zonas);
    }

    public class SeguimientoRequest { public bool EnSeguimiento { get; set; } }

    [HttpPut("seguimiento/{zonaId}")]
    public async Task<IActionResult> UpdateSeguimiento(int zonaId, [FromBody] SeguimientoRequest req)
    {
        var zona = await _context.Zonas.FindAsync(zonaId);
        if (zona == null || !zona.Activa) return NotFound(new { message = "Zona no encontrada o inactiva." });

        var assignedPisos = GetAssignedPisos();
        if (!IsPisoAllowed(zona.PisoId, assignedPisos)) return Forbid();

        zona.EnSeguimiento = req.EnSeguimiento;
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "Seguimiento actualizado correctamente.", zona.Id, zona.EnSeguimiento });
    }

    private IQueryable<SesionCircuito> GetReportesQuery(DateTime? desde, DateTime? hasta, int? pisoId, int? zonaId, EstadoSesion? estado)
    {
        var assignedPisos = GetAssignedPisos();

        var query = _context.SesionesCircuito
            .Include(s => s.ZonaActual)
            .ThenInclude(z => z!.Piso)
            .AsQueryable();

        // Limitación automática si es operador
        if (assignedPisos != null)
        {
            query = query.Where(s => s.ZonaActual != null && assignedPisos.Contains(s.ZonaActual.PisoId));
        }

        if (desde.HasValue) query = query.Where(s => s.HoraIngreso >= desde.Value);
        if (hasta.HasValue) query = query.Where(s => s.HoraIngreso <= hasta.Value);
        if (estado.HasValue) query = query.Where(s => s.Estado == estado.Value);

        if (zonaId.HasValue) 
        {
            query = query.Where(s => s.ZonaActualId == zonaId.Value);
        }
        else if (pisoId.HasValue)
        {
            query = query.Where(s => s.ZonaActual != null && s.ZonaActual.PisoId == pisoId.Value);
        }

        return query.OrderByDescending(s => s.HoraIngreso);
    }

    [HttpGet("reportes")]
    public async Task<IActionResult> GetReportes([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, [FromQuery] int? pisoId, [FromQuery] int? zonaId, [FromQuery] EstadoSesion? estado)
    {
        var assignedPisos = GetAssignedPisos();
        if (pisoId.HasValue && !IsPisoAllowed(pisoId.Value, assignedPisos)) return Forbid();

        var query = GetReportesQuery(desde, hasta, pisoId, zonaId, estado);

        var reportes = await query.Select(s => new {
            Fecha = s.HoraIngreso.Date.ToString("yyyy-MM-dd"),
            Piso = s.ZonaActual != null && s.ZonaActual.Piso != null ? s.ZonaActual.Piso.Nombre : "",
            Zona = s.ZonaActual != null ? s.ZonaActual.Nombre : "",
            CodigoPacienteAnonimo = s.CodigoPacienteAnonimo,
            HoraIngreso = s.HoraIngreso,
            HoraSalida = s.HoraSalida,
            TiempoEsperaMinutos = Math.Round(s.TiempoEsperaSegundos / 60.0, 2),
            DuracionConsultaMinutos = Math.Round(s.DuracionConsultaSegundos / 60.0, 2),
            Estado = s.Estado.ToString()
        }).ToListAsync();

        return Ok(reportes);
    }

    [HttpGet("reportes/exportar")]
    public async Task<IActionResult> ExportarReportes([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, [FromQuery] int? pisoId, [FromQuery] int? zonaId, [FromQuery] EstadoSesion? estado)
    {
        var assignedPisos = GetAssignedPisos();
        if (pisoId.HasValue && !IsPisoAllowed(pisoId.Value, assignedPisos)) return Forbid();

        var query = GetReportesQuery(desde, hasta, pisoId, zonaId, estado);

        var reportes = await query.Select(s => new {
            Fecha = s.HoraIngreso.Date.ToString("yyyy-MM-dd"),
            Piso = s.ZonaActual != null && s.ZonaActual.Piso != null ? s.ZonaActual.Piso.Nombre : "",
            Zona = s.ZonaActual != null ? s.ZonaActual.Nombre : "",
            CodigoPacienteAnonimo = s.CodigoPacienteAnonimo,
            HoraIngreso = s.HoraIngreso.ToString("HH:mm:ss"),
            HoraSalida = s.HoraSalida.HasValue ? s.HoraSalida.Value.ToString("HH:mm:ss") : "",
            TiempoEsperaMinutos = Math.Round(s.TiempoEsperaSegundos / 60.0, 2),
            DuracionConsultaMinutos = Math.Round(s.DuracionConsultaSegundos / 60.0, 2),
            Estado = s.Estado.ToString()
        }).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Fecha,Piso,Zona,CodigoPacienteAnonimo,HoraIngreso,HoraSalida,TiempoEsperaMinutos,DuracionConsultaMinutos,Estado");

        foreach (var r in reportes)
        {
            sb.AppendLine($"{r.Fecha},{r.Piso},{r.Zona},{r.CodigoPacienteAnonimo},{r.HoraIngreso},{r.HoraSalida},{r.TiempoEsperaMinutos},{r.DuracionConsultaMinutos},{r.Estado}");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "reportes.csv");
    }
}
