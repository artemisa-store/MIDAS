-- ============================================================================
-- MIDAS - Sistema de Gestión Integral
-- Migración 006: Nueva nomenclatura de facturas
-- Descripción: Cambia el formato de ART-0001 a CA-YYMM-NNNN
--              Ejemplo: CA-2602-0001 (Casa Artemisa, febrero 2026, factura 1)
--              El contador se reinicia automáticamente cada mes.
-- ============================================================================

-- ============================================================================
-- FUNCIÓN ACTUALIZADA: Generación de número de factura premium
-- Nuevo formato: CA-YYMM-NNNN
--   CA   = Casa Artemisa
--   YY   = Año (2 dígitos)
--   MM   = Mes (2 dígitos)
--   NNNN = Secuencial del mes (con ceros a la izquierda)
-- Cada mes reinicia el contador automáticamente usando claves
-- independientes en la tabla settings.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year_month TEXT;
    v_prefix TEXT;
    v_counter_key TEXT;
    v_counter INTEGER;
    v_new_counter INTEGER;
    v_invoice_number TEXT;
BEGIN
    -- Generar componentes del número de factura
    v_year_month := to_char(now(), 'YYMM');
    v_prefix := 'CA-' || v_year_month || '-';
    v_counter_key := 'invoice_counter_' || v_year_month;

    -- Obtener el contador del mes actual con bloqueo (FOR UPDATE)
    -- para evitar números duplicados en transacciones concurrentes
    SELECT (value ->> 'value')::INTEGER
    INTO v_counter
    FROM settings
    WHERE key = v_counter_key
    FOR UPDATE;

    -- Si no existe contador para este mes, inicializar en 0
    IF v_counter IS NULL THEN
        v_counter := 0;
    END IF;

    -- Incrementar el contador
    v_new_counter := v_counter + 1;

    -- Actualizar el contador en settings
    UPDATE settings
    SET value = jsonb_build_object('value', v_new_counter),
        updated_at = now()
    WHERE key = v_counter_key;

    -- Si no existía la fila (primer factura del mes), crearla
    IF NOT FOUND THEN
        INSERT INTO settings (key, value)
        VALUES (v_counter_key, jsonb_build_object('value', v_new_counter));
    END IF;

    -- Formatear el número de factura: CA-2602-0001
    v_invoice_number := v_prefix || LPAD(v_new_counter::TEXT, 4, '0');

    RETURN v_invoice_number;
END;
$$;

COMMENT ON FUNCTION generate_invoice_number() IS
  'Genera número de factura con formato CA-YYMM-NNNN. Ejemplo: CA-2602-0001. Contador mensual automático.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN 006
-- ============================================================================
