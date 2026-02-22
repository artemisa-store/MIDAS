-- ============================================================================
-- MIDAS - Sistema de Gestión Integral
-- Migración 005: Módulo de Materias Primas
-- Descripción: Tablas, índices, RLS y datos semilla para gestión de insumos
-- ============================================================================

-- ============================================================================
-- TABLAS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. MATERIAS PRIMAS
-- Catálogo de insumos y materiales utilizados en la producción
-- Incluye cajas, etiquetas, marquillas, DTF, vinilos, bolsas, etc.
-- --------------------------------------------------------------------------
CREATE TABLE raw_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit            VARCHAR(50) NOT NULL DEFAULT 'unidades',
    min_stock_alert INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_alert >= 0),
    cost_per_unit   INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    supplier_id     UUID REFERENCES suppliers(id),
    image_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE raw_materials IS 'Catálogo de materias primas e insumos de producción';
COMMENT ON COLUMN raw_materials.category IS 'Categoría del material: cajas, etiquetas, marquillas, dtf, vinilos, bolsas, etc.';
COMMENT ON COLUMN raw_materials.unit IS 'Unidad de medida: unidades, metros, rollos, hojas, kilogramos, litros';
COMMENT ON COLUMN raw_materials.min_stock_alert IS 'Cantidad mínima antes de generar alerta de stock bajo';
COMMENT ON COLUMN raw_materials.cost_per_unit IS 'Costo por unidad en pesos colombianos (entero, sin decimales)';

-- --------------------------------------------------------------------------
-- 2. MOVIMIENTOS DE MATERIAS PRIMAS
-- Historial de entradas, salidas y ajustes de stock de insumos
-- Reutiliza el enum movement_type existente (entry, exit, return, adjustment)
-- --------------------------------------------------------------------------
CREATE TABLE raw_material_movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id   UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    movement_type     movement_type NOT NULL,
    quantity          INTEGER NOT NULL,
    previous_stock    INTEGER NOT NULL,
    new_stock         INTEGER NOT NULL,
    notes             TEXT,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE raw_material_movements IS 'Historial de movimientos de stock de materias primas para trazabilidad';
COMMENT ON COLUMN raw_material_movements.movement_type IS 'Tipo de movimiento: entry (entrada), exit (salida), return (devolución), adjustment (ajuste)';
COMMENT ON COLUMN raw_material_movements.quantity IS 'Cantidad del movimiento (positiva para entradas, negativa para salidas)';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índices para búsquedas frecuentes en materias primas
CREATE INDEX idx_raw_materials_category ON raw_materials (category);
CREATE INDEX idx_raw_materials_is_active ON raw_materials (is_active);

-- Índices para consultas de movimientos de materias primas
CREATE INDEX idx_raw_material_movements_material ON raw_material_movements (raw_material_id);
CREATE INDEX idx_raw_material_movements_created ON raw_material_movements (created_at DESC);

-- ============================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_movements ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- POLÍTICAS PARA: raw_materials
-- Admin/Socio: CRUD completo
-- Contador: Sin acceso (no gestiona insumos)
-- Vendedor: Sin acceso (no gestiona insumos)
-- --------------------------------------------------------------------------

-- Admin: acceso total a materias primas
CREATE POLICY admin_all_raw_materials ON raw_materials
    FOR ALL
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- Socio: acceso total si tiene permiso del módulo materias_primas
CREATE POLICY socio_all_raw_materials ON raw_materials
    FOR ALL
    USING (public.get_user_role() = 'socio' AND public.has_module_permission('materias_primas'))
    WITH CHECK (public.get_user_role() = 'socio' AND public.has_module_permission('materias_primas'));

-- --------------------------------------------------------------------------
-- POLÍTICAS PARA: raw_material_movements
-- Admin/Socio: CRUD completo
-- Contador: Sin acceso
-- Vendedor: Sin acceso
-- --------------------------------------------------------------------------

-- Admin: acceso total a movimientos de materias primas
CREATE POLICY admin_all_raw_material_movements ON raw_material_movements
    FOR ALL
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- Socio: acceso total si tiene permiso del módulo materias_primas
CREATE POLICY socio_all_raw_material_movements ON raw_material_movements
    FOR ALL
    USING (public.get_user_role() = 'socio' AND public.has_module_permission('materias_primas'))
    WITH CHECK (public.get_user_role() = 'socio' AND public.has_module_permission('materias_primas'));

-- ============================================================================
-- TRIGGER: Actualización automática de updated_at en raw_materials
-- Reutiliza la función update_updated_at_column() definida en 003_functions.sql
-- ============================================================================

CREATE TRIGGER trg_raw_materials_updated_at
    BEFORE UPDATE ON raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATOS SEMILLA: Materias primas comunes para una marca de streetwear
-- Todos los materiales inician con stock en 0 para que el usuario registre
-- las entradas reales al comenzar a usar el módulo
-- ============================================================================

INSERT INTO raw_materials (name, category, description, stock, unit, min_stock_alert, cost_per_unit) VALUES
    -- Cajas y empaques
    ('Caja corrugada pequeña', 'cajas', 'Caja de cartón corrugado para envíos pequeños (camisetas)', 0, 'unidades', 20, 2500),
    ('Caja corrugada mediana', 'cajas', 'Caja de cartón corrugado para envíos medianos', 0, 'unidades', 15, 3500),
    ('Caja corrugada grande', 'cajas', 'Caja de cartón corrugado para pedidos múltiples', 0, 'unidades', 10, 5000),

    -- Etiquetas
    ('Etiqueta colgante marca', 'etiquetas', 'Etiqueta colgante con logo de la marca (hang tag)', 0, 'unidades', 50, 800),
    ('Etiqueta de precio', 'etiquetas', 'Etiqueta adhesiva para indicar precio', 0, 'unidades', 100, 150),

    -- Marquillas
    ('Marquilla tejida cuello', 'marquillas', 'Marquilla tejida para costura en cuello de camiseta', 0, 'unidades', 100, 500),
    ('Marquilla tejida lateral', 'marquillas', 'Marquilla tejida para costura lateral (talla y composición)', 0, 'unidades', 100, 400),
    ('Marquilla de instrucciones de lavado', 'marquillas', 'Marquilla con instrucciones de cuidado y composición textil', 0, 'unidades', 100, 300),

    -- DTF (Direct to Film)
    ('Transfer DTF tamaño pecho', 'dtf', 'Transfer DTF listo para planchar, diseño frontal pecho', 0, 'unidades', 20, 3500),
    ('Transfer DTF tamaño espalda', 'dtf', 'Transfer DTF listo para planchar, diseño trasero completo', 0, 'unidades', 20, 5500),
    ('Transfer DTF tamaño manga', 'dtf', 'Transfer DTF listo para planchar, diseño de manga', 0, 'unidades', 20, 2000),

    -- Vinilos
    ('Vinilo textil negro', 'vinilos', 'Rollo de vinilo textil negro para corte y planchado', 0, 'metros', 5, 8000),
    ('Vinilo textil blanco', 'vinilos', 'Rollo de vinilo textil blanco para corte y planchado', 0, 'metros', 5, 8000),
    ('Vinilo textil dorado', 'vinilos', 'Rollo de vinilo textil dorado metalizado', 0, 'metros', 3, 12000),

    -- Bolsas
    ('Bolsa de polipropileno transparente', 'bolsas', 'Bolsa transparente para empaque individual de prendas', 0, 'unidades', 50, 300),
    ('Bolsa de marca personalizada', 'bolsas', 'Bolsa con logo de la marca para entrega al cliente', 0, 'unidades', 30, 1500),

    -- Papel de seda
    ('Papel de seda blanco', 'papel_seda', 'Pliego de papel de seda para envolver prendas', 0, 'hojas', 50, 200),
    ('Papel de seda negro', 'papel_seda', 'Pliego de papel de seda negro para packaging premium', 0, 'hojas', 50, 250),

    -- Stickers
    ('Sticker logo circular', 'stickers', 'Sticker adhesivo circular con logo para sellar empaques', 0, 'unidades', 100, 150),
    ('Sticker de agradecimiento', 'stickers', 'Sticker con mensaje de agradecimiento para incluir en pedidos', 0, 'unidades', 100, 200),

    -- Hilos
    ('Hilo de coser negro', 'hilos', 'Carrete de hilo de coser color negro para remates', 0, 'rollos', 3, 5000),
    ('Hilo de coser blanco', 'hilos', 'Carrete de hilo de coser color blanco para remates', 0, 'rollos', 3, 5000);

-- ============================================================================
-- FIN DE LA MIGRACIÓN 005
-- ============================================================================
