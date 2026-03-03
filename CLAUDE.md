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

## Modelos existentes
| Modelo | Descripción |
|--------|-------------|
| `TrailerEntry` | Entrada de materia prima por trailer o vía marítima |
| `TrailerEntryCost` | Costos itemizados por concepto de una entrada |
| `PurchaseInvoice` | Factura de compra del proveedor (referencia contable) |
| `ManufacturingOrder` | Orden de manufactura — consume kilos del trailer y produce output |
| `OrderExpense` | Gastos por tipo dentro de una orden de manufactura |
| `OrderSubproduct` | Subproductos de una orden de manufactura |
| `Sale` | Venta al cliente |
| `SaleDetail` | Detalle de una venta (producto, cantidad, precio) |
| `Payment` | Pago registrado contra una venta |
| `Customer` | Cliente |
| `CustomerProductPrice` | Precios diferenciados por cliente y producto |
| `CustomerDocument` | Documentos adjuntos al cliente |
| `Product` | Producto (con pricePerKilo y costPerKilo) |
| `Recipe` | Receta de producción |
| `RecipeSupply` | Insumos de una receta |
| `Supply` | Insumo/materia auxiliar |
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
**El inventario ya NO es centralizado por almacén para productos.
Cada entrada de trailer ES el inventario.**

- `TrailerEntry.availableKilos` → kilos crudos disponibles para venta directa
- `ManufacturingOrder.availableOutputKilos` → kilos procesados disponibles para venta

### Flujo de trazabilidad
```
TrailerEntry
  └─► ManufacturingOrder (consume availableKilos del trailer)
        └─► SaleDetail (consume availableOutputKilos de la orden)

TrailerEntry
  └─► SaleDetail directa (consume availableKilos del trailer, sin manufactura)
```

Los almacenes siguen existiendo para:
- Trazabilidad geográfica (ciudad)
- Referencia en órdenes de manufactura (dónde se procesó)

## Flujo de ventas
`SaleDetail` puede tener una de dos fuentes (mutuamente excluyentes):
- `trailerEntryId` → venta directa del trailer (menudo sin procesar, etc.)
- `manufacturingOrderId` → venta de producto manufacturado

Al registrar el detalle, el service decrementa el campo correspondiente de kilos disponibles.

## Tipos de procesamiento en órdenes de manufactura
ENUM `processingType`:
- `arrachera`, `cortes_finos`, `carne_seca`, `machaca`
- `menudo_con_quimico` → genera `OrderExpense` de tipo `supply` por el químico
- `menudo_sin_quimico` → orden más simple, sin costo de químico
- `otro`

## Facturas (PurchaseInvoice)
- Modelo simple de referencia contable
- Se crea automáticamente al crear un `TrailerEntry`
- Campos mínimos: `invoiceNumber`, `amountMXN`, `amountUSD`, `status` (pending/paid/partial)
- Proveedor se hereda del `TrailerEntry.supplier`
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
/api/customers                CRUD + documentos
/api/products                 CRUD
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

## Pendientes de implementar (en orden de prioridad)
Ver plan completo en: `.claude/plans/tender-zooming-metcalfe.md`

### Fase 1 — Core
- [ ] Campos nuevos en `TrailerEntry` (entryType, pedimentoNumber, purchaseInvoiceNumber, weightUnit, entryCostMXN, entryCostUSD)
- [ ] Modelo `TrailerEntryCost` + CRUD
- [ ] Modelo `PurchaseInvoice` (auto-creada con el trailer) + CRUD
- [ ] `SaleDetail.trailerEntryId` + `SaleDetail.manufacturingOrderId` + lógica de decremento
- [ ] `ManufacturingOrder.processingType` + `ManufacturingOrder.availableOutputKilos`

### Fase 2 — Financiero
- [ ] `Sale.requiresInvoice`, `invoicedAmount`, `nonInvoicedAmount`
- [ ] `Payment.isInvoiced`
- [ ] Modelo `CustomerProductPrice` + CRUD + integración en createSale

### Fase 3 — Reportes y extras
- [ ] Endpoint `GET /api/trailer-entries/:id/financial-summary`
- [ ] `Project.monthlyRevenueProjection`, `profitMarginProjection`, `netProfitProjection`
- [ ] Nuevas categorías en `CompanyExpense` ENUM
