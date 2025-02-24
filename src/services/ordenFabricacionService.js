// src/services/ordenFabricacionService.js
const { 
    OrdenFabricacion, 
    OrdenFabricacionDetalle,
    EntradaTrailer,
    EntradaTrailerProducto,
    Producto,
    Usuario,
    Almacen,
    Inventario,
    sequelize
} = require('../config/database');
const gastoProcesamientoService = require('./gastoProcesamientoService');
const { Op } = require('sequelize'); 

const ordenFabricacionService = {
    /**
     * Genera un número de orden único
     */
    async generarNumeroOrden() {
        const fecha = new Date().toISOString().slice(2,10).replace(/-/g, '');
        const ultimaOrden = await OrdenFabricacion.findOne({
            where: {
                numero_orden: {
                    [Op.like]: `OF${fecha}%`
                }
            },
            order: [['numero_orden', 'DESC']]
        });

        let numero = 1;
        if (ultimaOrden) {
            const ultimoNumero = parseInt(ultimaOrden.numero_orden.slice(-3));
            numero = ultimoNumero + 1;
        }

        return `OF${fecha}${numero.toString().padStart(3, '0')}`;
    },

    /**
     * Crea una orden de fabricación a partir de una entrada de trailer
     */
    async crearOrden(entradaTrailerId, usuarioId) {
        const transaction = await sequelize.transaction();

        try {
            // Verificar que la entrada existe y está en estado correcto
            const entrada = await EntradaTrailer.findByPk(entradaTrailerId, {
                include: [{
                    model: EntradaTrailerProducto,
                    as: 'productos',
                    include: ['producto']
                }]
            });

            if (!entrada) {
                throw new Error('Entrada de trailer no encontrada');
            }

            if (entrada.estado === 'procesando' || entrada.estado === 'completado') {
                throw new Error('Esta entrada ya está siendo procesada o ya fue completada');
            }

            // Generar número de orden
            const numeroOrden = await this.generarNumeroOrden();

            // Crear la orden de fabricación
            const orden = await OrdenFabricacion.create({
                numero_orden: numeroOrden,
                entrada_trailer_id: entradaTrailerId,
                almacen_id: entrada.almacen_id,
                creado_por: usuarioId,
                estado: 'pendiente'
            }, { transaction });

            // Crear los detalles de la orden basados en los productos de la entrada
            await Promise.all(entrada.productos.map(producto => 
                OrdenFabricacionDetalle.create({
                    orden_fabricacion_id: orden.id,
                    producto_id: producto.producto_id,
                    cantidad_kilos: producto.cantidad_kilos,
                    cantidad_cajas: producto.cantidad_cajas,
                    estado: 'pendiente'
                }, { transaction })
            ));

            // Actualizar estado de la entrada a 'procesando'
            await entrada.update({ 
                estado: 'procesando' 
            }, { transaction });

            await transaction.commit();

            // Retornar la orden creada con todos sus detalles
            return await this.obtenerOrdenPorId(orden.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Obtiene una orden de fabricación por ID
     */
    async obtenerOrdenPorId(id) {
        const orden = await OrdenFabricacion.findByPk(id, {
            include: [
                {
                    model: OrdenFabricacionDetalle,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'codigo', 'nombre']
                    }]
                },
                {
                    model: EntradaTrailer,
                    as: 'entradaTrailer'
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'usuario']
                },
                {
                    model: Almacen,
                    as: 'almacen',
                    attributes: ['id', 'nombre']
                }
            ]
        });

        if (!orden) {
            throw new Error('Orden de fabricación no encontrada');
        }

        return orden;
    },

    /**
     * Lista órdenes de fabricación con filtros y paginación
     */
    async listarOrdenes(filtros = {}, pagina = 1, limite = 10) {
        // Asegurarnos que sean números
        const page = Number(pagina) || 1;
        const limit = Number(limite) || 10;
        const offset = (page - 1) * limit;
        const where = {};
    
        // Aplicar filtros
        if (filtros.estado) {
            where.estado = filtros.estado;
        }
        if (filtros.fecha_inicio && filtros.fecha_fin) {
            where.fecha_creacion = {
                [Op.between]: [filtros.fecha_inicio, filtros.fecha_fin]
            };
        }
        if (filtros.almacen_id) {
            where.almacen_id = filtros.almacen_id;
        }
    
        const { count, rows } = await OrdenFabricacion.findAndCountAll({
            where,
            include: [
                {
                    model: Almacen,
                    as: 'almacen',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['fecha_creacion', 'DESC']],
            limit: limit,  // Asegurarnos de pasar el valor numérico
            offset: offset // Asegurarnos de pasar el valor numérico
        });
    
        return {
            total: count,
            paginas: Math.ceil(count / limit),
            pagina_actual: page,
            datos: rows
        };
    },

    /**
     * Actualiza el estado de una orden
     */
    // En ordenFabricacionService.js

async actualizarEstado(id, nuevoEstado, usuarioId) {
    const transaction = await sequelize.transaction();

    try {
        const orden = await OrdenFabricacion.findByPk(id, {
            include: [{
                model: OrdenFabricacionDetalle,
                as: 'detalles',
                include: ['producto']
            }],
            transaction
        });

        if (!orden) {
            throw new Error('Orden de fabricación no encontrada');
        }

        // Validar transiciones de estado válidas
        const transicionesValidas = {
            pendiente: ['en_proceso', 'cancelado'],
            en_proceso: ['finalizado', 'cancelado'],
            finalizado: [],
            cancelado: []
        };

        if (!transicionesValidas[orden.estado].includes(nuevoEstado)) {
            throw new Error(`No se puede cambiar el estado de ${orden.estado} a ${nuevoEstado}`);
        }

        // Actualizar estado de la orden
        await orden.update({
            estado: nuevoEstado,
            ...(nuevoEstado === 'en_proceso' ? { fecha_inicio_proceso: new Date() } : {}),
            ...(nuevoEstado === 'finalizado' ? { fecha_fin_proceso: new Date() } : {})
        }, { transaction });

        // Si se finaliza la orden
        if (nuevoEstado === 'finalizado') {
            // 1. Actualizar el inventario con el producto terminado
            for (const detalle of orden.detalles) {
                // Generar código de lote basado en la fecha y orden
                const codigoLote = `LOT${orden.numero_orden}`;
                
                // Calcular fecha de caducidad basada en los días de caducidad del producto
                const fechaCaducidad = detalle.producto.dias_caducidad ? 
                    new Date(Date.now() + (detalle.producto.dias_caducidad * 24 * 60 * 60 * 1000)) : 
                    null;

                // Buscar si ya existe un registro en inventario para este producto/almacén/lote
                let inventario = await Inventario.findOne({
                    where: {
                        producto_id: detalle.producto_id,
                        almacen_id: orden.almacen_id,
                        codigo_lote: codigoLote
                    },
                    transaction
                });

                if (inventario) {
                    // Actualizar inventario existente
                    await inventario.update({
                        cantidad_kilos: sequelize.literal(`cantidad_kilos + ${detalle.cantidad_kilos}`),
                        cantidad_cajas: sequelize.literal(`cantidad_cajas + ${detalle.cantidad_cajas}`)
                    }, { transaction });
                } else {
                    // Crear nuevo registro de inventario
                    await Inventario.create({
                        producto_id: detalle.producto_id,
                        almacen_id: orden.almacen_id,
                        cantidad_kilos: detalle.cantidad_kilos,
                        cantidad_cajas: detalle.cantidad_cajas,
                        codigo_lote: codigoLote,
                        fecha_caducidad: fechaCaducidad,
                        ubicacion_almacen: 'Pendiente asignar' // Esto podría venir como parámetro
                    }, { transaction });
                }
            }

            // 2. Actualizar el estado de la entrada de trailer
            await EntradaTrailer.update(
                { estado: 'completado' },
                { 
                    where: { id: orden.entrada_trailer_id },
                    transaction 
                }
            );
        }

        await transaction.commit();
        return await this.obtenerOrdenPorId(id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
};

module.exports = ordenFabricacionService;