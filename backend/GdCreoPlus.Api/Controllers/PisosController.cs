using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;

using Microsoft.AspNetCore.Authorization;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PisosController : ControllerBase
{
    private readonly AppDbContext _context;

    public PisosController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? sedeId)
    {
        var query = _context.Pisos.Include(p => p.Sede).AsQueryable();
        if (sedeId.HasValue)
        {
            query = query.Where(p => p.SedeId == sedeId.Value);
        }

        if (User.IsInRole(Rol.Operador.ToString()))
        {
            var assignedPisos = User.Claims
                .Where(c => c.Type == "PisoAsignado")
                .Select(c => int.Parse(c.Value))
                .ToList();
            
            query = query.Where(p => assignedPisos.Contains(p.Id));
        }

        return Ok(await query.ToListAsync());
    }
}
