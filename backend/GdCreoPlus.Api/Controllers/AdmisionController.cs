using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Services;

namespace GdCreoPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdmisionController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SesionCircuitoService _sesionService;

    public AdmisionController(AppDbContext context, SesionCircuitoService sesionService)
    {
        _context = context;
        _sesionService = sesionService;
    }

    [HttpGet("tarjetas-disponibles")]
    public async Task<IActionResult> GetTarjetas()
    {
        var tarjetas = await _context.Tarjetas
            .Where(t => t.Activa)
            .Select(t => new { t.Id, t.CodigoUUID })
            .ToListAsync();
        return Ok(tarjetas);
    }

    public class EscanearRequest
    {
        public string codigoQR { get; set; } = string.Empty;
    }

    [HttpPost("escanear")]
    public async Task<IActionResult> Escanear([FromBody] EscanearRequest request)
    {
        var tarjeta = await _context.Tarjetas.FirstOrDefaultAsync(t => t.CodigoUUID == request.codigoQR);
        if (tarjeta == null)
            return NotFound(new { error = "Tarjeta no reconocida." });

        var tieneSesionActiva = await _context.SesionesCircuito
            .AnyAsync(s => s.TarjetaId == tarjeta.Id && s.Estado == Models.EstadoSesion.EnCircuito);

        try
        {
            if (!tieneSesionActiva)
            {
                var sesion = await _sesionService.AbrirSesion(request.codigoQR);
                return Ok(new
                {
                    accion = "ingreso",
                    codigoPaciente = sesion.CodigoPacienteAnonimo,
                    horaIngreso = sesion.HoraIngreso
                });
            }
            else
            {
                var sesion = await _sesionService.CerrarSesion(request.codigoQR);
                return Ok(new
                {
                    accion = "salida",
                    codigoPaciente = sesion.CodigoPacienteAnonimo,
                    horaIngreso = sesion.HoraIngreso,
                    horaSalida = sesion.HoraSalida,
                    tiempoEsperaMinutos = Math.Round(sesion.TiempoEsperaSegundos / 60.0, 1),
                    duracionConsultaMinutos = Math.Round(sesion.DuracionConsultaSegundos / 60.0, 1)
                });
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
