using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;

namespace GdCreoPlus.Api.Controllers;

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
        var query = _context.Pisos.AsQueryable();
        if (sedeId.HasValue)
        {
            query = query.Where(p => p.SedeId == sedeId.Value);
        }
        return Ok(await query.ToListAsync());
    }
}
