# MIDAS · Casa Artemisa

Sistema de gestión contable y de negocio para **Casa Artemisa**, marca colombiana de streetwear premium de lujo accesible.

> Todo lo que toca se convierte en oro.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Gráficas | Recharts |
| Deploy | Vercel |

## Iniciar desarrollo

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Base de datos

Los archivos SQL están en `supabase/migrations/`:

1. `001_initial_schema.sql` — Tablas, enums, índices
2. `002_rls_policies.sql` — Row Level Security
3. `003_functions.sql` — Funciones y triggers
4. `004_seed_data.sql` — Datos iniciales

Ejecutar en orden desde el SQL Editor de Supabase.

## Módulos

- Dashboard con resumen financiero
- Ventas y facturación
- Inventario y catálogo de productos
- Gastos y proveedores
- Caja y banco
- Cuentas por cobrar y pagar
- Distribución de ganancias entre socios
- Herramientas y suscripciones
- Pautas publicitarias y ROI
- CRM de clientes
- Reportes (Excel + PDF)
- Configuración y usuarios

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/     # Página de login
│   ├── (dashboard)/      # Layout con sidebar + topbar
│   │   ├── ventas/
│   │   ├── inventario/
│   │   ├── gastos/
│   │   └── ...
│   └── layout.tsx        # Layout raíz
├── components/
│   ├── ui/               # Componentes shadcn/ui
│   ├── layout/           # Sidebar, Topbar
│   ├── shared/           # Componentes reutilizables
│   └── providers/        # Auth provider
└── lib/
    ├── supabase/          # Clientes Supabase (server/client)
    ├── format.ts          # Formateo de moneda, fechas
    ├── constants.ts       # Constantes de la app
    └── types.ts           # Tipos TypeScript
```

## Diseño

- Paleta: crema (#F5F0E6), dorado (#C9A55C), negro sidebar (#0A0A0A)
- Tipografía: Playfair Display (títulos) + Inter (cuerpo)
- Componentes: shadcn/ui customizados con tema MIDAS

---

Hecho con cafe colombiano por el equipo Casa Artemisa.
