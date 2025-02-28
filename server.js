// server.js (actualizado)
require('dotenv').config();
const express = require('express');
const { sequelize } = require('./src/config/database');
const cors = require('cors');

const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const trailerEntryRoutes = require('./src/routes/trailerEntryRoutes');

// Inicializar Express
const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/trailer-entries', trailerEntryRoutes);

// Ruta básica para probar el servidor
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the ERP La Corteria API',
    status: 'online'
  });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Probar conexión a la base de datos
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sincronizar modelos con la base de datos (opcional, puede ser peligroso en producción)
    // En producción, es mejor usar migraciones en lugar de sync()
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: true });
    //   console.log('Database synchronized');
    // }
    
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
};

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await testDbConnection();
});