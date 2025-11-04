// src/seeders/warehouseSeeder.js
const { City, Warehouse } = require('../config/database');

/**
 * Seeder para crear almacenes por defecto para cada ciudad
 * Crea un almacén principal y uno secundario por ciudad
 */
const seedWarehouses = async () => {
  try {
    console.log('🏭 Starting warehouse seeding...');

    // Obtener todas las ciudades activas
    const cities = await City.findAll({
      where: { active: true }
    });

    if (cities.length === 0) {
      console.log('⚠️  No cities found in database. Please seed cities first.');
      return;
    }

    console.log(`📍 Found ${cities.length} cities`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const city of cities) {
      // Verificar si ya existen almacenes para esta ciudad
      const existingWarehouses = await Warehouse.findAll({
        where: { cityId: city.id }
      });

      if (existingWarehouses.length > 0) {
        console.log(`   ⏭️  Skipping ${city.name} - already has ${existingWarehouses.length} warehouse(s)`);
        skippedCount++;
        continue;
      }

      // Crear almacén principal
      const mainWarehouse = await Warehouse.create({
        name: `Almacén Principal ${city.name}`,
        cityId: city.id,
        address: `Dirección principal - ${city.name}`,
        isMain: true,
        active: true
      });

      // Crear almacén secundario
      const secondaryWarehouse = await Warehouse.create({
        name: `Almacén Secundario ${city.name}`,
        cityId: city.id,
        address: `Dirección secundaria - ${city.name}`,
        isMain: false,
        active: true
      });

      console.log(`   ✅ Created 2 warehouses for ${city.name}`);
      console.log(`      - ${mainWarehouse.name} (Main)`);
      console.log(`      - ${secondaryWarehouse.name}`);
      createdCount += 2;
    }

    console.log(`\n✅ Warehouse seeding completed!`);
    console.log(`   Created: ${createdCount} warehouses`);
    console.log(`   Skipped: ${skippedCount} cities (already had warehouses)`);

    return { created: createdCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Error seeding warehouses:', error);
    throw error;
  }
};

module.exports = seedWarehouses;
