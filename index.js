const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { executablePath } = require('puppeteer'); // agregá esto
const qrcode = require('qrcode');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket']
});

app.use(cors());

let currentQR = null;
let isAuthenticated = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  console.log('⚠️ Se generó un nuevo código QR');
  currentQR = await qrcode.toDataURL(qr);
  isAuthenticated = false;
  io.emit('qr', currentQR);
});

client.on('authenticated', () => {
  console.log('✅ Cliente autenticado');
  isAuthenticated = true;
  io.emit('estado', 'autenticado');
});

client.on('ready', () => {
  console.log('✅ WhatsApp está listo');
});

client.on('message', async (msg) => {
  const contacto = await msg.getContact();
  io.emit('nuevo_mensaje', {
    id: msg.id._serialized,
    nombre: contacto.pushname || contacto.name || contacto.number,
    numero: contacto.number,
    mensaje: msg.body
  });
});

client.on('disconnected', () => {
  console.log('🔌 Cliente desconectado');
  isAuthenticated = false;
  io.emit('estado', 'desconectado');
});

// Ruta para evitar "Cannot GET /"
app.get('/', (req, res) => {
  res.send('✅ Servidor WhatsApp funcionando desde Render');
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente frontend conectado');

  if (isAuthenticated) {
    socket.emit('estado', 'autenticado');
  } else if (currentQR) {
    socket.emit('qr', currentQR);
  } else {
    socket.emit('estado', 'generando');
  }
});

client.initialize();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp corriendo en http://localhost:${PORT}`);
});
