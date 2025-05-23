// src/config/database.js (actualizado con modelo City)
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
const OrderSubproductModel = require('../models/OrderSubproduct');
const CustomerModel = require('../models/Customer');
const CustomerDocumentModel = require('../models/CustomerDocument');
const SaleModel = require('../models/Sale');
const SaleDetailModel = require('../models/SaleDetail');
const PaymentModel = require('../models/Payment');
const ProjectModel = require('../models/Project');
const ProjectExpenseModel = require('../models/ProjectExpense');
const ProjectIncomeModel = require('../models/ProjectIncome');
const CityModel = require('../models/City');
const CompanyExpenseModel = require('../models/CompanyExpense');

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
  City: CityModel(sequelize), // Inicializar modelo Ciudad primero (para asociaciones)
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
  OrderExpense: OrderExpenseModel(sequelize),
  OrderSubproduct: OrderSubproductModel(sequelize),
  Customer: CustomerModel(sequelize),
  CustomerDocument: CustomerDocumentModel(sequelize),
  Sale: SaleModel(sequelize),
  SaleDetail: SaleDetailModel(sequelize),
  Payment: PaymentModel(sequelize),
  Project: ProjectModel(sequelize),
  ProjectExpense: ProjectExpenseModel(sequelize),
  ProjectIncome: ProjectIncomeModel(sequelize),
  CompanyExpense: CompanyExpenseModel(sequelize),
};

// Configurar las asociaciones
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = {
  sequelize,
  ...models
};