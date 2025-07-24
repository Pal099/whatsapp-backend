const { Client, LocalAuth } = require('whatsapp-web.js');
const { executablePath } = require('puppeteer');
const qrcode = require('qrcode');

function createWhatsAppClient(io, dataStore) {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', async qr => {
    const qrImage = await qrcode.toDataURL(qr);
    io.emit('qr', qrImage);
  });

  client.on('authenticated', () => {
    io.emit('estado', 'autenticado');
  });

  client.on('disconnected', () => {
    io.emit('estado', 'desconectado');
  });

  client.on('message', async msg => {
    const contacto = await msg.getContact();
    const mensaje = {
      id: msg.id._serialized,
      nombre: contacto.pushname || contacto.name || contacto.number,
      numero: contacto.number,
      mensaje: msg.body,
      timestamp: Date.now()
    };

    dataStore.mensajes.push(mensaje);
    await dataStore.save();

    io.emit('nuevo_mensaje', mensaje);
  });

  client.initialize();
  return client;
}

module.exports = createWhatsAppClient;
