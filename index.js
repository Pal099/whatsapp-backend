const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js'); // ← esta sola vez
const qrcode = require('qrcode');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors());
let currentQR = null;
let isAuthenticated = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', async (qr) => {
  currentQR = await qrcode.toDataURL(qr);
  isAuthenticated = false;
  io.emit('qr', currentQR);
});

client.on('authenticated', () => {
  isAuthenticated = true;
  io.emit('estado', 'autenticado');
});

client.on('ready', () => {
  console.log('WhatsApp está listo!');
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
  isAuthenticated = false;
  io.emit('estado', 'desconectado');
});

io.on('connection', (socket) => {
  console.log('Cliente frontend conectado');

  if (isAuthenticated) {
    socket.emit('estado', 'autenticado');
  } else if (currentQR) {
    socket.emit('qr', currentQR);
  } else {
    socket.emit('estado', 'generando');
  }
});

client.initialize();
server.listen(3001, () => {
  console.log('Servidor WhatsApp corriendo en http://localhost:3001');
});
