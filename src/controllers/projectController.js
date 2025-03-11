// src/controllers/projectController.js
const projectService = require('../services/projectService');

const projectController = {
  /**
   * Crea un nuevo proyecto
   * @route POST /api/projects
   */
  async createProject(req, res) {
    try {
      const { name, description, location, startDate, estimatedEndDate } = req.body;
      
      // Validación básica
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Project name is required'
        });
      }
      
      const project = await projectService.createProject({
        name,
        description,
        location,
        startDate: startDate || new Date(),
        estimatedEndDate
      }, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('Create project error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error creating project',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un proyecto por ID
   * @route GET /api/projects/:id
   */
  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      
      const project = await projectService.getProjectById(id);
      
      res.status(200).json({
        success: true,
        project
      });
    } catch (error) {
      console.error('Get project error:', error);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching project',
        error: error.message
      });
    }
  },
  
  /**
   * Lista proyectos con filtros opcionales
   * @route GET /api/projects
   */
  async listProjects(req, res) {
    try {
      const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
      
      const filters = {
        search,
        status,
        startDate,
        endDate
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await projectService.listProjects(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List projects error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing projects',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un proyecto
   * @route PUT /api/projects/:id
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { name, description, location, estimatedEndDate, endDate } = req.body;
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location;
      if (estimatedEndDate) updateData.estimatedEndDate = estimatedEndDate;
      if (endDate) updateData.endDate = endDate;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      const project = await projectService.updateProject(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      console.error('Update project error:', error);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating project',
        error: error.message
      });
    }
  },
  
  /**
   * Cambia el estado de un proyecto
   * @route PATCH /api/projects/:id/status
   */
  async updateProjectStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      const project = await projectService.updateProjectStatus(id, status);
      
      res.status(200).json({
        success: true,
        message: `Project status updated to ${status}`,
        project
      });
    } catch (error) {
      console.error('Update project status error:', error);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      if (error.message.includes('Invalid status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating project status',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene el resumen financiero de un proyecto
   * @route GET /api/projects/:id/financial-summary
   */
  async getProjectFinancialSummary(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const filters = {
        startDate,
        endDate
      };
      
      const summary = await projectService.getProjectFinancialSummary(id, filters);
      
      res.status(200).json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Get project financial summary error:', error);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching project financial summary',
        error: error.message
      });
    }
  }
};

module.exports = projectController;