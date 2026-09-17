using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GdCreoPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public class LoginRequest
    {
        public string nombreUsuario { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.PisosAsignados)
            .FirstOrDefaultAsync(u => u.NombreUsuario == request.nombreUsuario && u.Activo);

        if (usuario == null || !BCrypt.Net.BCrypt.Verify(request.password, usuario.PasswordHash))
        {
            return Unauthorized(new { message = "Usuario o contraseña incorrectos" });
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrEmpty(jwtKey))
        {
            return StatusCode(500, new { message = "Falta configuración JWT." });
        }

        var key = Encoding.UTF8.GetBytes(jwtKey);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.NombreUsuario),
            new Claim(ClaimTypes.Role, usuario.Rol.ToString())
        };

        if (usuario.Rol == Rol.Operador)
        {
            foreach (var pa in usuario.PisosAsignados)
            {
                claims.Add(new Claim("PisoAsignado", pa.PisoId.ToString()));
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        var pisosAsignados = usuario.Rol == Rol.Operador 
            ? usuario.PisosAsignados.Select(pa => pa.PisoId).ToList() 
            : new List<int>();

        return Ok(new
        {
            token = tokenString,
            rol = usuario.Rol.ToString(),
            nombreCompleto = usuario.NombreCompleto,
            pisosAsignados = pisosAsignados
        });
    }
}
