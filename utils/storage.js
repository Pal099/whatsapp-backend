const fs = require('fs-extra');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'crm.json');

async function loadData() {
  try {
    await fs.ensureFile(DB_PATH);
    const content = await fs.readFile(DB_PATH, 'utf8');
    return content ? JSON.parse(content) : { mensajes: [] };
  } catch {
    return { mensajes: [] };
  }
}

async function saveData(data) {
  await fs.writeJSON(DB_PATH, data, { spaces: 2 });
}

module.exports = { loadData, saveData };
