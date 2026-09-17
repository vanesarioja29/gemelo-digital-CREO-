using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;

namespace GdCreoPlus.NodeSimulator;

    class TarjetaState
    {
        public string Uuid { get; set; } = string.Empty;
        public int NodeIndex { get; set; }
        public int CyclesInNode { get; set; }
    }

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
        var tarjetasActivas = new List<TarjetaState>();
        var random = new Random();

        // Loop de simulación
        while (true)
        {
            // Ocasionalmente "entra" un nuevo paciente a Admisión
            if (random.Next(10) < 3) 
            {
                var nuevaTarjeta = new TarjetaState { Uuid = Guid.NewGuid().ToString(), NodeIndex = 0, CyclesInNode = 0 };
                tarjetasActivas.Add(nuevaTarjeta);
                Console.WriteLine($"[Nueva Tarjeta]: {nuevaTarjeta.Uuid}");
            }

            foreach (var tarjeta in tarjetasActivas.ToList())
            {
                var nodoActual = nodos[tarjeta.NodeIndex];
                var rssi = random.Next(-90, -40); // Valores de señal
                var topic = $"creo/piso1/{nodoActual}/telemetria";

                var payload = new
                {
                    tarjetaUUID = tarjeta.Uuid,
                    rssi = rssi,
                    timestamp = DateTime.UtcNow
                };

                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(topic)
                    .WithPayload(JsonSerializer.Serialize(payload))
                    .Build();

                await mqttClient.PublishAsync(message, CancellationToken.None);
                Console.WriteLine($"Publicado {tarjeta.Uuid} en {nodoActual} (RSSI: {rssi})");

                tarjeta.CyclesInNode++;

                // Lógica de avance: Permanece algunos ciclos en la zona actual antes de avanzar
                // Admisión (índice 0): rápido (ej. 2-3 ciclos)
                // Espera (índice 1): medio (ej. 4-8 ciclos)
                // Consultorio (índice 2): medio (ej. 3-6 ciclos)
                bool debeAvanzar = false;
                if (tarjeta.NodeIndex == 0 && tarjeta.CyclesInNode > random.Next(2, 4)) debeAvanzar = true;
                else if (tarjeta.NodeIndex == 1 && tarjeta.CyclesInNode > random.Next(4, 9)) debeAvanzar = true;
                else if (tarjeta.NodeIndex == 2 && tarjeta.CyclesInNode > random.Next(3, 7)) debeAvanzar = true;

                if (debeAvanzar)
                {
                    tarjeta.NodeIndex++;
                    tarjeta.CyclesInNode = 0;

                    // Si ya superó el último nodo, "sale"
                    if (tarjeta.NodeIndex >= nodos.Length)
                    {
                        var salidaTopic = "creo/piso1/salida";
                        var salidaPayload = new
                        {
                            tarjetaUUID = tarjeta.Uuid,
                            timestamp = DateTime.UtcNow
                        };
                        var salidaMessage = new MqttApplicationMessageBuilder()
                            .WithTopic(salidaTopic)
                            .WithPayload(JsonSerializer.Serialize(salidaPayload))
                            .Build();
                        await mqttClient.PublishAsync(salidaMessage, CancellationToken.None);
                        
                        tarjetasActivas.Remove(tarjeta);
                        Console.WriteLine($"[Salida Tarjeta]: {tarjeta.Uuid}");
                    }
                }
            }

            await Task.Delay(2500); // Intervalo de 2.5s como pedido en requerimientos
        }
    }
}
