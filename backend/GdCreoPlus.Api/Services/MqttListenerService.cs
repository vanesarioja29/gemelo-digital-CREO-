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
            await _mqttClient.SubscribeAsync("creo/piso1/salida");
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
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sesionService = scope.ServiceProvider.GetRequiredService<SesionCircuitoService>();

        var tarjeta = db.Tarjetas.FirstOrDefault(t => t.CodigoUUID == evt.tarjetaUUID);
        if (tarjeta == null)
        {
            tarjeta = new Tarjeta { CodigoUUID = evt.tarjetaUUID, Activa = true };
            db.Tarjetas.Add(tarjeta);
            await db.SaveChangesAsync();
        }

        if (topic == "creo/piso1/salida")
        {
            try
            {
                await sesionService.CerrarSesion(evt.tarjetaUUID);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error closing session for UUID {evt.tarjetaUUID}: {ex.Message}");
            }
            return;
        }

        // extract zonaId from topic or DB based on node. Here we parse topic: creo/piso1/{codigo_zona}/telemetria
        var parts = topic.Split('/');
        if (parts.Length < 3) return;
        var codigoZona = parts[2]; // Using node identifier as codigo_zona in this simple mock

        var nodo = db.NodosESP32.FirstOrDefault(n => n.Identificador == codigoZona);
        if (nodo == null) return;

        var dbEvent = new EventoDeteccion
        {
            TarjetaId = tarjeta.Id,
            ZonaId = nodo.ZonaId,
            TimestampUtc = evt.timestamp,
            ValorRSSI = evt.rssi
        };
        db.EventosDeteccion.Add(dbEvent);

        var currentSesion = db.SesionesCircuito.FirstOrDefault(s => s.TarjetaId == tarjeta.Id && s.Estado == EstadoSesion.EnCircuito);
        if (currentSesion == null)
        {
            // The simulator sometimes randomly detects a card without "Admision" event from our backend 
            // In a real scenario, we might ignore this, but since we're auto-creating in the simulator:
            try
            {
                currentSesion = await sesionService.AbrirSesion(evt.tarjetaUUID);
                if (currentSesion.ZonaActualId != nodo.ZonaId)
                {
                    currentSesion.ZonaActualId = nodo.ZonaId;
                }
            }
            catch { }
        }
        else
        {
            // Simple hysteresis: just update if it's different. Real hysteresis would check multiple last events.
            if (currentSesion.ZonaActualId != nodo.ZonaId)
            {
                currentSesion.ZonaActualId = nodo.ZonaId;
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
