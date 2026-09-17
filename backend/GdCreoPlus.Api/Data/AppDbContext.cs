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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed data
        modelBuilder.Entity<Sede>().HasData(
            new Sede { Id = 1, Nombre = "CREO+ San Isidro", Direccion = "San Isidro, Lima", Activa = true }
        );

        modelBuilder.Entity<Piso>().HasData(
            new Piso { Id = 1, SedeId = 1, Numero = 1, Nombre = "Piso 1", Activo = true }
        );

        modelBuilder.Entity<Zona>().HasData(
            new Zona { Id = 1, PisoId = 1, Nombre = "Admisión", Tipo = TipoZona.Admision, AforoMaximo = 10 },
            new Zona { Id = 2, PisoId = 1, Nombre = "Sala de Espera General", Tipo = TipoZona.SalaDeEspera, AforoMaximo = 20 },
            new Zona { Id = 3, PisoId = 1, Nombre = "Consultorio Piloto", Tipo = TipoZona.Consultorio, AforoMaximo = 3 }
        );

        modelBuilder.Entity<NodoESP32>().HasData(
            new NodoESP32 { Id = 1, ZonaId = 1, Identificador = "NODE_ADM_01", Activo = true },
            new NodoESP32 { Id = 2, ZonaId = 2, Identificador = "NODE_ESP_01", Activo = true },
            new NodoESP32 { Id = 3, ZonaId = 3, Identificador = "NODE_CON_01", Activo = true }
        );
    }
}
