using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;
using GdCreoPlus.Api.Data;
using GdCreoPlus.Api.Models;

namespace GdCreoPlus.Api.Services;

public class MqttListenerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private IMqttClient? _mqttClient;

    public MqttListenerService(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var mqttFactory = new MqttFactory();
        _mqttClient = mqttFactory.CreateMqttClient();

        var host = _configuration["Mqtt:Host"] ?? "localhost";
        var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(host, port)
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += async e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.ConvertPayloadToString();
            
            try
            {
                var evt = JsonSerializer.Deserialize<MqttEventDto>(payload);
                if (evt != null)
                {
                    await ProcessEvent(topic, evt);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing MQTT message: {ex.Message}");
            }
        };

        _mqttClient.ConnectedAsync += async e =>
        {
            Console.WriteLine("Connected to MQTT broker.");
            await _mqttClient.SubscribeAsync("creo/piso1/+/telemetria");
        };

        _mqttClient.DisconnectedAsync += async e =>
        {
            Console.WriteLine("Disconnected from MQTT broker. Reconnecting...");
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            try
            {
                await _mqttClient.ConnectAsync(options, stoppingToken);
            }
            catch { }
        };

        try
        {
            await _mqttClient.ConnectAsync(options, stoppingToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to connect to MQTT broker initially: {ex.Message}");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task ProcessEvent(string topic, MqttEventDto evt)
    {
        // Simple hysteresis logic could be more complex, keeping track of previous readings.
        // For scaffolding, we just record the event and update the session.
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // extract zonaId from topic or DB based on node. Here we parse topic: creo/piso1/{codigo_zona}/telemetria
        var parts = topic.Split('/');
        if (parts.Length < 3) return;
        var codigoZona = parts[2]; // Using node identifier as codigo_zona in this simple mock

        var nodo = db.NodosESP32.FirstOrDefault(n => n.Identificador == codigoZona);
        if (nodo == null) return;

        var tarjeta = db.Tarjetas.FirstOrDefault(t => t.CodigoUUID == evt.tarjetaUUID);
        if (tarjeta == null)
        {
            tarjeta = new Tarjeta { CodigoUUID = evt.tarjetaUUID, Activa = true };
            db.Tarjetas.Add(tarjeta);
            await db.SaveChangesAsync();
        }

        var dbEvent = new EventoDeteccion
        {
            TarjetaId = tarjeta.Id,
            ZonaId = nodo.ZonaId,
            TimestampUtc = evt.timestamp,
            ValorRSSI = evt.rssi
        };
        db.EventosDeteccion.Add(dbEvent);

        var sesion = db.SesionesCircuito.FirstOrDefault(s => s.TarjetaId == tarjeta.Id && s.Estado == EstadoSesion.EnCircuito);
        if (sesion == null)
        {
            // Start new session
            sesion = new SesionCircuito
            {
                TarjetaId = tarjeta.Id,
                CodigoPacienteAnonimo = $"Paciente #{new Random().Next(100,999)}",
                ZonaActualId = nodo.ZonaId,
                Estado = EstadoSesion.EnCircuito,
                HoraIngreso = evt.timestamp
            };
            db.SesionesCircuito.Add(sesion);
        }
        else
        {
            // Simple hysteresis: just update if it's different. Real hysteresis would check multiple last events.
            if (sesion.ZonaActualId != nodo.ZonaId)
            {
                sesion.ZonaActualId = nodo.ZonaId;
            }
        }

        await db.SaveChangesAsync();
    }

    private class MqttEventDto
    {
        public string tarjetaUUID { get; set; } = string.Empty;
        public int rssi { get; set; }
        public DateTime timestamp { get; set; }
    }
}
