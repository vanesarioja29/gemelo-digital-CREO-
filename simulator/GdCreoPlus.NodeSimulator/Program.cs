using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;

namespace GdCreoPlus.NodeSimulator;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Iniciando Simulador de Nodos ESP32 GD-CREO+...");

        var mqttFactory = new MqttFactory();
        var mqttClient = mqttFactory.CreateMqttClient();
        
        var options = new MqttClientOptionsBuilder()
            .WithTcpServer("localhost", 1883)
            .Build();

        await mqttClient.ConnectAsync(options, CancellationToken.None);
        Console.WriteLine("Conectado al broker MQTT.");

        var nodos = new[] { "NODE_ADM_01", "NODE_ESP_01", "NODE_CON_01" };
        var tarjetasActivas = new List<string>();
        var random = new Random();

        // Loop de simulación
        while (true)
        {
            // Ocasionalmente "entra" un nuevo paciente a Admisión
            if (random.Next(10) < 3) 
            {
                var nuevaTarjeta = Guid.NewGuid().ToString();
                tarjetasActivas.Add(nuevaTarjeta);
                Console.WriteLine($"[Nueva Tarjeta]: {nuevaTarjeta}");
            }

            foreach (var tarjeta in tarjetasActivas.ToList())
            {
                // Decidir en qué nodo está la tarjeta aleatoriamente (en una simulación real avanzarían ordenadamente)
                var nodoActual = nodos[random.Next(nodos.Length)];
                var rssi = random.Next(-90, -40); // Valores de señal
                var topic = $"creo/piso1/{nodoActual}/telemetria";

                var payload = new
                {
                    tarjetaUUID = tarjeta,
                    rssi = rssi,
                    timestamp = DateTime.UtcNow
                };

                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(topic)
                    .WithPayload(JsonSerializer.Serialize(payload))
                    .Build();

                await mqttClient.PublishAsync(message, CancellationToken.None);
                Console.WriteLine($"Publicado {tarjeta} en {nodoActual} (RSSI: {rssi})");
            }

            // Ocasionalmente "sale" un paciente
            if (tarjetasActivas.Any() && random.Next(10) < 2)
            {
                var sale = tarjetasActivas[random.Next(tarjetasActivas.Count)];
                tarjetasActivas.Remove(sale);
                Console.WriteLine($"[Salida Tarjeta]: {sale}");
            }

            await Task.Delay(2500); // Intervalo de 2.5s como pedido en requerimientos
        }
    }
}
