// src/services/entradaTrailerService.js
const { 
    EntradaTrailer, 
    EntradaTrailerProducto, 
    Producto, 
    Almacen,
    Usuario,
    sequelize 
  } = require('../config/database');
  
  const entradaTrailerService = {
    /**
     * Crea una nueva entrada de trailer con sus productos
     */
    async crearEntrada(datosEntrada, usuarioId) {
      const transaction = await sequelize.transaction();
  
      try {
        // Validar que el almacén exista
        const almacen = await Almacen.findByPk(datosEntrada.almacen_id);
        if (!almacen) {
          throw new Error('El almacén especificado no existe');
        }
  
        // Crear la entrada de trailer
        const entrada = await EntradaTrailer.create({
          fecha_entrada: datosEntrada.fecha_entrada || new Date(),
          numero_trailer: datosEntrada.numero_trailer,
          proveedor: datosEntrada.proveedor,
          notas: datosEntrada.notas,
          almacen_id: datosEntrada.almacen_id,
          registrado_por: usuarioId,
          estado: 'pendiente'
        }, { transaction });
  
        // Validar y crear los productos de la entrada
        if (!datosEntrada.productos || !datosEntrada.productos.length) {
          throw new Error('Debe especificar al menos un producto para la entrada');
        }
  
        // Validar que todos los productos existan
        const productosIds = datosEntrada.productos.map(p => p.producto_id);
        const productosExistentes = await Producto.findAll({
          where: { id: productosIds }
        });
  
        if (productosExistentes.length !== productosIds.length) {
          throw new Error('Uno o más productos especificados no existen');
        }
  
        // Crear los registros de productos
        await Promise.all(datosEntrada.productos.map(producto => 
          EntradaTrailerProducto.create({
            entrada_trailer_id: entrada.id,
            producto_id: producto.producto_id,
            cantidad_kilos: producto.cantidad_kilos,
            cantidad_cajas: producto.cantidad_cajas,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.precio_unitario * producto.cantidad_kilos,
            notas: producto.notas
          }, { transaction })
        ));
  
        await transaction.commit();
  
        // Retornar la entrada con sus productos
        return await this.obtenerEntradaPorId(entrada.id);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
  
    /**
     * Obtiene una entrada de trailer por su ID
     */
    async obtenerEntradaPorId(id) {
      const entrada = await EntradaTrailer.findByPk(id, {
        include: [
          {
            model: EntradaTrailerProducto,
            as: 'productos',
            include: [{
              model: Producto,
              as: 'producto',
              attributes: ['id', 'codigo', 'nombre']
            }]
          },
          {
            model: Almacen,
            as: 'almacen',
            attributes: ['id', 'nombre', 'ubicacion']
          },
          {
            model: Usuario,
            as: 'registrador',
            attributes: ['id', 'nombre', 'usuario']
          }
        ]
      });
  
      if (!entrada) {
        throw new Error('Entrada de trailer no encontrada');
      }
  
      return entrada;
    },
  
    /**
     * Obtiene lista de entradas de trailer con paginación
     */
    async listarEntradas(filtros = {}, pagina = 1, limite = 10) {
      // Asegurarnos que sean números
      const page = Number(pagina) || 1;
      const limit = Number(limite) || 10;
      const offset = (page - 1) * limit;
      const where = {};
  
      // Aplicar filtros
      if (filtros.estado) {
          where.estado = filtros.estado;
      }
      if (filtros.fecha_inicio && filtros.fecha_fin) {
          where.fecha_entrada = {
              [Op.between]: [filtros.fecha_inicio, filtros.fecha_fin]
          };
      }
      if (filtros.almacen_id) {
          where.almacen_id = filtros.almacen_id;
      }
  
      const { count, rows } = await EntradaTrailer.findAndCountAll({
          where,
          include: [
              {
                  model: Almacen,
                  as: 'almacen',
                  attributes: ['id', 'nombre']
              },
              {
                  model: Usuario,
                  as: 'registrador',
                  attributes: ['id', 'nombre']
              }
          ],
          order: [['fecha_entrada', 'DESC']],
          limit: limit,  // Asegurarnos de pasar el valor numérico
          offset: offset // Asegurarnos de pasar el valor numérico
      });
  
      return {
          total: count,
          paginas: Math.ceil(count / limit),
          pagina_actual: page,
          datos: rows
      };
  },
  
    /**
     * Actualiza el estado de una entrada de trailer
     */
    async actualizarEstado(id, estado, usuarioId) {
      const entrada = await EntradaTrailer.findByPk(id);
      if (!entrada) {
        throw new Error('Entrada de trailer no encontrada');
      }
  
      // Validar transiciones de estado válidas
      const transicionesValidas = {
        pendiente: ['procesando', 'completado'],
        procesando: ['completado'],
        completado: []
      };
  
      if (!transicionesValidas[entrada.estado].includes(estado)) {
        throw new Error(`No se puede cambiar el estado de ${entrada.estado} a ${estado}`);
      }
  
      await entrada.update({ estado });
      return await this.obtenerEntradaPorId(id);
    },
  
    /**
     * Obtiene estadísticas de entradas de trailer
     */
    async obtenerEstadisticas(filtros = {}) {
      const where = {};
      if (filtros.fecha_inicio && filtros.fecha_fin) {
        where.fecha_entrada = {
          [sequelize.Op.between]: [filtros.fecha_inicio, filtros.fecha_fin]
        };
      }
  
      const estadisticas = await EntradaTrailer.findAll({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_entradas'],
          [sequelize.fn('SUM', sequelize.col('EntradaTrailerProducto.cantidad_kilos')), 'total_kilos'],
          [sequelize.fn('SUM', sequelize.col('EntradaTrailerProducto.cantidad_cajas')), 'total_cajas'],
          'estado'
        ],
        include: [{
          model: EntradaTrailerProducto,
          as: 'productos',
          attributes: []
        }],
        group: ['estado']
      });
  
      return estadisticas;
    }
  };
  
  module.exports = entradaTrailerService;