const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { loadData, saveData } = require('./utils/storage');
const createWhatsAppClient = require('./whatsapp/client');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let dataStore = {
  mensajes: [],
  notas: {},
  etiquetas: {},
  respuestas: {},
  save: async () => await saveData(dataStore)
};

(async () => {
  const data = await loadData();
  Object.assign(dataStore, data);
})();

const client = createWhatsAppClient(io, dataStore);

io.on('connection', socket => {
  console.log('🟢 Frontend conectado');

  socket.emit('estado', client.info?.wid ? 'autenticado' : 'desconectado');
  socket.emit('mensajes_iniciales', dataStore.mensajes);
  socket.emit('notas', dataStore.notas);
  socket.emit('etiquetas', dataStore.etiquetas);
  socket.emit('respuestas', dataStore.respuestas);

  socket.on('guardar_nota', async ({ numero, nota }) => {
    dataStore.notas[numero] = nota;
    await dataStore.save();
    io.emit('notas', dataStore.notas);
  });

  socket.on('guardar_etiqueta', async ({ numero, etiqueta }) => {
    if (!dataStore.etiquetas[numero]) dataStore.etiquetas[numero] = [];
    if (!dataStore.etiquetas[numero].includes(etiqueta)) {
      dataStore.etiquetas[numero].push(etiqueta);
      await dataStore.save();
      io.emit('etiquetas', dataStore.etiquetas);
    }
  });

  socket.on('agregar_respuesta_rapida', async ({ alias, mensaje }) => {
    dataStore.respuestas[alias] = mensaje;
    await dataStore.save();
    io.emit('respuestas', dataStore.respuestas);
  });

  socket.on('cerrar_sesion', async () => {
    await client.destroy();
    io.emit('estado', 'desconectado');
  });
});

app.get('/', (req, res) => res.send('Servidor CRM WhatsApp en ejecución'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Backend corriendo en http://localhost:${PORT}`));
