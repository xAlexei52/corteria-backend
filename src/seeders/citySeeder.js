// src/seeders/citySeeder.js
const { City } = require('../config/database');

/**
 * Seeder para crear las ciudades donde opera La Corteria
 * Las ciudades son fundamentales para la organización de almacenes, usuarios y operaciones
 */
const seedCities = async () => {
  try {
    console.log('🏙️  Starting city seeding...');

    // Definir las ciudades a crear
    const citiesToCreate = [
      { name: 'Ciudad de Mexico', code: 'CDMX' },
      { name: 'Guadalajara', code: 'GDL' },
      { name: 'Los Cabos', code: 'BCS' },
      { name: 'La Paz', code: 'LAP' },
      // Agrega más ciudades según sea necesario
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const cityData of citiesToCreate) {
      // Verificar si la ciudad ya existe
      const existingCity = await City.findOne({
        where: { code: cityData.code }
      });

      if (existingCity) {
        console.log(`   ⏭️  City already exists: ${cityData.name} (${cityData.code})`);
        skippedCount++;
        continue;
      }

      // Crear la ciudad
      const city = await City.create({
        name: cityData.name,
        code: cityData.code,
        active: true
      });

      console.log(`   ✅ Created city: ${city.name} (${city.code})`);
      createdCount++;
    }

    console.log(`\n✅ City seeding completed!`);
    console.log(`   Created: ${createdCount} cities`);
    console.log(`   Skipped: ${skippedCount} cities (already existed)`);

    return { created: createdCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Error seeding cities:', error);
    throw error;
  }
};

module.exports = seedCities;
