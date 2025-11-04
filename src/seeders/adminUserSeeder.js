// src/seeders/adminUserSeeder.js
const { Usuario } = require('../config/database');

/**
 * Seeder para crear usuario administrador por defecto
 * Email: admin@corteria.com
 * Password: Admin123!
 *
 * IMPORTANTE: Cambiar la contraseña después del primer login
 */
const seedAdminUser = async () => {
  try {
    console.log('👤 Starting admin user seeding...');

    const adminEmail = 'admin@corteria.com';

    // Verificar si ya existe un usuario admin
    const existingAdmin = await Usuario.findOne({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log(`   ⏭️  Admin user already exists: ${adminEmail}`);
      console.log(`   Role: ${existingAdmin.role}, Active: ${existingAdmin.active}`);
      return { created: false, user: existingAdmin };
    }

    // Crear usuario administrador
    const adminUser = await Usuario.create({
      firstName: 'Admin',
      lastName: 'Sistema',
      email: adminEmail,
      password: 'Admin123!', // La contraseña será hasheada automáticamente por el hook
      cityId: null, // Admin no tiene ciudad específica - puede ver todas
      role: 'admin',
      active: true
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   🔑 Password: Admin123!`);
    console.log(`   👑 Role: ${adminUser.role}`);
    console.log(`   ✓  Active: ${adminUser.active}`);
    console.log(`\n   ⚠️  IMPORTANTE: Cambiar la contraseña después del primer login`);

    return { created: true, user: adminUser };
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  }
};

module.exports = seedAdminUser;
