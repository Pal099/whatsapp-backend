# Usa una imagen oficial de Node.js como base
FROM node:18

# Crea el directorio de trabajo
WORKDIR /app

# Copia los archivos de tu proyecto al contenedor
COPY . .

# Instala las dependencias
RUN npm install

# Expone el puerto donde corre tu app
EXPOSE 3001

# Comando para iniciar la app
CMD ["npm", "start"]
