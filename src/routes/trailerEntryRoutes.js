// src/routes/trailerEntryRoutes.js
const express = require('express');
const trailerEntryController = require('../controllers/trailerEntryController');
const trailerEntryCostController = require('../controllers/trailerEntryCostController');
const purchaseInvoiceController = require('../controllers/purchaseInvoiceController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Nueva ruta para obtener entradas con kilos disponibles
router.get('/available', trailerEntryController.getAvailableEntries);

// Rutas CRUD para entradas de trailer
router.post('/', trailerEntryController.createEntry);
router.get('/', trailerEntryController.listEntries);
router.get('/:id', trailerEntryController.getEntryById);
router.put('/:id', trailerEntryController.updateEntry);
router.delete('/:id', trailerEntryController.deleteEntry);

// Costos por concepto de la entrada
router.get('/:entryId/costs', trailerEntryCostController.listCosts);
router.post('/:entryId/costs', trailerEntryCostController.createCost);
router.put('/:entryId/costs/:id', trailerEntryCostController.updateCost);
router.delete('/:entryId/costs/:id', trailerEntryCostController.deleteCost);

// Factura de compra de la entrada
router.get('/:entryId/purchase-invoice', purchaseInvoiceController.getByEntry);
router.put('/:entryId/purchase-invoice', purchaseInvoiceController.updateByEntry);

module.exports = router;