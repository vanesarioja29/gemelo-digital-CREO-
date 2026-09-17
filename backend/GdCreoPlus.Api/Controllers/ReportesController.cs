using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using System.Text;

namespace GdCreoPlus.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar([FromQuery] string desde, [FromQuery] string hasta, [FromQuery] int? pisoId, [FromQuery] int? zonaId)
    {
        var sesiones = await _context.SesionesCircuito.Include(s => s.ZonaActual).ToListAsync();
        
        var sb = new StringBuilder();
        sb.AppendLine("Id,Paciente,Zona,Estado,Ingreso,Salida,EsperaSegundos,ConsultaSegundos");
        foreach(var s in sesiones)
        {
            sb.AppendLine($"{s.Id},{s.CodigoPacienteAnonimo},{s.ZonaActual?.Nombre},{s.Estado},{s.HoraIngreso},{s.HoraSalida},{s.TiempoEsperaSegundos},{s.DuracionConsultaSegundos}");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "reporte.csv");
    }
}
