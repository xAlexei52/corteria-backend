require('dotenv').config();
const express = require('express');
const { sequelize } = require('./src/config/database');

const usuarioRoutes  = require('./src/routes/usuariosRoutes')
const entradaTrailerRoutes = require('./src/routes/entradaTrailerRoutes')
const ordenFabricacionRoutes = require('./src/routes/ordenFabricacionRoutes');
const gastoProcesamientoRoutes = require('./src/routes/gastoProcesamientoRoutes');

// Inicializar Express
const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/entradas', entradaTrailerRoutes);
app.use('/api/ordenes-fabricacion', ordenFabricacionRoutes);
app.use('/api/gastos-procesamiento', gastoProcesamientoRoutes);
// Ruta básica para probar el servidor
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API de ERP La Corteria',
    status: 'online'
  });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Probar conexión a la base de datos
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Sincronizar modelos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('Modelos sincronizados con la base de datos.');
    }
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
  }
};

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  await testDbConnection();
});