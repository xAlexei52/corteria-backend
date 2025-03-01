// src/routes/recipeRoutes.js
const express = require('express');
const recipeController = require('../controllers/recipeController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para recetas
router.post('/', recipeController.createRecipe);
router.get('/', recipeController.listRecipes);
router.get('/:id', recipeController.getRecipeById);
router.put('/:id', recipeController.updateRecipe);

// Ruta para asignar receta a producto
router.post('/:recipeId/assign/:productId', recipeController.assignRecipeToProduct);

module.exports = router;