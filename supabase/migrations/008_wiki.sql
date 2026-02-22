-- ============================================================================
-- MIDAS - Sistema de Gestión Integral
-- Migración 008: Módulo Wiki
-- Descripción: Base de conocimiento interna con notas, credenciales, ideas,
--              tareas, enlaces e identidad de marca
-- ============================================================================

-- ============================================================================
-- TABLAS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. ENTRADAS DEL WIKI
-- Base de conocimiento flexible con categorías y metadata JSONB
-- Categorías: credenciales, notas, ideas, tareas, enlaces, identidad
-- --------------------------------------------------------------------------
CREATE TABLE wiki_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(50) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    content         TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE wiki_entries IS 'Base de conocimiento interna de Casa Artemisa';
COMMENT ON COLUMN wiki_entries.category IS 'Categoría: credenciales, notas, ideas, tareas, enlaces, identidad';
COMMENT ON COLUMN wiki_entries.metadata IS 'Datos flexibles según categoría: { url, username, password, pin, status, priority, tags }';
COMMENT ON COLUMN wiki_entries.is_pinned IS 'Entradas fijadas aparecen primero en la lista';
COMMENT ON COLUMN wiki_entries.is_archived IS 'Entradas archivadas se ocultan del listado principal';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX idx_wiki_entries_category ON wiki_entries (category);
CREATE INDEX idx_wiki_entries_is_pinned ON wiki_entries (is_pinned DESC);
CREATE INDEX idx_wiki_entries_is_archived ON wiki_entries (is_archived);
CREATE INDEX idx_wiki_entries_created_at ON wiki_entries (created_at DESC);

-- ============================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================================

ALTER TABLE wiki_entries ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- POLÍTICAS PARA: wiki_entries
-- Admin: CRUD completo
-- Socio: CRUD completo si tiene permiso del módulo wiki
-- Contador: Sin acceso (información confidencial)
-- Vendedor: Sin acceso (información confidencial)
-- --------------------------------------------------------------------------

-- Admin: acceso total
CREATE POLICY admin_all_wiki_entries ON wiki_entries
    FOR ALL
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- Socio: acceso total si tiene permiso del módulo wiki
CREATE POLICY socio_all_wiki_entries ON wiki_entries
    FOR ALL
    USING (public.get_user_role() = 'socio' AND public.has_module_permission('wiki'))
    WITH CHECK (public.get_user_role() = 'socio' AND public.has_module_permission('wiki'));

-- ============================================================================
-- TRIGGER: Actualización automática de updated_at
-- Reutiliza la función update_updated_at_column() definida en 003_functions.sql
-- ============================================================================

CREATE TRIGGER trg_wiki_entries_updated_at
    BEFORE UPDATE ON wiki_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DE LA MIGRACIÓN 008
-- ============================================================================
