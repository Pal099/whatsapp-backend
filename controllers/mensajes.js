const { loadData, saveData } = require('../utils/storage');

let dataStore = {
  mensajes: [],
  async init() {
    const data = await loadData();
    this.mensajes = data.mensajes || [];
  },
  async agregarMensaje(mensaje) {
    this.mensajes.push(mensaje);
    await this.guardar();
  },
  async guardar() {
    const data = await loadData();
    data.mensajes = this.mensajes;
    await saveData(data);
  },
  obtenerMensajes() {
    return this.mensajes;
  },
  buscarPorNumero(numero) {
    return this.mensajes.filter(m => m.numero === numero);
  },
  eliminarMensaje(id) {
    this.mensajes = this.mensajes.filter(m => m.id !== id);
    return this.guardar();
  }
};

module.exports = dataStore;
