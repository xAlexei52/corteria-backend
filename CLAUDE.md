# Corteria Backend — Contexto para Claude

## Descripción del proyecto
ERP para manejo de carne. Sistema multi-ciudad con módulos de entradas de trailer, órdenes de manufactura, inventario, ventas, clientes, gastos y proyectos.

## Stack
- **Runtime:** Node.js + Express
- **ORM:** Sequelize (sin migraciones — los modelos definen el esquema con `sync`)
- **DB:** Relacional con UUIDs como PKs
- **Patrón:** MVC — `src/models/`, `src/controllers/`, `src/services/`, `src/routes/`
- **Auth:** Token-based, roles `admin` / `user`, restricción por ciudad

## Estructura de archivos clave
```
src/
├── models/          # Definición de tablas con Sequelize
├── controllers/     # Handlers HTTP (delegan a services)
├── services/        # Lógica de negocio y transacciones
├── routes/          # Definición de endpoints REST
├── middlewares/     # auth.middleware, admin.middleware
├── config/          # database.js
└── seeders/         # adminUserSeeder, citySeeder, warehouseSeeder
```

## Convenciones del proyecto
- `underscored: true` en Sequelize (snake_case en DB, camelCase en código)
- Siempre usar transacciones Sequelize para operaciones que tocan múltiples tablas
- Los controllers no tienen lógica de negocio — todo va en el service correspondiente
- Validación de permisos: admin ve todo, user solo ve su ciudad (`cityId`)
- `createdBy` en todos los modelos que lo necesiten (UUID FK a Usuario)
- Al cancelar transacciones en el catch, verificar `!transaction.finished` antes de rollback para evitar el error "Transaction cannot be rolled back because it has been finished"

## Modelos existentes
| Modelo | Descripción |
|--------|-------------|
| `TrailerEntry` | Entrada de materia prima por trailer o vía marítima. Soporta múltiples productos vía `TrailerEntryProduct` |
| `TrailerEntryProduct` | Línea de producto dentro de una entrada (productId, kilos, boxes, availableKilos) |
| `TrailerEntryCost` | Costos itemizados por concepto de una entrada |
| `PurchaseInvoice` | Factura de compra del proveedor — se crea automáticamente al crear un `TrailerEntry` |
| `ManufacturingOrder` | Orden de manufactura — consume kilos del trailer y produce output |
| `OrderExpense` | Gastos por tipo dentro de una orden de manufactura |
| `OrderSubproduct` | Subproductos de una orden de manufactura |
| `Sale` | Venta al cliente |
| `SaleDetail` | Detalle de una venta (producto, cantidad, precio, cajas, origen) |
| `Payment` | Pago registrado contra una venta |
| `Customer` | Cliente — campos: firstName, lastName, cityId (simplificado, sin email/phone/address) |
| `CustomerProductPrice` | Precios diferenciados por cliente y producto |
| `CustomerDocument` | Documentos adjuntos al cliente |
| `Product` | Producto (con pricePerKilo y costPerKilo). Soporta activar/desactivar y hard delete |
| `Recipe` | Receta de producción |
| `RecipeSupply` | Insumos de una receta |
| `Supply` | Insumo/materia auxiliar. Soporta activar/desactivar y hard delete |
| `Inventory` | Stock por almacén (aplica principalmente a insumos/supplies) |
| `Warehouse` | Almacén por ciudad |
| `CompanyExpense` | Gasto operativo de la empresa |
| `FixedExpense` | Gasto fijo recurrente |
| `Project` | Proyecto con proyección financiera |
| `ProjectExpense` | Gasto dentro de un proyecto |
| `ProjectIncome` | Ingreso dentro de un proyecto |
| `City` | Ciudad — entidad raíz del sistema multi-tenant |
| `Usuario` | Usuario del sistema |

## Arquitectura de inventario (IMPORTANTE)
**El inventario ya NO es centralizado por almacén para productos. Cada entrada de trailer ES el inventario.**

- `TrailerEntry.availableKilos` → kilos totales disponibles (para venta directa o para procesar)
- `TrailerEntry.availableBoxes` → cajas disponibles (se decrementan al vender)
- `ManufacturingOrder.availableOutputKilos` → kilos procesados disponibles para venta
- `TrailerEntryProduct.availableKilos` → kilos disponibles por línea de producto

### Comportamiento de `availableKilos` y `availableBoxes`
- En el hook `beforeCreate` de `TrailerEntry`, **siempre** se inicializa `availableKilos = kilos` y `availableBoxes = boxes`, independientemente de si `needsProcessing` es true o false.
- `needsProcessing = true` → `processingStatus = 'pending'`
- `needsProcessing = false` → `processingStatus = 'not_needed'` (pero los kilos siguen disponibles para venta directa)

### Flujo de trazabilidad
```
TrailerEntry (multi-producto via TrailerEntryProduct)
  └─► ManufacturingOrder (consume availableKilos del trailer)
        └─► SaleDetail (consume availableOutputKilos de la orden)

TrailerEntry
  └─► SaleDetail directa (consume availableKilos + availableBoxes del trailer)
```

Los almacenes siguen existiendo para trazabilidad geográfica y referencia en órdenes de manufactura.

## TrailerEntry — múltiples productos
Una entrada de trailer puede tener **uno o más productos**. El modelo `TrailerEntryProduct` almacena el detalle por línea:
- `trailerEntryId`, `productId`, `kilos`, `boxes`, `availableKilos`, `processingStatus`
- Al crear el trailer, se calculan `kilos` y `boxes` totales sumando los productos
- El campo `productId` en `TrailerEntry` se mantiene apuntando al primer producto (compatibilidad)

## Flujo de ventas
`SaleDetail` puede tener una de dos fuentes (mutuamente excluyentes):
- `trailerEntryId` → venta directa del trailer (menudo sin procesar, etc.)
- `manufacturingOrderId` → venta de producto manufacturado

Al crear el detalle:
- Se decrementa `available_kilos` del `TrailerEntry` o `available_output_kilos` del `ManufacturingOrder`
- Si hay `boxes`, también se decrementa `available_boxes` del `TrailerEntry`

### Precio en venta
- Si el detalle incluye `unitPrice > 0`, se usa ese precio (precio personalizado por venta)
- Si no, se usa `Product.pricePerKilo` como fallback

## Cancelación de ventas
Al cancelar una venta (`cancelSale`):
1. Se **eliminan todos los pagos** (no bloquea si hay pagos)
2. Se devuelven `available_kilos` y `available_boxes` al origen (`TrailerEntry` o `ManufacturingOrder`)
3. Se revierte el saldo del cliente: `balance -= paidAmount`, `totalPurchases -= totalAmount`

## Productos y Supplies — activar/desactivar/eliminar
- `PATCH /api/products/:id/status` → `{ active: true/false }` — activa o desactiva
- `DELETE /api/products/:id` → hard delete (bloquea si tiene `SaleDetail` asociados)
- `PATCH /api/supplies/:id/status` → igual
- `DELETE /api/supplies/:id` → hard delete (bloquea si tiene `RecipeSupply` asociados)

## Clientes — eliminar
- `DELETE /api/customers/:id` → solo admin; bloquea (409) si tiene ventas históricas

## Tipos de procesamiento en órdenes de manufactura
ENUM `processingType`:
- `arrachera`, `cortes_finos`, `carne_seca`, `machaca`
- `menudo_con_quimico` → genera `OrderExpense` de tipo `supply` por el químico
- `menudo_sin_quimico` → orden más simple, sin costo de químico
- `otro`

## Facturas (PurchaseInvoice)
- Se crea automáticamente al crear un `TrailerEntry`
- Campos: `invoiceNumber`, `amountMXN`, `amountUSD`, `status` (pending/paid/partial)
- `TrailerEntry.hasOne(PurchaseInvoice)`

## Precios por cliente
- Modelo `CustomerProductPrice` con unique constraint `(customerId, productId)`
- Al crear una venta, el service busca primero el precio del cliente; si no existe, usa `Product.pricePerKilo`

## Endpoints principales
```
/api/trailer-entries          CRUD + GET /:id/financial-summary
/api/trailer-entry-costs      CRUD
/api/purchase-invoices        CRUD
/api/manufacturing-orders     CRUD
/api/sales                    CRUD + pagos + romaneo
/api/customer-product-prices  CRUD
/api/customers                CRUD + documentos + DELETE (admin)
/api/products                 CRUD + PATCH /:id/status
/api/supplies                 CRUD + PATCH /:id/status
/api/inventory                consulta y transferencias
/api/warehouses               CRUD
/api/company-expenses         CRUD
/api/fixed-expenses           CRUD
/api/projects                 CRUD + summary financiero
/api/dashboard                estadísticas generales
```

## Reporte P&L por trailer
Endpoint: `GET /api/trailer-entries/:id/financial-summary`

Calcula:
- (-) `entryCostMXN` + `entryCostUSD`
- (-) suma de `TrailerEntryCosts`
- (-) `PurchaseInvoice.amountMXN` + `amountUSD`
- (-) suma de `ManufacturingOrder.totalCost` del trailer
- (+) suma de `SaleDetail.subtotal` con `trailerEntryId` directo
- (+) suma de `SaleDetail.subtotal` con `manufacturingOrderId` de ese trailer
- = Ganancia neta + margen %

## Campos de facturación
- `Sale.requiresInvoice` (BOOLEAN) — si la venta lleva factura
- `Sale.invoicedAmount` — monto facturado
- `Sale.nonInvoicedAmount` — monto sin factura
- `Payment.isInvoiced` (BOOLEAN) — si el pago fue facturado

## Categorías de CompanyExpense
`utilities`, `rent`, `salaries`, `supplies`, `maintenance`, `taxes`, `insurance`, `advertising`, `travel`, `commissions`, `storage`, `unloading`, `other`

## Proyección financiera en Project
- `monthlyRevenueProjection` DECIMAL — ingreso mensual proyectado
- `profitMarginProjection` DECIMAL(5,2) — margen proyectado en %
- `netProfitProjection` DECIMAL — ganancia neta proyectada

## Selectores de producto en el frontend
Al mostrar productos en dropdowns/selects, **nunca** mostrar precio ni costo — solo el nombre del producto.

## Implementado (completado)
- [x] Campos en `TrailerEntry`: entryType, pedimentoNumber, purchaseInvoiceNumber, weightUnit, entryCostMXN, entryCostUSD
- [x] `TrailerEntry` multi-producto via `TrailerEntryProduct`
- [x] `TrailerEntry.availableBoxes` — se decrementa al vender, se restaura al cancelar
- [x] Modelo `TrailerEntryCost` + CRUD
- [x] Modelo `PurchaseInvoice` (auto-creada con el trailer) + CRUD
- [x] `SaleDetail.trailerEntryId` + `SaleDetail.manufacturingOrderId` + lógica de decremento
- [x] `ManufacturingOrder.processingType` + `ManufacturingOrder.availableOutputKilos`
- [x] Precio personalizado por detalle de venta (`unitPrice` en SaleDetail, fallback a `pricePerKilo`)
- [x] Eliminación de clientes con guard (no borrar si tiene ventas)
- [x] Activar/desactivar/eliminar productos y supplies
- [x] Cancelación de ventas: elimina pagos, devuelve kilos+cajas, revierte balance del cliente
- [x] Formulario de cliente simplificado: solo nombre, apellido, ciudad
- [x] `Sale.requiresInvoice`, `invoicedAmount`, `nonInvoicedAmount`
- [x] `Payment.isInvoiced`
- [x] Modelo `CustomerProductPrice` + CRUD + integración en createSale

## Pendientes
- [ ] Endpoint `GET /api/trailer-entries/:id/financial-summary` (lógica completa)
- [ ] `Project.monthlyRevenueProjection`, `profitMarginProjection`, `netProfitProjection`
- [ ] Vista de detalle de trailer entry: mostrar tabla de productos (`entryProducts`)
