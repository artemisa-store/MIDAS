-- ============================================================================
-- MIDAS - Sistema de Gestión Integral
-- Migración 004: Datos semilla (seed data)
-- Descripción: Datos iniciales necesarios para el funcionamiento del sistema
-- ============================================================================

-- ============================================================================
-- CATEGORÍAS DE GASTOS
-- Categorías predeterminadas para clasificar los gastos del negocio
-- ============================================================================

INSERT INTO expense_categories (id, name, icon, color, is_default, is_active, sort_order) VALUES
    (gen_random_uuid(), 'Producción',                'factory',       '#8B5CF6', TRUE, TRUE, 1),
    (gen_random_uuid(), 'Packaging',                  'package',       '#F59E0B', TRUE, TRUE, 2),
    (gen_random_uuid(), 'Herramientas y suscripciones', 'wrench',      '#3B82F6', TRUE, TRUE, 3),
    (gen_random_uuid(), 'Pautas publicitarias',       'megaphone',     '#EF4444', TRUE, TRUE, 4),
    (gen_random_uuid(), 'Envíos y logística',         'truck',         '#10B981', TRUE, TRUE, 5),
    (gen_random_uuid(), 'Operación',                  'settings',      '#6366F1', TRUE, TRUE, 6),
    (gen_random_uuid(), 'Otros',                      'more-horizontal','#9CA3AF', TRUE, TRUE, 7);

-- ============================================================================
-- CUENTAS DE CAJA Y BANCOS
-- Cuentas financieras iniciales del negocio con saldo en cero
-- ============================================================================

INSERT INTO cash_bank_accounts (id, name, type, balance, is_active) VALUES
    (gen_random_uuid(), 'Efectivo',    'cash',    0, TRUE),
    (gen_random_uuid(), 'Bancolombia', 'bank',    0, TRUE),
    (gen_random_uuid(), 'Nequi',       'digital', 0, TRUE),
    (gen_random_uuid(), 'Daviplata',   'digital', 0, TRUE);

-- ============================================================================
-- PRODUCTOS Y VARIANTES
-- Catálogo inicial de camisetas con todas sus combinaciones de color/talla/corte
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Producto 1: Camiseta Oversized 320gr
-- Colores: Arena, Gris Rata, Blanco
-- Tallas: S, M, L, XL
-- Total de variantes: 3 colores x 4 tallas = 12 variantes
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_oversized_id UUID := gen_random_uuid();
    v_boxy_id UUID := gen_random_uuid();
    v_colors TEXT[] := ARRAY['Arena', 'Gris Rata', 'Blanco'];
    v_color_hexes TEXT[] := ARRAY['#C2B280', '#8E8E82', '#FFFFFF'];
    v_oversized_sizes TEXT[] := ARRAY['S', 'M', 'L', 'XL'];
    v_boxy_sizes TEXT[] := ARRAY['S', 'L'];
    v_color TEXT;
    v_color_hex TEXT;
    v_size TEXT;
    i INTEGER;
BEGIN
    -- Crear Producto 1: Camiseta Oversized 320gr
    INSERT INTO products (id, name, description, category, base_price, base_cost, sku, is_active)
    VALUES (
        v_oversized_id,
        'Camiseta Oversized 320gr',
        'Camiseta oversize de algodón premium 320 gramos. Corte holgado y moderno.',
        'Camisetas',
        179000,
        133981,
        'CAM-OVER-320',
        TRUE
    );

    -- Crear Producto 2: Camiseta Boxy Fit 320gr
    INSERT INTO products (id, name, description, category, base_price, base_cost, sku, is_active)
    VALUES (
        v_boxy_id,
        'Camiseta Boxy Fit 320gr',
        'Camiseta boxy fit de algodón premium 320 gramos. Corte cuadrado y estructurado.',
        'Camisetas',
        179000,
        133981,
        'CAM-BOXY-320',
        TRUE
    );

    -- -----------------------------------------------------------------------
    -- Variantes de Camiseta Oversized (3 colores x 4 tallas = 12 variantes)
    -- -----------------------------------------------------------------------
    FOR i IN 1..array_length(v_colors, 1) LOOP
        v_color := v_colors[i];
        v_color_hex := v_color_hexes[i];

        FOREACH v_size IN ARRAY v_oversized_sizes LOOP
            INSERT INTO product_variants (
                id, product_id, color, color_hex, size, cut,
                stock, min_stock_alert, cost_per_unit, sku_variant, is_active
            )
            VALUES (
                gen_random_uuid(),
                v_oversized_id,
                v_color,
                v_color_hex,
                v_size,
                'Oversized',
                0,    -- Stock inicial en cero
                5,    -- Alerta cuando quedan 5 unidades
                133981,
                -- SKU de variante: CAM-OVER-320-COLOR-TALLA
                'CAM-OVER-320-' || UPPER(REPLACE(v_color, ' ', '')) || '-' || v_size,
                TRUE
            );
        END LOOP;
    END LOOP;

    -- -----------------------------------------------------------------------
    -- Variantes de Camiseta Boxy Fit (3 colores x 2 tallas = 6 variantes)
    -- -----------------------------------------------------------------------
    FOR i IN 1..array_length(v_colors, 1) LOOP
        v_color := v_colors[i];
        v_color_hex := v_color_hexes[i];

        FOREACH v_size IN ARRAY v_boxy_sizes LOOP
            INSERT INTO product_variants (
                id, product_id, color, color_hex, size, cut,
                stock, min_stock_alert, cost_per_unit, sku_variant, is_active
            )
            VALUES (
                gen_random_uuid(),
                v_boxy_id,
                v_color,
                v_color_hex,
                v_size,
                'Boxy Fit',
                0,    -- Stock inicial en cero
                5,    -- Alerta cuando quedan 5 unidades
                133981,
                -- SKU de variante: CAM-BOXY-320-COLOR-TALLA
                'CAM-BOXY-320-' || UPPER(REPLACE(v_color, ' ', '')) || '-' || v_size,
                TRUE
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- CONFIGURACIÓN DEL SISTEMA
-- Valores iniciales de configuración global
-- ============================================================================

INSERT INTO settings (id, key, value) VALUES
    -- Prefijo para números de factura
    (gen_random_uuid(), 'invoice_prefix',        '{"value": "ART-"}'),
    -- Contador secuencial de facturas (inicia en 0, se incrementa automáticamente)
    (gen_random_uuid(), 'invoice_counter',        '{"value": 0}'),
    -- Nombre de la empresa
    (gen_random_uuid(), 'company_name',           '{"value": "Casa Artemisa"}'),
    -- NIT de la empresa (vacío hasta que se registre)
    (gen_random_uuid(), 'company_nit',            '{"value": ""}'),
    -- Ancho del rollo de impresora térmica
    (gen_random_uuid(), 'thermal_printer_width',  '{"value": "80mm"}');

-- ============================================================================
-- SUSCRIPCIONES
-- Herramientas y servicios digitales con pagos recurrentes
-- ============================================================================

INSERT INTO subscriptions (id, tool_name, monthly_cost, currency, billing_cycle, start_date, next_renewal_date, status, category, notes) VALUES
    (
        gen_random_uuid(),
        'Midjourney',
        72000,
        'COP',
        'monthly',
        '2025-01-01',
        '2026-03-01',
        'active',
        'Diseño',
        'Plan Standard para generación de imágenes con IA'
    ),
    (
        gen_random_uuid(),
        'Claude Pro',
        80000,
        'COP',
        'monthly',
        '2025-01-01',
        '2026-03-01',
        'active',
        'Inteligencia Artificial',
        'Asistente de IA para redacción, análisis y automatización'
    ),
    (
        gen_random_uuid(),
        'Canva Pro',
        55000,
        'COP',
        'monthly',
        '2025-01-01',
        '2026-03-01',
        'active',
        'Diseño',
        'Herramienta de diseño gráfico para redes sociales y marketing'
    ),
    (
        gen_random_uuid(),
        'Adobe Creative Cloud',
        120000,
        'COP',
        'monthly',
        '2025-01-01',
        '2026-03-01',
        'active',
        'Diseño',
        'Suite de diseño profesional (Photoshop, Illustrator, etc.)'
    ),
    (
        gen_random_uuid(),
        'Hosting Web',
        45000,
        'COP',
        'monthly',
        '2025-01-01',
        '2026-03-01',
        'active',
        'Infraestructura',
        'Hosting para el sitio web de Casa Artemisa'
    );

-- ============================================================================
-- FIN DE LA MIGRACIÓN 004
-- ============================================================================
