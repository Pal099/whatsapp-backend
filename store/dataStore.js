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
    await saveData({ mensajes: this.mensajes });
  },

  obtenerMensajes() {
    return this.mensajes;
  },

  async actualizarMensaje(id, cambios) {
    this.mensajes = this.mensajes.map(m =>
      m.id === id ? { ...m, ...cambios } : m
    );
    await this.guardar();
  }
};

module.exports = dataStore;
