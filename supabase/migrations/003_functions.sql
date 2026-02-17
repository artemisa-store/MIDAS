-- ============================================================================
-- MIDAS - Sistema de Gestión Integral
-- Migración 003: Funciones, triggers y procedimientos almacenados
-- Descripción: Funciones de utilidad, triggers automáticos y lógica de negocio
-- ============================================================================

-- ============================================================================
-- FUNCIÓN: Actualización automática de updated_at
-- Se ejecuta en cada UPDATE para mantener la marca de tiempo actualizada
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Asignar la fecha/hora actual al campo updated_at automáticamente
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger que actualiza automáticamente el campo updated_at en cada UPDATE';

-- ============================================================================
-- TRIGGERS: Aplicar update_updated_at_column a todas las tablas con updated_at
-- ============================================================================

-- Tabla: users
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: products
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: product_variants
CREATE TRIGGER trg_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: clients
CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: sales
CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: expenses
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: cash_bank_accounts
CREATE TRIGGER trg_cash_bank_accounts_updated_at
    BEFORE UPDATE ON cash_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: accounts_receivable
CREATE TRIGGER trg_accounts_receivable_updated_at
    BEFORE UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: accounts_payable
CREATE TRIGGER trg_accounts_payable_updated_at
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: partners
CREATE TRIGGER trg_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: subscriptions
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: campaigns
CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: suppliers
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla: settings (usa updated_at pero no created_at estándar)
CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCIÓN: Manejo de nuevos usuarios desde auth.users
-- Se ejecuta automáticamente cuando un usuario se registra en Supabase Auth
-- Crea una fila correspondiente en public.users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insertar el nuevo usuario en la tabla pública con datos de auth
    INSERT INTO public.users (
        id,
        email,
        full_name,
        avatar_url,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        -- Usar el nombre completo de los metadatos, o el email como respaldo
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data ->> 'avatar_url',
        -- Por defecto, todos los nuevos usuarios son vendedores
        'vendedor',
        now(),
        now()
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Crea automáticamente un registro en public.users cuando se registra un nuevo usuario en auth.users';

-- Trigger que se dispara después de insertar en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCIÓN: Generación automática de números de factura
-- Lee el prefijo y contador desde la tabla settings y retorna el siguiente
-- número de factura con formato: PREFIJO + número con ceros a la izquierda
-- Ejemplo: "ART-0001", "ART-0002", etc.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_counter INTEGER;
    v_new_counter INTEGER;
    v_invoice_number TEXT;
BEGIN
    -- Obtener el prefijo de factura desde configuración
    SELECT (value ->> 'value')::TEXT
    INTO v_prefix
    FROM settings
    WHERE key = 'invoice_prefix';

    -- Si no existe el prefijo, usar valor por defecto
    IF v_prefix IS NULL THEN
        v_prefix := 'ART-';
    END IF;

    -- Obtener el contador actual y bloquearlo para evitar duplicados (FOR UPDATE)
    SELECT (value ->> 'value')::INTEGER
    INTO v_counter
    FROM settings
    WHERE key = 'invoice_counter'
    FOR UPDATE;

    -- Si no existe el contador, inicializarlo en 0
    IF v_counter IS NULL THEN
        v_counter := 0;
    END IF;

    -- Incrementar el contador
    v_new_counter := v_counter + 1;

    -- Actualizar el contador en la tabla de configuración
    UPDATE settings
    SET value = jsonb_build_object('value', v_new_counter),
        updated_at = now()
    WHERE key = 'invoice_counter';

    -- Si no existía la fila, crearla
    IF NOT FOUND THEN
        INSERT INTO settings (key, value)
        VALUES ('invoice_counter', jsonb_build_object('value', v_new_counter));
    END IF;

    -- Formatear el número de factura con 4 dígitos y ceros a la izquierda
    v_invoice_number := v_prefix || LPAD(v_new_counter::TEXT, 4, '0');

    RETURN v_invoice_number;
END;
$$;

COMMENT ON FUNCTION generate_invoice_number() IS 'Genera el siguiente número de factura secuencial con formato PREFIJO-XXXX (ej: ART-0001)';

-- ============================================================================
-- FIN DE LA MIGRACIÓN 003
-- ============================================================================
