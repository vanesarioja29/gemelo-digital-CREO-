using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis([FromQuery] int? pisoId, [FromQuery] int? zonaId)
    {
        // For now, mock calculation
        var aforoActual = await _context.SesionesCircuito.CountAsync(s => s.Estado == EstadoSesion.EnCircuito && (!zonaId.HasValue || s.ZonaActualId == zonaId));
        var atendidos = await _context.SesionesCircuito.CountAsync(s => s.Estado == EstadoSesion.Atendido);
        
        return Ok(new {
            AforoActual = aforoActual,
            TiempoEsperaPromedio = 15, // Mock mins
            DuracionConsultaPromedio = 20, // Mock mins
            PacientesAtendidos = atendidos // Siempre global
        });
    }

    [HttpGet("mapa-calor")]
    public async Task<IActionResult> GetMapaCalor([FromQuery] int? pisoId)
    {
        var zonas = await _context.Zonas.Where(z => !pisoId.HasValue || z.PisoId == pisoId.Value).ToListAsync();
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
        var query = _context.SesionesCircuito
            .Include(s => s.ZonaActual)
            .OrderByDescending(s => s.HoraIngreso)
            .AsQueryable();

        if (zonaId.HasValue) query = query.Where(s => s.ZonaActualId == zonaId.Value);

        var result = await query.Take(limit).Select(s => new {
            s.Id,
            s.CodigoPacienteAnonimo,
            Estado = s.Estado.ToString(),
            ZonaActual = s.ZonaActual != null ? s.ZonaActual.Nombre : "Ninguna",
            s.HoraIngreso,
            s.HoraSalida
        }).ToListAsync();

        return Ok(result);
    }

    [HttpGet("aforo-historico")]
    public async Task<IActionResult> GetAforoHistorico([FromQuery] int? pisoId, [FromQuery] int? zonaId, [FromQuery] string fecha)
    {
        // Mock data
        var rnd = new Random();
        var data = Enumerable.Range(8, 12).Select(h => new {
            Hora = $"{h}:00",
            Aforo = rnd.Next(5, 50)
        });
        return Ok(data);
    }
}
