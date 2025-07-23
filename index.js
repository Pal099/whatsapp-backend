const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { executablePath } = require('puppeteer');
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
let client;
let qrTimeout = null;
let clienteActivo = false;

function crearCliente() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  clienteActivo = true;

  client.on('qr', async (qr) => {
    console.log('⚠️ Se generó un nuevo código QR');
    currentQR = await qrcode.toDataURL(qr);
    isAuthenticated = false;
    io.emit('qr', currentQR);

    if (qrTimeout) clearTimeout(qrTimeout);
    qrTimeout = setTimeout(async () => {
      if (!isAuthenticated && clienteActivo) {
        console.log('⏱ QR expirado. Reiniciando cliente...');
        await reiniciarCliente();
      }
    }, 60000);
  });

  client.on('authenticated', () => {
    console.log('✅ Cliente autenticado');
    isAuthenticated = true;
    if (qrTimeout) clearTimeout(qrTimeout);
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
    clienteActivo = false;
    io.emit('estado', 'desconectado');
  });

  client.initialize();
}

async function reiniciarCliente() {
  try {
    if (clienteActivo && client) {
      await client.destroy();
      clienteActivo = false;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('♻️ Reiniciando cliente...');
    crearCliente();

  } catch (err) {
    console.error('❌ Error al reiniciar cliente:', err);
  }
}

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

  socket.on('cerrar_sesion', async () => {
    try {
      console.log('🔒 Cerrando sesión...');

      await client.logout();
      await client.destroy();
      clienteActivo = false;
      currentQR = null;
      isAuthenticated = false;
      io.emit('estado', 'desconectado');

      setTimeout(() => crearCliente(), 1500);
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
    }
  });
});

crearCliente();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp corriendo en http://localhost:${PORT}`);
});
