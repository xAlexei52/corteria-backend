// src/services/gastoProcesamientoService.js
const { 
    GastoProcesamiento, 
    OrdenFabricacion,
    OrdenFabricacionDetalle,
    Producto,
    Receta,
    RecetaInsumo,
    RecetaEmpaque,
    CostoBase,
    Insumo,
    MaterialEmpaque,
    sequelize,
    Usuario
} = require('../config/database');
const { Op } = require('sequelize');

const gastoProcesamientoService = {
    /**
     * Registra automáticamente todos los gastos de una orden
     */
    async registrarGastosAutomaticos(ordenId, usuarioId) {
        const transaction = await sequelize.transaction();

        try {
            // Obtener la orden con sus detalles y productos
            const orden = await OrdenFabricacion.findByPk(ordenId, {
                include: [{
                    model: OrdenFabricacionDetalle,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        include: [
                            {
                                model: Receta,
                                as: 'receta',
                                include: [{
                                    model: RecetaInsumo,
                                    as: 'insumos',
                                    include: ['insumo']
                                }]
                            },
                            {
                                model: Receta,
                                as: 'recetaEmpaque',
                                include: [{
                                    model: RecetaEmpaque,
                                    as: 'empaques',
                                    include: ['material']
                                }]
                            }
                        ]
                    }]
                }]
            });

            if (!orden) {
                throw new Error('Orden de fabricación no encontrada');
            }

            // Para cada producto en la orden
            for (const detalle of orden.detalles) {
                const producto = detalle.producto;

                // Verificar que el producto tenga las recetas necesarias
                if (!producto.receta) {
                    throw new Error(`El producto ${producto.nombre} no tiene una receta de insumos configurada`);
                }
                if (!producto.recetaEmpaque) {
                    throw new Error(`El producto ${producto.nombre} no tiene una receta de empaque configurada`);
                }

                // Registrar gastos de insumos
                if (producto.receta.insumos) {
                    for (const recetaInsumo of producto.receta.insumos) {
                        const cantidadRequerida = recetaInsumo.cantidad_por_kilo * detalle.cantidad_kilos;
                        const total = cantidadRequerida * recetaInsumo.insumo.precio_unitario;

                        await GastoProcesamiento.create({
                            orden_fabricacion_id: ordenId,
                            tipo_gasto: 'insumo_marinado',
                            insumo_id: recetaInsumo.insumo_id,
                            material_id: null,
                            cantidad: cantidadRequerida,
                            unidad_medida: recetaInsumo.insumo.unidad_medida,
                            precio_unitario: recetaInsumo.insumo.precio_unitario,
                            total: total,
                            fecha_gasto: new Date(),
                            registrado_por: usuarioId
                        }, { transaction });
                    }
                }

                // Registrar gastos de empaque
                if (producto.recetaEmpaque.empaques) {
                    for (const recetaEmpaque of producto.recetaEmpaque.empaques) {
                        const cantidadRequerida = Math.ceil(detalle.cantidad_kilos * recetaEmpaque.cantidad_por_unidad);
                        const total = cantidadRequerida * recetaEmpaque.material.costo_unitario;

                        await GastoProcesamiento.create({
                            orden_fabricacion_id: ordenId,
                            tipo_gasto: 'material_empaque',
                            insumo_id: null,
                            material_id: recetaEmpaque.material_id,
                            cantidad: cantidadRequerida,
                            unidad_medida: recetaEmpaque.material.unidad_medida,
                            precio_unitario: recetaEmpaque.material.costo_unitario,
                            total: total,
                            fecha_gasto: new Date(),
                            registrado_por: usuarioId
                        }, { transaction });
                    }
                }

                // Registrar costos base
                const costosBase = await CostoBase.findAll({
                    where: {
                        activo: true,
                        fecha_vigencia: {
                            [Op.lte]: new Date()
                        }
                    }
                });

                for (const costo of costosBase) {
                    const total = detalle.cantidad_kilos * costo.costo_por_kilo;
                    
                    await GastoProcesamiento.create({
                        orden_fabricacion_id: ordenId,
                        tipo_gasto: costo.tipo,
                        insumo_id: null,
                        material_id: null,
                        cantidad: detalle.cantidad_kilos,
                        unidad_medida: 'KG',
                        precio_unitario: costo.costo_por_kilo,
                        costo_por_kilo: costo.costo_por_kilo,
                        total: total,
                        fecha_gasto: new Date(),
                        registrado_por: usuarioId
                    }, { transaction });
                }
            }

            await transaction.commit();
            try {
                return await this.obtenerResumenGastos(ordenId);
            } catch (error) {
                console.error('Error al obtener resumen de gastos:', error);
                throw new Error('Los gastos se registraron pero hubo un error al obtener el resumen');
            }
        } catch (error) {
            if (transaction.finished !== 'commit') {
                await transaction.rollback();
            }
            throw error;
        }
    },

    /**
     * Obtiene el resumen de gastos de una orden
     */
    async obtenerResumenGastos(ordenId) {
        try {
            // Obtener todos los gastos de la orden con sus relaciones
            const gastos = await GastoProcesamiento.findAll({
                where: { orden_fabricacion_id: ordenId },
                include: [
                    {
                        model: Insumo,
                        as: 'insumo',
                        attributes: ['codigo', 'nombre', 'precio_unitario']
                    },
                    {
                        model: MaterialEmpaque,
                        as: 'material',
                        attributes: ['codigo', 'descripcion', 'costo_unitario']
                    },
                    {
                        model: Usuario,
                        as: 'registrador',
                        attributes: ['nombre']
                    }
                ]
            });
    
            // Obtener la orden con sus detalles para calcular kilos totales
            const orden = await OrdenFabricacion.findByPk(ordenId, {
                include: [{
                    model: OrdenFabricacionDetalle,
                    as: 'detalles'
                }]
            });
    
            if (!orden) {
                throw new Error('Orden de fabricación no encontrada');
            }
    
            // Calcular kilos totales de la orden
            const totalKilos = orden.detalles.reduce(
                (sum, detalle) => sum + Number(detalle.cantidad_kilos),
                0
            );
    
            // Agrupar gastos por tipo y calcular subtotales
            const resumen = {
                insumos: {
                    items: [],
                    subtotal: 0
                },
                empaque: {
                    items: [],
                    subtotal: 0
                },
                mano_obra: {
                    items: [],
                    subtotal: 0
                },
                energeticos: {
                    items: [],
                    subtotal: 0
                },
                gastos_fijos: {
                    items: [],
                    subtotal: 0
                },
                total: 0,
                costo_por_kilo: 0,
                total_kilos: totalKilos
            };
    
            // Procesar cada gasto
            gastos.forEach(gasto => {
                const gastoData = {
                    id: gasto.id,
                    cantidad: Number(gasto.cantidad),
                    unidad_medida: gasto.unidad_medida,
                    precio_unitario: Number(gasto.precio_unitario),
                    total: Number(gasto.total),
                    fecha: gasto.fecha_gasto,
                    registrador: gasto.registrador?.nombre
                };
    
                // Añadir información específica según el tipo de gasto
                if (gasto.insumo) {
                    gastoData.codigo = gasto.insumo.codigo;
                    gastoData.nombre = gasto.insumo.nombre;
                } else if (gasto.material) {
                    gastoData.codigo = gasto.material.codigo;
                    gastoData.nombre = gasto.material.descripcion;
                }
    
                // Clasificar el gasto según su tipo
                switch (gasto.tipo_gasto) {
                    case 'insumo_marinado':
                        resumen.insumos.items.push(gastoData);
                        resumen.insumos.subtotal += Number(gasto.total);
                        break;
                    case 'material_empaque':
                        resumen.empaque.items.push(gastoData);
                        resumen.empaque.subtotal += Number(gasto.total);
                        break;
                    case 'mano_obra':
                        resumen.mano_obra.items.push(gastoData);
                        resumen.mano_obra.subtotal += Number(gasto.total);
                        break;
                    case 'energeticos':
                        resumen.energeticos.items.push(gastoData);
                        resumen.energeticos.subtotal += Number(gasto.total);
                        break;
                    case 'gastos_fijos':
                        resumen.gastos_fijos.items.push(gastoData);
                        resumen.gastos_fijos.subtotal += Number(gasto.total);
                        break;
                }
            });
    
            // Calcular total y costo por kilo
            resumen.total = Object.values(resumen)
                .filter(item => typeof item === 'object' && item.subtotal)
                .reduce((sum, item) => sum + item.subtotal, 0);
    
            if (totalKilos > 0) {
                resumen.costo_por_kilo = resumen.total / totalKilos;
            }
    
            return resumen;
        } catch (error) {
            console.error('Error al obtener resumen de gastos:', error);
            throw error;
        }
    }
};

module.exports = gastoProcesamientoService;