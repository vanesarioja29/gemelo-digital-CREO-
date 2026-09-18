using Microsoft.EntityFrameworkCore;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Sede> Sedes { get; set; } = null!;
    public DbSet<Piso> Pisos { get; set; } = null!;
    public DbSet<Zona> Zonas { get; set; } = null!;
    public DbSet<NodoESP32> NodosESP32 { get; set; } = null!;
    public DbSet<Tarjeta> Tarjetas { get; set; } = null!;
    public DbSet<EventoDeteccion> EventosDeteccion { get; set; } = null!;
    public DbSet<SesionCircuito> SesionesCircuito { get; set; } = null!;
    public DbSet<Usuario> Usuarios { get; set; } = null!;
    public DbSet<UsuarioPisoAsignado> UsuariosPisosAsignados { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var dateTimeConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
            v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var nullableDateTimeConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
            v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(dateTimeConverter);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(nullableDateTimeConverter);
            }
        }
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.NombreUsuario)
            .IsUnique();

        // Seed data
        modelBuilder.Entity<Sede>().HasData(
            new Sede { Id = 1, Nombre = "CREO+ San Isidro", Direccion = "San Isidro, Lima", Activa = true }
        );

        modelBuilder.Entity<Piso>().HasData(
            new Piso { Id = 1, SedeId = 1, Numero = 1, Nombre = "Piso 1", Activo = true }
        );

        modelBuilder.Entity<Zona>().HasData(
            new Zona { Id = 1, PisoId = 1, Nombre = "Admisión", Tipo = TipoZona.Admision, AforoMaximo = 6, Activa = true, EnSeguimiento = true },
            new Zona { Id = 2, PisoId = 1, Nombre = "Sala de Espera General", Tipo = TipoZona.SalaDeEspera, AforoMaximo = 18, Activa = true, EnSeguimiento = true },
            new Zona { Id = 3, PisoId = 1, Nombre = "Consultorio Piloto", Tipo = TipoZona.Consultorio, AforoMaximo = 2, Activa = true, EnSeguimiento = true }
        );

        modelBuilder.Entity<NodoESP32>().HasData(
            new NodoESP32 { Id = 1, ZonaId = 1, Identificador = "NODE_ADM_01", Activo = true },
            new NodoESP32 { Id = 2, ZonaId = 2, Identificador = "NODE_ESP_01", Activo = true },
            new NodoESP32 { Id = 3, ZonaId = 3, Identificador = "NODE_CON_01", Activo = true }
        );

        modelBuilder.Entity<Usuario>().HasData(
            new Usuario 
            { 
                Id = 1, 
                NombreCompleto = "Administrador del Sistema",
                NombreUsuario = "admin", 
                Rol = Rol.Administrador, 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Creo2026*"),
                Activo = true,
                FechaCreacion = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
