// server.js (actualizado con rutas de ciudades)
require('dotenv').config();
const express = require('express');
const { sequelize } = require('./src/config/database');
const cors = require('cors');
const path = require('path');

const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const trailerEntryRoutes = require('./src/routes/trailerEntryRoutes');
const supplyRoutes = require('./src/routes/supplyRoutes');
const fixedExpenseRoutes = require('./src/routes/fixedExpenseRoutes');
const recipesRoutes = require('./src/routes/recipeRoutes');
const warehouseRoutes = require('./src/routes/warehouseRoutes');
const manufacturingOrderRoutes = require('./src/routes/manufacturingOrderRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const userAdminRoutes = require('./src/routes/userAdminRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const cityRoutes = require('./src/routes/cityRoutes');
const companyExpenseRoutes = require('./src/routes/companyExpenseRoutes');


// Inicializar Express
const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/trailer-entries', trailerEntryRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/fixed-expenses', fixedExpenseRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/manufacturing-orders', manufacturingOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', userAdminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/company-expenses', companyExpenseRoutes);

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
    // En desarrollo, sincronizar modelos con la base de datos
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized');
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
};

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await testDbConnection();
});