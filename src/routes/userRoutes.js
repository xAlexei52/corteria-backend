// src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

// Rutas públicas
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);

// Rutas protegidas para todos los usuarios autenticados
router.use(authMiddleware);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// Rutas protegidas solo para administradores
router.use(adminMiddleware);
router.get('/', userController.listUsers);
router.get('/stats', userController.getUserStats);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id/toggle-active', userController.toggleUserActive);
router.delete('/:id', userController.deleteUser);

module.exports = router;