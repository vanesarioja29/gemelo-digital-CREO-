using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;

namespace GdCreoPlus.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ZonasController : ControllerBase
{
    private readonly AppDbContext _context;

    public ZonasController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? pisoId)
    {
        var query = _context.Zonas.AsQueryable();
        if (pisoId.HasValue)
        {
            query = query.Where(z => z.PisoId == pisoId.Value);
        }
        var zonas = await query.ToListAsync();
        
        // Mock aforo actual for now
        var result = zonas.Select(z => new {
            z.Id,
            z.Nombre,
            z.Tipo,
            z.AforoMaximo,
            AforoActual = _context.SesionesCircuito.Count(s => s.ZonaActualId == z.Id && s.Estado == Models.EstadoSesion.EnCircuito)
        });

        return Ok(result);
    }
}
