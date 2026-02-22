-- ============================================================================
-- MIDAS - Migración 007: Sistema de crédito / fiado
-- Descripción: Agrega soporte para ventas a crédito con comisión del 5%,
--              máximo 3 cuotas, abonos parciales y tracking de deuda.
-- ============================================================================

-- ── 1. Agregar columnas de crédito a la tabla sales ──
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_installments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS initial_payment NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_with_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Restricción: máximo 3 cuotas
ALTER TABLE sales ADD CONSTRAINT chk_credit_installments
  CHECK (credit_installments >= 0 AND credit_installments <= 3);

-- Restricción: comisión entre 0 y 100
ALTER TABLE sales ADD CONSTRAINT chk_credit_fee
  CHECK (credit_fee_percentage >= 0 AND credit_fee_percentage <= 100);

-- ── 2. Actualizar ventas existentes ──
-- Para ventas existentes que no son a crédito, total_with_fee = total
UPDATE sales SET total_with_fee = total WHERE total_with_fee = 0;

-- ── 3. Índice para consultas rápidas de ventas a crédito ──
CREATE INDEX IF NOT EXISTS idx_sales_is_credit ON sales (is_credit) WHERE is_credit = TRUE;

-- ── 4. Agregar línea de crédito a clientes ──
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- NOTAS DE USO:
--
-- Al crear una venta a crédito:
-- 1. Calcular credit_fee_amount = total * (credit_fee_percentage / 100)
-- 2. total_with_fee = total + credit_fee_amount
-- 3. Registrar initial_payment (abono inicial, puede ser 0)
-- 4. Crear registro en accounts_receivable:
--    - total_amount = total_with_fee
--    - paid_amount = initial_payment
--    - remaining_amount = total_with_fee - initial_payment
--    - status = 'pending' (o 'partial' si hay abono inicial)
-- 5. Cada abono se registra en payment_records:
--    - type = 'receivable'
--    - reference_id = accounts_receivable.id
-- 6. Cuando remaining_amount = 0, actualizar status = 'paid'
-- ============================================================================
