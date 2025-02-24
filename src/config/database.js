// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Importar modelos
const UsuarioModel = require('../models/Usuario');
const ProductoModel = require('../models/Producto');
const AlmacenModel = require('../models/Almacen');
const InventarioModel = require('../models/Inventario');
const EntradaTrailerModel = require('../models/EntradaTrailer');
const EntradaTrailerProductoModel = require('../models/EntradaTrailerProducto');
const OrdenFabricacionModel = require('../models/OrdenFabricacion');
const OrdenFabricacionDetalleModel = require('../models/OrdenFabricacionDetalle');
const RecetaModel = require('../models/Recetas');
const RecetaInsumoModel = require('../models/RecetaInsumo');
const RecetaEmpaqueModel = require('../models/RecetaEmpaque');
const InsumoModel = require('../models/Insumo');
const MaterialEmpaqueModel = require('../models/MaterialEmpaque');
const GastoProcesamientoModel = require('../models/GastoProcesamiento');
const CostoBaseModel = require('../models/CostoBase');

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
  Producto: ProductoModel(sequelize),
  Almacen: AlmacenModel(sequelize),
  Inventario: InventarioModel(sequelize),
  EntradaTrailer: EntradaTrailerModel(sequelize),
  EntradaTrailerProducto: EntradaTrailerProductoModel(sequelize),
  OrdenFabricacion: OrdenFabricacionModel(sequelize),
  OrdenFabricacionDetalle: OrdenFabricacionDetalleModel(sequelize),
  Receta: RecetaModel(sequelize),
  RecetaInsumo: RecetaInsumoModel(sequelize),
  RecetaEmpaque: RecetaEmpaqueModel(sequelize),
  Insumo: InsumoModel(sequelize),
  MaterialEmpaque: MaterialEmpaqueModel(sequelize),
  GastoProcesamiento: GastoProcesamientoModel(sequelize),
  CostoBase: CostoBaseModel(sequelize)
};

// Configurar las asociaciones
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = {
  sequelize,
  ...models
};