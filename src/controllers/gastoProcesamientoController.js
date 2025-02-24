// src/controllers/gastoProcesamientoController.js
const gastoProcesamientoService = require('../services/gastoProcesamientoService');

const gastoProcesamientoController = {
    /**
     * Registra automáticamente todos los gastos de una orden
     * @route POST /api/gastos-procesamiento/registrar-automatico
     */
    async registrarGastosAutomaticos(req, res) {
        try {
            const { orden_fabricacion_id } = req.body;
            const usuarioId = req.usuario.id;

            if (!orden_fabricacion_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID de la orden de fabricación es requerido'
                });
            }

            const resultado = await gastoProcesamientoService.registrarGastosAutomaticos(
                orden_fabricacion_id,
                usuarioId
            );

            res.status(201).json({
                success: true,
                message: 'Gastos registrados exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al registrar gastos:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al registrar los gastos'
            });
        }
    },

    /**
     * Obtiene el resumen de gastos de una orden
     * @route GET /api/gastos-procesamiento/:ordenId/resumen
     */
    async obtenerResumenGastos(req, res) {
        try {
            const { ordenId } = req.params;

            if (!ordenId) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID de la orden es requerido'
                });
            }

            const resumen = await gastoProcesamientoService.obtenerResumenGastos(ordenId);

            res.json({
                success: true,
                data: resumen
            });
        } catch (error) {
            console.error('Error al obtener resumen de gastos:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error al obtener el resumen de gastos'
            });
        }
    }
};

module.exports = gastoProcesamientoController;