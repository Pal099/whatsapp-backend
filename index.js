const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Permitir CORS para cualquier origen (puedes restringir en producción)
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  console.log('⚠️ Se generó un nuevo código QR');
  const qrCodeDataURL = await qrcode.toDataURL(qr);
  io.emit('qr', qrCodeDataURL);
  io.emit('estado', 'esperando');
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp listo');
  io.emit('estado', 'autenticado');
});

client.on('disconnected', () => {
  console.log('❌ Cliente desconectado');
  io.emit('estado', 'desconectado');
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente frontend conectado');

  socket.on('cerrar_sesion', async () => {
    await client.logout();
    io.emit('estado', 'desconectado');
  });
});

// Inicializar cliente de WhatsApp
client.initialize();

server.listen(3001, () => {
  console.log('🚀 Servidor WhatsApp corriendo en http://localhost:3001');
});
