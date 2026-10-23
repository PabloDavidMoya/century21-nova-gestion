-- Century 21 Nova · esquema de base de datos (PostgreSQL / Render)
-- Los numeros de desempeño (GCI, lados, captaciones) NO se guardan como
-- columnas sueltas: se calculan al vuelo a partir de "cierres", asi nunca
-- quedan desincronizados. Lo que se guarda directo es lo que no se deriva
-- de ningun otro dato: identidad, metas, desafios, calendario.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

-- OJO: esto borra todo y arranca de cero. Sirve mientras estamos en
-- prototipo (datos de prueba, se recargan con "npm run seed"). Antes de que
-- haya datos reales cargados a mano en el panel, cambiar esto por
-- migraciones incrementales (ALTER TABLE) que no pierdan información.
DROP TABLE IF EXISTS proformas, reservas, facturas_proveedores, mensualidades, calendario_eventos, desafios, cierres, usuarios, asesores CASCADE;

CREATE TABLE asesores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  ingreso_fecha DATE,                  -- para calcular antigüedad
  meta_anual    NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles: broker/gerente/administracion son "staff" (hoy con el mismo nivel
-- de acceso; separados por si mañana hay que diferenciar permisos). asesor
-- es el resto del equipo, atado a su propia fila en "asesores".
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT,                   -- para broker/gerente/administracion (el asesor usa asesores.nombre)
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('broker', 'gerente', 'administracion', 'asesor')),
  asesor_id     UUID REFERENCES asesores(id) ON DELETE CASCADE, -- solo si rol = asesor
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger de cierres: cada fila es una transacción real (equivalente a las
-- hojas "Datos"/"Octubre" de la planilla). El GCI, lados y captaciones de
-- cada asesor salen de sumar/contar filas de acá.
CREATE TABLE cierres (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_cobro       DATE NOT NULL,
  tipo_inmueble     TEXT,
  tipo_transaccion  TEXT CHECK (tipo_transaccion IN ('ALQUILER', 'VENTA')),
  gross_usd         NUMERIC(12,2) NOT NULL,
  lados_tipo        TEXT CHECK (lados_tipo IN ('Ambas puntas', 'Captación', 'Colocación', 'Capta/Coloca')),
  captador_id       UUID REFERENCES asesores(id),
  colocador_id      UUID REFERENCES asesores(id),
  direccion         TEXT,
  observaciones     TEXT,
  estado            TEXT NOT NULL DEFAULT 'Confirmado' CHECK (estado IN ('Pendiente', 'Confirmado', 'Rechazado')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cierres_fecha ON cierres (fecha_cobro);
CREATE INDEX idx_cierres_captador ON cierres (captador_id);
CREATE INDEX idx_cierres_colocador ON cierres (colocador_id);

CREATE TABLE desafios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  tipo          TEXT,
  asignado_a    UUID REFERENCES asesores(id), -- null = Todos
  meta          NUMERIC(10,2) NOT NULL,
  progreso      NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad        TEXT,
  vence         DATE,
  estado        TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Cumplido')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calendario_eventos (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha   DATE NOT NULL,
  hora    TIME,
  tipo    TEXT CHECK (tipo IN ('reunion', 'cumple', 'capacitacion', 'evento')),
  titulo  TEXT NOT NULL
);

CREATE TABLE mensualidades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id  UUID NOT NULL REFERENCES asesores(id) ON DELETE CASCADE,
  anio       INT NOT NULL,
  mes        INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  monto      NUMERIC(10,2) NOT NULL DEFAULT 200,
  pagado     BOOLEAN NOT NULL DEFAULT false,
  fecha_pago DATE,
  UNIQUE (asesor_id, anio, mes)
);

-- Boletas / facturas de proveedores — carga manual de Administración.
-- Equivalente a las planillas "FC" (flujo de caja) de la oficina.
CREATE TABLE facturas_proveedores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               DATE NOT NULL,
  proveedor           TEXT NOT NULL,
  categoria           TEXT,
  concepto            TEXT,
  monto_usd           NUMERIC(12,2) NOT NULL,
  moneda_original     TEXT NOT NULL DEFAULT 'USD',
  monto_original      NUMERIC(12,2),
  numero_comprobante  TEXT,
  estado              TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada')),
  fecha_pago          DATE,
  cargado_por         UUID REFERENCES usuarios(id),
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facturas_fecha ON facturas_proveedores (fecha);

-- Reservas activas (operaciones en curso, antes de convertirse en cierre).
-- Equivalente a la hoja "RESERVAS" de la planilla semanal.
CREATE TABLE reservas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha              DATE NOT NULL,
  asesor_id          UUID REFERENCES asesores(id),
  asesor_nombre      TEXT,
  ciudad             TEXT,
  tipo_transaccion   TEXT CHECK (tipo_transaccion IN ('Venta', 'Alquiler')),
  forma_pago         TEXT,
  oficina_captadora  TEXT,
  precio_usd         NUMERIC(14,2),
  moneda_original    TEXT NOT NULL DEFAULT 'USD',
  precio_original    NUMERIC(14,2),
  sena_usd           NUMERIC(14,2),
  comision_usd       NUMERIC(14,2),
  estado             TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Cerrada', 'Caida')),
  observaciones      TEXT,
  cargado_por        UUID REFERENCES usuarios(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservas_fecha ON reservas (fecha);

-- Proforma para cierre: el formulario interno que arma Administración con
-- todos los datos de la operación (propietario, comprador/inquilino,
-- precio y comisión) antes o al momento de cerrar. Queda como documento
-- imprimible/compartible y como registro histórico; no se inserta solo
-- en "cierres" (eso lo sigue haciendo Administración a mano en Cargar cierre).
CREATE TABLE proformas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id            UUID REFERENCES asesores(id),
  asesor_nombre        TEXT,
  tipo_inmueble        TEXT,
  direccion            TEXT,
  barrio               TEXT,
  ciudad               TEXT,
  lado                 TEXT CHECK (lado IN ('Ambas puntas', 'Captación', 'Colocación', 'Capta/Coloca')),
  propietario_nombre   TEXT,
  propietario_telefono TEXT,
  propietario_fuente   TEXT,
  comprador_nombre     TEXT,
  comprador_telefono   TEXT,
  comprador_fuente     TEXT,
  tipo_transaccion     TEXT CHECK (tipo_transaccion IN ('Venta', 'Alquiler')),
  fecha_cierre         DATE,
  precio_cierre_usd    NUMERIC(14,2),
  comision_monto_usd   NUMERIC(14,2),
  comision_agente_usd  NUMERIC(14,2),
  comision_oficina_usd NUMERIC(14,2),
  estado               TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Cerrada')),
  observaciones        TEXT,
  cargado_por          UUID REFERENCES usuarios(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proformas_fecha ON proformas (fecha_cierre);
