// src/seeders/adminUserSeeder.js
const { Usuario } = require('../config/database');

/**
 * Seeder para crear usuario administrador por defecto
 * Email: alexeipalacios12@gmail.com
 * Password: Palacios12
 *
 * IMPORTANTE: Este usuario tiene acceso completo a todas las funcionalidades del sistema
 */
const seedAdminUser = async () => {
  try {
    console.log('👤 Starting admin user seeding...');

    const adminEmail = 'alexeipalacios12@gmail.com';

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
      firstName: 'Alexei',
      lastName: 'Palacios',
      email: adminEmail,
      password: 'Palacios12', // La contraseña será hasheada automáticamente por el hook
      cityId: null, // Admin no tiene ciudad específica - puede ver todas
      role: 'admin',
      active: true
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   🔑 Password: Palacios12`);
    console.log(`   👑 Role: ${adminUser.role}`);
    console.log(`   ✓  Active: ${adminUser.active}`);
    console.log(`   🌍 Access: All cities (cityId: null)`);

    return { created: true, user: adminUser };
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  }
};

module.exports = seedAdminUser;
