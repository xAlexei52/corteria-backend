// src/config/database.js (actualizado con todos los modelos)
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Importar modelos
const UsuarioModel = require('../models/Usuario');
const ProductModel = require('../models/Product');
const TrailerEntryModel = require('../models/TrailerEntry');
const WarehouseModel = require('../models/Warehouse');
const SupplyModel = require('../models/Supply');
const RecipeModel = require('../models/Recipe');
const RecipeSupplyModel = require('../models/RecipeSupply');
const FixedExpenseModel = require('../models/FixedExpense');
const InventoryModel = require('../models/Inventory');
const ManufacturingOrderModel = require('../models/ManufacturingOrder');
const OrderExpenseModel = require('../models/OrderExpense');

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

// Inicializar modelos
const models = {
  Usuario: UsuarioModel(sequelize),
  Product: ProductModel(sequelize),
  TrailerEntry: TrailerEntryModel(sequelize),
  Warehouse: WarehouseModel(sequelize),
  Supply: SupplyModel(sequelize),
  Recipe: RecipeModel(sequelize),
  RecipeSupply: RecipeSupplyModel(sequelize),
  FixedExpense: FixedExpenseModel(sequelize),
  Inventory: InventoryModel(sequelize),
  ManufacturingOrder: ManufacturingOrderModel(sequelize),
  OrderExpense: OrderExpenseModel(sequelize)
};

// Configurar las asociaciones
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = {
  sequelize,
  ...models
};