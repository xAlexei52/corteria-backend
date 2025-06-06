// src/controllers/warehouseController.js (actualizado)
const warehouseService = require('../services/warehouseService');

const warehouseController = {
  /**
   * Crea un nuevo almacén
   * @route POST /api/warehouses
   */
  async createWarehouse(req, res) {
    try {
      const { name, cityId, address, isMain } = req.body;
      
      // Validación básica
      if (!name || !cityId) {
        return res.status(400).json({
          success: false,
          message: 'Name and cityId are required'
        });
      }
      
      const warehouseData = {
        name,
        cityId,
        address: address || '',
        isMain: isMain || false
      };
      
      // Si se está creando como almacén principal, verificar si ya existe uno
      if (isMain) {
        try {
          // Intentar obtener el almacén principal actual
          const mainWarehouse = await warehouseService.getMainWarehouseByCity(cityId);
          
          // Si es admin, permitir cambiar el almacén principal
          if (req.user.role === 'admin') {
            // Desactivar el flag de principal en el almacén actual
            await warehouseService.updateWarehouse(mainWarehouse.id, { isMain: false });
          } else {
            return res.status(400).json({
              success: false,
              message: `This city already has a main warehouse: ${mainWarehouse.name}. Only admin can change it.`
            });
          }
        } catch (error) {
          // Si no existe un almacén principal, seguir con la creación
          if (!error.message.includes('No main warehouse found')) {
            throw error;
          }
        }
      }
      
      const warehouse = await warehouseService.createWarehouse(warehouseData);
      
      res.status(201).json({
        success: true,
        message: 'Warehouse created successfully',
        warehouse
      });
    } catch (error) {
      console.error('Create warehouse error:', error);
      
      if (error.message.includes('City not found')) {
        return res.status(404).json({
          success: false,
          message: 'City not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating warehouse',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un almacén por ID
   * @route GET /api/warehouses/:id
   */
  async getWarehouseById(req, res) {
    try {
      const { id } = req.params;
      
      const warehouse = await warehouseService.getWarehouseById(id);
      
      // Verificar permisos por ciudad (solo admin puede ver almacenes de otras ciudades)
      if (req.user.role !== 'admin' && warehouse.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view warehouses from other cities'
        });
      }
      
      res.status(200).json({
        success: true,
        warehouse
      });
    } catch (error) {
      console.error('Get warehouse error:', error);
      
      if (error.message === 'Warehouse not found') {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching warehouse',
        error: error.message
      });
    }
  },
  
  /**
   * Lista almacenes con filtros opcionales
   * @route GET /api/warehouses
   */
  async listWarehouses(req, res) {
    try {
      const { page = 1, limit = 10, search, cityId, active, isMain } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        search,
        active: active === 'true' ? true : (active === 'false' ? false : undefined),
        isMain: isMain === 'true' ? true : (isMain === 'false' ? false : undefined),
        cityId: userRole === 'admin' ? (cityId || undefined) : userCityId
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await warehouseService.listWarehouses(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List warehouses error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing warehouses',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un almacén
   * @route PUT /api/warehouses/:id
   */
  async updateWarehouse(req, res) {
    try {
      const { id } = req.params;
      const { name, address, isMain, active, cityId } = req.body;
      
      // Obtener el almacén para verificar permisos
      const warehouse = await warehouseService.getWarehouseById(id);
      
      // Verificar permisos por ciudad (solo admin puede modificar almacenes de otras ciudades)
      if (req.user.role !== 'admin' && warehouse.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update warehouses from other cities'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      
      // Solo el admin puede cambiar el estado de principal o activo o la ciudad
      if (req.user.role === 'admin') {
        if (isMain !== undefined) updateData.isMain = isMain;
        if (active !== undefined) updateData.active = active;
        if (cityId) updateData.cityId = cityId;
      }
      
      const updatedWarehouse = await warehouseService.updateWarehouse(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Warehouse updated successfully',
        warehouse: updatedWarehouse
      });
    } catch (error) {
      console.error('Update warehouse error:', error);
      
      if (error.message === 'Warehouse not found' || error.message.includes('City not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating warehouse',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un almacén (desactivación lógica)
   * @route DELETE /api/warehouses/:id
   */
  async deleteWarehouse(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener el almacén para verificar permisos
      const warehouse = await warehouseService.getWarehouseById(id);
      
      // Solo el admin puede eliminar almacenes
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can delete warehouses'
        });
      }
      
      await warehouseService.deleteWarehouse(id);
      
      res.status(200).json({
        success: true,
        message: 'Warehouse deleted successfully'
      });
    } catch (error) {
      console.error('Delete warehouse error:', error);
      
      if (error.message === 'Warehouse not found') {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }
      
      if (error.message.includes('Cannot delete warehouse with inventory')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting warehouse',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene los almacenes por ciudad
   * @route GET /api/warehouses/by-city/:cityId
   */
  async getWarehousesByCity(req, res) {
    try {
      const { cityId } = req.params;
      
      // Verificar permisos por ciudad (solo admin puede ver almacenes de otras ciudades)
      if (req.user.role !== 'admin' && cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view warehouses from other cities'
        });
      }
      
      const warehouses = await warehouseService.getWarehousesByCity(cityId);
      
      res.status(200).json({
        success: true,
        cityId,
        warehouses
      });
    } catch (error) {
      console.error('Get warehouses by city error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching warehouses by city',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene el almacén principal de una ciudad
   * @route GET /api/warehouses/main/:cityId
   */
  async getMainWarehouseByCity(req, res) {
    try {
      const { cityId } = req.params;
      
      // Verificar permisos por ciudad (solo admin puede ver almacenes de otras ciudades)
      if (req.user.role !== 'admin' && cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view warehouses from other cities'
        });
      }
      
      const warehouse = await warehouseService.getMainWarehouseByCity(cityId);
      
      res.status(200).json({
        success: true,
        cityId,
        warehouse
      });
    } catch (error) {
      console.error('Get main warehouse by city error:', error);
      
      if (error.message.includes('No main warehouse found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching main warehouse',
        error: error.message
      });
    }
  }
};

module.exports = warehouseController;