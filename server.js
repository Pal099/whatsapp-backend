const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const createWhatsAppClient = require('./whatsappClient');
const dataStore = require('./store/dataStore');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket']
});

app.use(cors());
app.use(express.json());

// Inicializa datos
(async () => {
  await dataStore.init();
})();

// WhatsApp client
createWhatsAppClient(io, dataStore);

// Endpoint para obtener mensajes separados por estado
app.get('/api/mensajes', (req, res) => {
  const mensajes = dataStore.obtenerMensajes();
  const nuevos = mensajes.filter(m => m.estado === 'nuevo');
  const enProceso = mensajes.filter(m => m.estado === 'enProceso');
  const atendidos = mensajes.filter(m => m.estado === 'atendido');

  res.json({ nuevos, enProceso, atendidos });
});

// Endpoint para actualizar nota, etiquetas o estado
app.post('/api/mensajes/:id', async (req, res) => {
  const { id } = req.params;
  const cambios = req.body; // { nota, etiquetas, estado }

  await dataStore.actualizarMensaje(id, cambios);
  const msgActualizado = dataStore.obtenerMensajes().find(m => m.id === id);

  io.emit('actualizar_mensaje', msgActualizado);
  res.json({ success: true, mensaje: msgActualizado });
});

// Socket para enviar mensaje via WhatsApp
io.on('connection', (socket) => {
  console.log('Cliente frontend conectado');

  socket.on('enviar_mensaje', async ({ numero, texto }) => {
    try {
      // Asumiendo que tienes acceso al client aquí (debes exportarlo o manejarlo)
      // Este es un ejemplo, ajusta según tu implementación
      if (client) {
        await client.sendMessage(numero + '@c.us', texto);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
