// src/services/recetaService.js
const { 
    Receta, 
    RecetaInsumo, 
    RecetaEmpaque,
    Producto,
    Insumo,
    MaterialEmpaque,
    sequelize 
} = require('../config/database');

const recetaService = {
    /**
     * Crea una nueva receta con sus insumos y empaques
     */
    async crearReceta(data) {
        const transaction = await sequelize.transaction();

        try {
            // Crear la receta
            const receta = await Receta.create({
                producto_id: data.producto_id,
                nombre: data.nombre,
                descripcion: data.descripcion
            }, { transaction });

            // Agregar insumos
            if (data.insumos && data.insumos.length > 0) {
                await RecetaInsumo.bulkCreate(
                    data.insumos.map(insumo => ({
                        receta_id: receta.id,
                        insumo_id: insumo.insumo_id,
                        cantidad_por_kilo: insumo.cantidad_por_kilo
                    })),
                    { transaction }
                );
            }

            // Agregar empaques
            if (data.empaques && data.empaques.length > 0) {
                await RecetaEmpaque.bulkCreate(
                    data.empaques.map(empaque => ({
                        receta_id: receta.id,
                        material_id: empaque.material_id,
                        cantidad_por_unidad: empaque.cantidad_por_unidad
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            return await this.obtenerRecetaPorId(receta.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Obtiene una receta por ID con todos sus detalles
     */
    async obtenerRecetaPorId(id) {
        const receta = await Receta.findByPk(id, {
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['id', 'codigo', 'nombre']
                },
                {
                    model: RecetaInsumo,
                    as: 'insumos',
                    include: [{
                        model: Insumo,
                        as: 'insumo',
                        attributes: ['id', 'codigo', 'nombre', 'precio_unitario']
                    }]
                },
                {
                    model: RecetaEmpaque,
                    as: 'empaques',
                    include: [{
                        model: MaterialEmpaque,
                        as: 'material',
                        attributes: ['id', 'codigo', 'descripcion', 'costo_unitario']
                    }]
                }
            ]
        });

        if (!receta) {
            throw new Error('Receta no encontrada');
        }

        return receta;
    },

    /**
     * Obtiene la receta activa para un producto específico
     */
    async obtenerRecetaPorProducto(productoId) {
        const receta = await Receta.findOne({
            where: {
                producto_id: productoId,
                activo: true
            },
            include: [
                {
                    model: RecetaInsumo,
                    as: 'insumos',
                    include: ['insumo']
                },
                {
                    model: RecetaEmpaque,
                    as: 'empaques',
                    include: ['material']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (!receta) {
            throw new Error('No existe una receta activa para este producto');
        }

        return receta;
    },

    /**
     * Calcula los requerimientos de insumos y empaques para una cantidad dada
     */
    async calcularRequerimientos(recetaId, cantidadKilos) {
        const receta = await this.obtenerRecetaPorId(recetaId);
        
        const requerimientos = {
            insumos: receta.insumos.map(insumo => ({
                insumo_id: insumo.insumo_id,
                cantidad_requerida: insumo.cantidad_por_kilo * cantidadKilos,
                costo_estimado: insumo.cantidad_por_kilo * cantidadKilos * insumo.insumo.precio_unitario
            })),
            empaques: receta.empaques.map(empaque => ({
                material_id: empaque.material_id,
                cantidad_requerida: empaque.cantidad_por_unidad * Math.ceil(cantidadKilos), // Redondear hacia arriba
                costo_estimado: empaque.cantidad_por_unidad * Math.ceil(cantidadKilos) * empaque.material.costo_unitario
            }))
        };

        return requerimientos;
    }
};

module.exports = recetaService;