// src/seeders/index.js
const { sequelize } = require('../config/database');
const seedCities = require('./citySeeder');
const seedAdminUser = require('./adminUserSeeder');
const seedWarehouses = require('./warehouseSeeder');

/**
 * Ejecuta todos los seeders en orden
 * Los seeders son idempotentes - se pueden ejecutar múltiples veces sin duplicar datos
 *
 * ORDEN DE EJECUCIÓN:
 * 1. Ciudades (requeridas para usuarios y almacenes)
 * 2. Usuario Administrador (acceso al sistema)
 * 3. Almacenes (infraestructura por ciudad)
 */
const runAllSeeders = async () => {
  try {
    console.log('\n🌱 ========================================');
    console.log('🌱 Starting Database Seeding Process');
    console.log('🌱 ========================================\n');

    // Verificar conexión a base de datos
    await sequelize.authenticate();
    console.log('✅ Database connection verified\n');

    // Ejecutar seeders en orden
    const results = {
      cities: null,
      adminUser: null,
      warehouses: null
    };

    // 1. Crear ciudades
    console.log('📋 Step 1/3: Cities');
    console.log('─────────────────────────────────────────');
    results.cities = await seedCities();

    // 2. Crear usuario administrador
    console.log('\n📋 Step 2/3: Admin User');
    console.log('─────────────────────────────────────────');
    results.adminUser = await seedAdminUser();

    // 3. Crear almacenes
    console.log('\n📋 Step 3/3: Warehouses');
    console.log('─────────────────────────────────────────');
    results.warehouses = await seedWarehouses();

    // Resumen final
    console.log('\n🌱 ========================================');
    console.log('🌱 Seeding Process Completed Successfully!');
    console.log('🌱 ========================================');
    console.log('\n📊 Summary:');
    console.log(`   Cities: ✅ ${results.cities.created} created, ${results.cities.skipped} skipped`);
    console.log(`   Admin User: ${results.adminUser.created ? '✅ Created' : '⏭️  Already exists'}`);
    if (results.warehouses) {
      console.log(`   Warehouses: ✅ ${results.warehouses.created} created, ${results.warehouses.skipped} skipped`);
    }
    console.log('\n✨ Your database is ready to use!\n');

    return results;
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ Seeding Process Failed');
    console.error('❌ ========================================\n');
    console.error('Error details:', error);
    throw error;
  }
};

// Si el archivo se ejecuta directamente (no como módulo)
if (require.main === module) {
  runAllSeeders()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = runAllSeeders;
