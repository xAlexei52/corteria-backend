const entradaTrailerService = require('../services/entradaTrailerService');

const entradaTrailerController = {
    /**
     * Crear una nueva entrada de trailer
     * @route POST /api/entradas-trailer
     */
    async crear(req, res) {
        try {
            const usuarioId = req.usuario.id; // Asumiendo que viene del middleware de auth
            const datosEntrada = req.body;

            // Validaciones básicas
            if (!datosEntrada.numero_trailer) {
                return res.status(400).json({
                    success: false,
                    message: 'El número de trailer es requerido'
                });
            }

            if (!datosEntrada.almacen_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El almacén es requerido'
                });
            }

            if (!datosEntrada.productos || !datosEntrada.productos.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar al menos un producto'
                });
            }

            const entrada = await entradaTrailerService.crearEntrada(datosEntrada, usuarioId);

            res.status(201).json({
                success: true,
                message: 'Entrada de trailer creada exitosamente',
                data: entrada
            });
        } catch (error) {
            console.error('Error al crear entrada de trailer:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al crear la entrada de trailer'
            });
        }
    },

    /**
     * Obtener una entrada de trailer por ID
     * @route GET /api/entradas-trailer/:id
     */
    async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            const entrada = await entradaTrailerService.obtenerEntradaPorId(id);

            res.json({
                success: true,
                data: entrada
            });
        } catch (error) {
            console.error('Error al obtener entrada de trailer:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al obtener la entrada de trailer'
            });
        }
    },

    /**
     * Listar entradas de trailer con paginación y filtros
     * @route GET /api/entradas-trailer
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

            const resultado = await entradaTrailerService.listarEntradas(filtros, pagina, limite);

            res.json({
                success: true,
                ...resultado
            });
        } catch (error) {
            console.error('Error al listar entradas de trailer:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista de entradas de trailer'
            });
        }
    },

    /**
     * Actualizar el estado de una entrada de trailer
     * @route PATCH /api/entradas-trailer/:id/estado
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

            const entrada = await entradaTrailerService.actualizarEstado(id, estado, usuarioId);

            res.json({
                success: true,
                message: 'Estado actualizado correctamente',
                data: entrada
            });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al actualizar el estado'
            });
        }
    },

    /**
     * Obtener estadísticas de entradas de trailer
     * @route GET /api/entradas-trailer/estadisticas
     */
    async obtenerEstadisticas(req, res) {
        try {
            const filtros = {
                fecha_inicio: req.query.fecha_inicio,
                fecha_fin: req.query.fecha_fin
            };

            const estadisticas = await entradaTrailerService.obtenerEstadisticas(filtros);

            res.json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las estadísticas'
            });
        }
    }
};

module.exports = entradaTrailerController;