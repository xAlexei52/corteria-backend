// src/routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para productos
router.post('/', productController.createProduct);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;