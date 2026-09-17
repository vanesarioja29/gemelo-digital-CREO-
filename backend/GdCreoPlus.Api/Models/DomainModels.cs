namespace GdCreoPlus.Api.Models;

public enum TipoZona
{
    Admision,
    SalaDeEspera,
    Consultorio
}

public enum EstadoSesion
{
    EnCircuito,
    Atendido
}

public class Sede
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public bool Activa { get; set; }
}

public class Piso
{
    public int Id { get; set; }
    public int SedeId { get; set; }
    public Sede Sede { get; set; } = null!;
    public int Numero { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class Zona
{
    public int Id { get; set; }
    public int PisoId { get; set; }
    public Piso Piso { get; set; } = null!;
    public string Nombre { get; set; } = string.Empty;
    public TipoZona Tipo { get; set; }
    public int AforoMaximo { get; set; }
}

public class NodoESP32
{
    public int Id { get; set; }
    public int ZonaId { get; set; }
    public Zona Zona { get; set; } = null!;
    public string Identificador { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class Tarjeta
{
    public int Id { get; set; }
    public string CodigoUUID { get; set; } = string.Empty;
    public bool Activa { get; set; }
}

public class EventoDeteccion
{
    public int Id { get; set; }
    public int TarjetaId { get; set; }
    public Tarjeta Tarjeta { get; set; } = null!;
    public int ZonaId { get; set; }
    public Zona Zona { get; set; } = null!;
    public DateTime TimestampUtc { get; set; }
    public int ValorRSSI { get; set; }
}

public class SesionCircuito
{
    public int Id { get; set; }
    public int TarjetaId { get; set; }
    public Tarjeta Tarjeta { get; set; } = null!;
    public string CodigoPacienteAnonimo { get; set; } = string.Empty;
    public int? ZonaActualId { get; set; }
    public Zona? ZonaActual { get; set; }
    public EstadoSesion Estado { get; set; }
    public DateTime HoraIngreso { get; set; }
    public DateTime? HoraSalida { get; set; }
    public int TiempoEsperaSegundos { get; set; }
    public int DuracionConsultaSegundos { get; set; }
}

public enum Rol
{
    Administrador,
    Operador,
    Gerencia
}

public class Usuario
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string NombreUsuario { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Rol Rol { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public ICollection<UsuarioPisoAsignado> PisosAsignados { get; set; } = new List<UsuarioPisoAsignado>();
}

public class UsuarioPisoAsignado
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    
    public int PisoId { get; set; }
    public Piso Piso { get; set; } = null!;
}
