// src/routes/userAdminRoutes.js
const express = require('express');
const userAdminController = require('../controllers/userAdminController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas administrativas para usuarios
router.get('/users', userAdminController.listUsers);
router.get('/users/:id', userAdminController.getUserById);
router.patch('/users/:id/toggle-active', userAdminController.toggleUserActive);
router.patch('/users/:id/permissions', userAdminController.updateUserPermissions);
router.put('/users/:id', userAdminController.updateUser);

module.exports = router;