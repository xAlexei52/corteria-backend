# Database Seeders

Este directorio contiene los seeders (datos iniciales) para la base de datos del sistema.

## 📋 ¿Qué incluyen los seeders?

### 1. Usuario Administrador
- **Email:** `admin@corteria.com`
- **Password:** `Admin123!`
- **Role:** `admin`
- **Permisos:** Acceso completo a todas las ciudades y funcionalidades

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer login por seguridad.

### 2. Almacenes por Ciudad
Para cada ciudad activa en la base de datos se crean:
- **Almacén Principal:** Marcado como principal (`isMain: true`)
- **Almacén Secundario:** Almacén adicional para la ciudad

## 🚀 Cómo ejecutar los seeders

### Opción 1: Ejecutar seeders manualmente
```bash
npm run seed
```

### Opción 2: Ejecutar seeders al iniciar el servidor
```bash
npm run start:seed
```

O agregar a tu archivo `.env`:
```env
RUN_SEEDERS=true
```

Y luego iniciar normalmente:
```bash
npm start
```

### Opción 3: Ejecutar directamente con Node
```bash
node src/seeders/index.js
```

## 🔄 Idempotencia

Los seeders son **idempotentes**, lo que significa que puedes ejecutarlos múltiples veces sin problemas:

- Si el usuario admin ya existe, no se creará uno nuevo
- Si una ciudad ya tiene almacenes, se saltará esa ciudad
- No se duplicarán datos

## 📁 Estructura de archivos

```
src/seeders/
├── index.js              # Orquestador principal
├── adminUserSeeder.js    # Seeder de usuario administrador
├── warehouseSeeder.js    # Seeder de almacenes
└── README.md             # Esta documentación
```

## 🔧 Agregar nuevos seeders

Para agregar un nuevo seeder:

1. Crea un archivo en `src/seeders/` (ejemplo: `mySeeder.js`)
2. Exporta una función async que retorne información sobre la operación
3. Importa y ejecuta tu seeder en `src/seeders/index.js`

Ejemplo:

```javascript
// src/seeders/mySeeder.js
const { MyModel } = require('../config/database');

const seedMyData = async () => {
  try {
    console.log('🌱 Starting my data seeding...');

    // Tu lógica aquí
    const existing = await MyModel.findOne({ where: { /* ... */ } });
    if (existing) {
      return { created: false };
    }

    await MyModel.create({ /* ... */ });
    return { created: true };
  } catch (error) {
    console.error('❌ Error seeding my data:', error);
    throw error;
  }
};

module.exports = seedMyData;
```

## ⚠️ Notas importantes

1. **Pre-requisito:** Asegúrate de tener las ciudades creadas en la base de datos antes de ejecutar los seeders
2. **Conexión:** Los seeders requieren que la base de datos esté accesible
3. **Seguridad:** Cambia las credenciales por defecto en producción
4. **Testing:** Los seeders están diseñados para entornos de desarrollo y pruebas

## 🐛 Solución de problemas

### "No cities found in database"
- Primero debes crear las ciudades en tu base de datos
- Verifica que las ciudades tengan `active: true`

### "Database connection failed"
- Verifica tu archivo `.env` y las credenciales de la base de datos
- Asegúrate de que el servidor de base de datos esté corriendo

### "Admin user already exists"
- Esto es normal si ya ejecutaste los seeders antes
- El sistema detecta el usuario existente y no lo duplica
