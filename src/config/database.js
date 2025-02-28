// src/config/database.js (actualizado)
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Importar modelos
const UsuarioModel = require('../models/Usuario');
const ProductModel = require('../models/Product');
const TrailerEntryModel = require('../models/TrailerEntry');

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
};

// Configurar las asociaciones
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = {
  sequelize,
  ...models
};