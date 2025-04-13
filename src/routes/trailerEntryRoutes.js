// src/routes/trailerEntryRoutes.js
const express = require('express');
const trailerEntryController = require('../controllers/trailerEntryController');
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

module.exports = router;