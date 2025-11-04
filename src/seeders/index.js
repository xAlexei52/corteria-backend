// src/seeders/index.js
const { sequelize } = require('../config/database');
const seedAdminUser = require('./adminUserSeeder');
const seedWarehouses = require('./warehouseSeeder');

/**
 * Ejecuta todos los seeders en orden
 * Los seeders son idempotentes - se pueden ejecutar múltiples veces sin duplicar datos
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
      adminUser: null,
      warehouses: null
    };

    // 1. Crear usuario administrador
    console.log('📋 Step 1/2: Admin User');
    console.log('─────────────────────────────────────────');
    results.adminUser = await seedAdminUser();

    console.log('\n📋 Step 2/2: Warehouses');
    console.log('─────────────────────────────────────────');
    results.warehouses = await seedWarehouses();

    // Resumen final
    console.log('\n🌱 ========================================');
    console.log('🌱 Seeding Process Completed Successfully!');
    console.log('🌱 ========================================');
    console.log('\n📊 Summary:');
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
