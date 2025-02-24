// src/models/Producto.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Producto = sequelize.define('Producto', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        codigo: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        unidad_medida: {
            type: DataTypes.ENUM('kilogramo', 'caja', 'pieza', 'otro'),
            defaultValue: 'kilogramo'
        },
        precio_compra: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        precio_venta: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        stock_minimo: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        requiere_procesamiento: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        dias_caducidad: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        receta_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        receta_empaque_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        activo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'productos',
        timestamps: true,
        underscored: true
    });

    Producto.associate = (models) => {
        // Relación con la receta de insumos
        Producto.belongsTo(models.Receta, {
            foreignKey: 'receta_id',
            as: 'receta'
        });

        // Relación con la receta de empaque
        Producto.belongsTo(models.Receta, {
            foreignKey: 'receta_empaque_id',
            as: 'recetaEmpaque'
        });

        // Relación con entradas de trailer
        Producto.hasMany(models.EntradaTrailerProducto, {
            foreignKey: 'producto_id',
            as: 'entradasTrailer'
        });

        // Relación con inventario
        Producto.hasMany(models.Inventario, {
            foreignKey: 'producto_id',
            as: 'inventarios'
        });

        // Relación con órdenes de fabricación
        Producto.hasMany(models.OrdenFabricacionDetalle, {
            foreignKey: 'producto_id',
            as: 'ordenesDetalle'
        });
    };

    return Producto;
};