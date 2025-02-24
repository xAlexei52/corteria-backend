const ordenFabricacionService = require('../services/ordenFabricacionService');

const ordenFabricacionController = {
    /**
     * Crear una orden de fabricación
     * @route POST /api/ordenes-fabricacion
     */
    async crear(req, res) {
        try {
            const { entrada_trailer_id } = req.body;
            const usuarioId = req.usuario.id;

            if (!entrada_trailer_id) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de entrada de trailer es requerido'
                });
            }

            const orden = await ordenFabricacionService.crearOrden(entrada_trailer_id, usuarioId);

            res.status(201).json({
                success: true,
                message: 'Orden de fabricación creada exitosamente',
                data: orden
            });
        } catch (error) {
            console.error('Error al crear orden de fabricación:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al crear la orden de fabricación'
            });
        }
    },

    /**
     * Obtener una orden de fabricación por ID
     * @route GET /api/ordenes-fabricacion/:id
     */
    async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            const orden = await ordenFabricacionService.obtenerOrdenPorId(id);

            res.json({
                success: true,
                data: orden
            });
        } catch (error) {
            console.error('Error al obtener orden de fabricación:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al obtener la orden de fabricación'
            });
        }
    },

    /**
     * Listar órdenes de fabricación
     * @route GET /api/ordenes-fabricacion
     */
    async listar(req, res) {
        try {
            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 10;
            
            const filtros = {
                estado: req.query.estado,
                fecha_inicio: req.query.fecha_inicio,
                fecha_fin: req.query.fecha_fin,
                almacen_id: req.query.almacen_id
            };

            const resultado = await ordenFabricacionService.listarOrdenes(filtros, pagina, limite);

            res.json({
                success: true,
                ...resultado
            });
        } catch (error) {
            console.error('Error al listar órdenes de fabricación:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista de órdenes de fabricación'
            });
        }
    },

    /**
     * Actualizar estado de una orden de fabricación
     * @route PATCH /api/ordenes-fabricacion/:id/estado
     */
    async actualizarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const usuarioId = req.usuario.id;

            if (!estado) {
                return res.status(400).json({
                    success: false,
                    message: 'El estado es requerido'
                });
            }

            const orden = await ordenFabricacionService.actualizarEstado(id, estado, usuarioId);

            res.json({
                success: true,
                message: 'Estado actualizado correctamente',
                data: orden
            });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al actualizar el estado'
            });
        }
    }
};

module.exports = ordenFabricacionController;