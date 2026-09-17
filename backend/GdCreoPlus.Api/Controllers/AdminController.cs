using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;
using System.Security.Claims;

namespace GdCreoPlus.Api.Controllers;

[Authorize(Roles = "Administrador")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    // ================== SEDES ==================

    [HttpGet("sedes")]
    public async Task<IActionResult> GetSedes()
    {
        var sedes = await _context.Sedes.ToListAsync();
        return Ok(sedes);
    }

    public class SedeRequest { public string Nombre { get; set; } = string.Empty; public string Direccion { get; set; } = string.Empty; public bool? Activa { get; set; } }

    [HttpPost("sedes")]
    public async Task<IActionResult> CreateSede([FromBody] SedeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre) || string.IsNullOrWhiteSpace(req.Direccion))
            return BadRequest(new { message = "El nombre y la dirección no pueden estar vacíos." });

        var sede = new Sede { Nombre = req.Nombre, Direccion = req.Direccion, Activa = true };
        _context.Sedes.Add(sede);
        await _context.SaveChangesAsync();
        return Ok(sede);
    }

    [HttpPut("sedes/{id}")]
    public async Task<IActionResult> UpdateSede(int id, [FromBody] SedeRequest req)
    {
        var sede = await _context.Sedes.FindAsync(id);
        if (sede == null) return NotFound(new { message = "Sede no encontrada." });

        if (string.IsNullOrWhiteSpace(req.Nombre) || string.IsNullOrWhiteSpace(req.Direccion))
            return BadRequest(new { message = "El nombre y la dirección no pueden estar vacíos." });

        sede.Nombre = req.Nombre;
        sede.Direccion = req.Direccion;
        if (req.Activa.HasValue) sede.Activa = req.Activa.Value;

        await _context.SaveChangesAsync();
        return Ok(sede);
    }

    [HttpDelete("sedes/{id}")]
    public async Task<IActionResult> DeleteSede(int id)
    {
        var sede = await _context.Sedes.FindAsync(id);
        if (sede == null) return NotFound(new { message = "Sede no encontrada." });

        var tienePisosActivos = await _context.Pisos.AnyAsync(p => p.SedeId == id && p.Activo);
        if (tienePisosActivos)
            return BadRequest(new { message = "No se puede desactivar una sede con pisos activos." });

        sede.Activa = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Sede desactivada correctamente." });
    }


    // ================== PISOS ==================

    [HttpGet("pisos")]
    public async Task<IActionResult> GetPisos([FromQuery] int? sedeId)
    {
        var query = _context.Pisos.AsQueryable();
        if (sedeId.HasValue) query = query.Where(p => p.SedeId == sedeId.Value);
        return Ok(await query.ToListAsync());
    }

    public class PisoRequest { public int SedeId { get; set; } public int Numero { get; set; } public string Nombre { get; set; } = string.Empty; public bool? Activo { get; set; } }

    [HttpPost("pisos")]
    public async Task<IActionResult> CreatePiso([FromBody] PisoRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest(new { message = "El nombre del piso no puede estar vacío." });

        var sedeExiste = await _context.Sedes.AnyAsync(s => s.Id == req.SedeId);
        if (!sedeExiste) return NotFound(new { message = "Sede no encontrada." });

        var piso = new Piso { SedeId = req.SedeId, Numero = req.Numero, Nombre = req.Nombre, Activo = true };
        _context.Pisos.Add(piso);
        await _context.SaveChangesAsync();
        return Ok(piso);
    }

    [HttpPut("pisos/{id}")]
    public async Task<IActionResult> UpdatePiso(int id, [FromBody] PisoRequest req)
    {
        var piso = await _context.Pisos.FindAsync(id);
        if (piso == null) return NotFound(new { message = "Piso no encontrado." });

        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest(new { message = "El nombre del piso no puede estar vacío." });

        piso.Numero = req.Numero;
        piso.Nombre = req.Nombre;
        if (req.Activo.HasValue) piso.Activo = req.Activo.Value;

        await _context.SaveChangesAsync();
        return Ok(piso);
    }

    [HttpDelete("pisos/{id}")]
    public async Task<IActionResult> DeletePiso(int id)
    {
        var piso = await _context.Pisos.FindAsync(id);
        if (piso == null) return NotFound(new { message = "Piso no encontrado." });

        var tieneZonas = await _context.Zonas.AnyAsync(z => z.PisoId == id); // as Zonas don't have Activa flag, we assume if they exist they are active
        if (tieneZonas)
            return BadRequest(new { message = "No se puede desactivar un piso con zonas registradas." });

        piso.Activo = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Piso desactivado correctamente." });
    }


    // ================== ZONAS ==================

    [HttpGet("zonas")]
    public async Task<IActionResult> GetZonas([FromQuery] int? pisoId)
    {
        var query = _context.Zonas.AsQueryable();
        if (pisoId.HasValue) query = query.Where(z => z.PisoId == pisoId.Value);
        return Ok(await query.ToListAsync());
    }

    public class ZonaRequest { public int PisoId { get; set; } public string Nombre { get; set; } = string.Empty; public TipoZona Tipo { get; set; } public int AforoMaximo { get; set; } }

    [HttpPost("zonas")]
    public async Task<IActionResult> CreateZona([FromBody] ZonaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest(new { message = "El nombre de la zona no puede estar vacío." });
        if (req.AforoMaximo <= 0)
            return BadRequest(new { message = "El aforo máximo debe ser mayor a 0." });

        var pisoExiste = await _context.Pisos.AnyAsync(p => p.Id == req.PisoId);
        if (!pisoExiste) return NotFound(new { message = "Piso no encontrado." });

        var zona = new Zona { PisoId = req.PisoId, Nombre = req.Nombre, Tipo = req.Tipo, AforoMaximo = req.AforoMaximo };
        _context.Zonas.Add(zona);
        await _context.SaveChangesAsync();
        return Ok(zona);
    }

    [HttpPut("zonas/{id}")]
    public async Task<IActionResult> UpdateZona(int id, [FromBody] ZonaRequest req)
    {
        var zona = await _context.Zonas.FindAsync(id);
        if (zona == null) return NotFound(new { message = "Zona no encontrada." });

        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest(new { message = "El nombre de la zona no puede estar vacío." });
        if (req.AforoMaximo <= 0)
            return BadRequest(new { message = "El aforo máximo debe ser mayor a 0." });

        zona.Nombre = req.Nombre;
        zona.Tipo = req.Tipo;
        zona.AforoMaximo = req.AforoMaximo;

        await _context.SaveChangesAsync();
        return Ok(zona);
    }

    [HttpDelete("zonas/{id}")]
    public async Task<IActionResult> DeleteZona(int id)
    {
        var zona = await _context.Zonas.FindAsync(id);
        if (zona == null) return NotFound(new { message = "Zona no encontrada." });

        var pacientesEnCircuito = await _context.SesionesCircuito.AnyAsync(s => s.ZonaActualId == id && s.Estado == EstadoSesion.EnCircuito);
        if (pacientesEnCircuito)
            return BadRequest(new { message = "No se puede eliminar una zona con pacientes en circuito." });

        _context.Zonas.Remove(zona);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Zona eliminada correctamente." });
    }


    // ================== USUARIOS ==================

    [HttpGet("usuarios")]
    public async Task<IActionResult> GetUsuarios()
    {
        var usuarios = await _context.Usuarios
            .Include(u => u.PisosAsignados)
            .Select(u => new
            {
                u.Id,
                u.NombreCompleto,
                u.NombreUsuario,
                Rol = u.Rol.ToString(),
                u.Activo,
                PisosAsignados = u.Rol == Rol.Operador ? u.PisosAsignados.Select(p => p.PisoId).ToList() : new List<int>()
            })
            .ToListAsync();
        return Ok(usuarios);
    }

    public class UsuarioRequest { 
        public string NombreCompleto { get; set; } = string.Empty; 
        public string NombreUsuario { get; set; } = string.Empty; 
        public string? Password { get; set; }
        public Rol Rol { get; set; } 
        public bool? Activo { get; set; }
        public List<int> PisosAsignados { get; set; } = new List<int>();
    }

    [HttpPost("usuarios")]
    public async Task<IActionResult> CreateUsuario([FromBody] UsuarioRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.NombreCompleto) || string.IsNullOrWhiteSpace(req.NombreUsuario) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Nombre, usuario y contraseña son obligatorios." });

        if (await _context.Usuarios.AnyAsync(u => u.NombreUsuario == req.NombreUsuario))
            return BadRequest(new { message = "El nombre de usuario ya existe." });

        var usuario = new Usuario
        {
            NombreCompleto = req.NombreCompleto,
            NombreUsuario = req.NombreUsuario,
            Rol = req.Rol,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Activo = true
        };

        if (req.Rol == Rol.Operador && req.PisosAsignados != null)
        {
            foreach (var pId in req.PisosAsignados)
            {
                var pisoExiste = await _context.Pisos.AnyAsync(p => p.Id == pId);
                if (!pisoExiste) return NotFound(new { message = $"El piso ID {pId} no existe." });
                usuario.PisosAsignados.Add(new UsuarioPisoAsignado { PisoId = pId });
            }
        }

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "Usuario creado exitosamente.", usuarioId = usuario.Id });
    }

    [HttpPut("usuarios/{id}")]
    public async Task<IActionResult> UpdateUsuario(int id, [FromBody] UsuarioRequest req)
    {
        var usuario = await _context.Usuarios.Include(u => u.PisosAsignados).FirstOrDefaultAsync(u => u.Id == id);
        if (usuario == null) return NotFound(new { message = "Usuario no encontrado." });

        if (string.IsNullOrWhiteSpace(req.NombreCompleto))
            return BadRequest(new { message = "El nombre completo no puede estar vacío." });

        usuario.NombreCompleto = req.NombreCompleto;
        usuario.Rol = req.Rol;
        if (req.Activo.HasValue) usuario.Activo = req.Activo.Value;

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        }

        // Handle pisos asignados
        _context.UsuariosPisosAsignados.RemoveRange(usuario.PisosAsignados);
        usuario.PisosAsignados.Clear();

        if (req.Rol == Rol.Operador && req.PisosAsignados != null)
        {
            foreach (var pId in req.PisosAsignados)
            {
                var pisoExiste = await _context.Pisos.AnyAsync(p => p.Id == pId);
                if (!pisoExiste) return NotFound(new { message = $"El piso ID {pId} no existe." });
                usuario.PisosAsignados.Add(new UsuarioPisoAsignado { PisoId = pId });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Usuario actualizado exitosamente." });
    }

    [HttpDelete("usuarios/{id}")]
    public async Task<IActionResult> DeleteUsuario(int id)
    {
        var currentUserClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (currentUserClaim != null && int.TryParse(currentUserClaim.Value, out int currentUserId))
        {
            if (currentUserId == id)
                return BadRequest(new { message = "No puedes desactivar tu propio usuario." });
        }

        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null) return NotFound(new { message = "Usuario no encontrado." });

        usuario.Activo = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Usuario desactivado correctamente." });
    }
}
