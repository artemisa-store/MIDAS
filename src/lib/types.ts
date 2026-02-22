// ===== Tipos base de la aplicación MIDAS =====

// --- Roles y permisos ---
export type UserRole = "admin" | "socio" | "contador" | "vendedor"

export type ModuleName =
  | "dashboard"
  | "ventas"
  | "facturacion"
  | "inventario"
  | "materias_primas"
  | "gastos"
  | "caja"
  | "cuentas"
  | "socios"
  | "herramientas"
  | "pautas"
  | "clientes"
  | "reportes"
  | "configuracion"
  | "wiki"

export type ModulePermissions = Record<ModuleName, boolean>

// --- Usuario ---
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  module_permissions: ModulePermissions
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// --- Productos ---
export interface Product {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  base_cost: number
  sku: string
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  color: string
  color_hex: string
  size: string
  cut: string
  stock: number
  min_stock_alert: number
  cost_per_unit: number
  sku_variant: string
  is_active: boolean
  created_at: string
  updated_at: string
  product?: Product
}

// --- Clientes ---
export interface Client {
  id: string
  full_name: string
  cedula_nit: string | null
  phone_whatsapp: string
  email: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  department: string | null
  postal_code: string | null
  birth_date: string | null
  gender: string | null
  source_channel: string | null
  source_detail: string | null
  first_contact_date: string | null
  first_purchase_date: string | null
  tags: string[]
  notes: string | null
  is_active: boolean
  credit_enabled: boolean
  credit_limit: number
  created_at: string
  updated_at: string
}

// --- Ventas ---
export type SaleStatus = "paid" | "pending" | "shipped" | "delivered" | "returned"
export type PaymentMethod = "efectivo" | "bancolombia" | "nequi" | "daviplata" | "otro"
export type SaleChannel = "whatsapp" | "instagram" | "presencial" | "web" | "referido" | "otro"
export type DiscountType = "percentage" | "fixed"

export interface Sale {
  id: string
  invoice_number: string
  client_id: string
  sale_date: string
  subtotal: number
  discount_type: DiscountType | null
  discount_value: number
  shipping_cost: number
  total: number
  payment_method: PaymentMethod
  payment_account_id: string
  sale_channel: SaleChannel
  seller_user_id: string
  status: SaleStatus
  shipping_address: string | null
  notes: string | null
  campaign_id: string | null
  // Campos de crédito/fiado
  is_credit: boolean
  credit_fee_percentage: number
  credit_fee_amount: number
  credit_installments: number
  initial_payment: number
  total_with_fee: number
  created_by: string
  created_at: string
  updated_at: string
  client?: Client
  seller?: User
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_variant_id: string
  quantity: number
  unit_price: number
  subtotal: number
  variant?: ProductVariant
}

// --- Gastos ---
export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Expense {
  id: string
  expense_date: string
  category_id: string
  concept: string
  supplier_id: string | null
  amount: number
  payment_method: PaymentMethod
  payment_account_id: string
  supplier_invoice_number: string | null
  receipt_image_url: string | null
  notes: string | null
  is_recurring: boolean
  registered_by: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  supplier?: Supplier
}

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  supplies_description: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// --- Inventario ---
export type MovementType = "entry" | "exit" | "return" | "adjustment"

export interface InventoryMovement {
  id: string
  product_variant_id: string
  movement_type: MovementType
  quantity: number
  previous_stock: number
  new_stock: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  variant?: ProductVariant
  creator?: User
}

// --- Caja y banco ---
export type AccountType = "cash" | "bank" | "digital"
export type CashMovementType = "in" | "out" | "transfer"

export interface CashBankAccount {
  id: string
  name: string
  type: AccountType
  balance: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CashBankMovement {
  id: string
  account_id: string
  movement_type: CashMovementType
  amount: number
  previous_balance: number
  new_balance: number
  concept: string
  reference_type: string | null
  reference_id: string | null
  transfer_to_account_id: string | null
  created_by: string
  created_at: string
  account?: CashBankAccount
}

// --- Cuentas por cobrar/pagar ---
export type AccountStatus = "pending" | "partial" | "paid" | "overdue"

export interface AccountReceivable {
  id: string
  client_id: string
  sale_id: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string | null
  status: AccountStatus
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client
  sale?: Sale
}

export interface AccountPayable {
  id: string
  supplier_id: string
  expense_id: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string | null
  status: AccountStatus
  notes: string | null
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface PaymentRecord {
  id: string
  type: "receivable" | "payable"
  reference_id: string
  amount: number
  payment_method: PaymentMethod
  payment_account_id: string
  payment_date: string
  notes: string | null
  registered_by: string
  created_at: string
}

// --- Socios ---
export interface Partner {
  id: string
  user_id: string
  name: string
  distribution_percentage: number
  is_active: boolean
  created_at: string
  updated_at: string
  user?: User
}

export interface PartnerWithdrawal {
  id: string
  partner_id: string
  amount: number
  method: PaymentMethod
  withdrawal_date: string
  approved_by: string
  notes: string | null
  created_at: string
  partner?: Partner
}

// --- Suscripciones ---
export type BillingCycle = "monthly" | "annual"
export type SubscriptionStatus = "active" | "paused" | "cancelled"

export interface Subscription {
  id: string
  tool_name: string
  monthly_cost: number
  currency: string
  billing_cycle: BillingCycle
  start_date: string
  next_renewal_date: string
  status: SubscriptionStatus
  category: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// --- Campañas publicitarias ---
export type CampaignStatus = "active" | "finished" | "paused"
export type CampaignObjective = "interaction" | "messages" | "traffic" | "conversions"

export interface Campaign {
  id: string
  name: string
  platform: string
  start_date: string
  end_date: string | null
  budget: number
  objective: CampaignObjective
  status: CampaignStatus
  reach: number | null
  impressions: number | null
  clicks: number | null
  messages_received: number | null
  cost_per_message: number | null
  sales_attributed: number | null
  revenue_generated: number | null
  roi: number | null
  cac: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// --- Registro de actividad ---
export interface ActivityLog {
  id: string
  user_id: string
  action_type: string
  module: ModuleName
  description: string
  reference_type: string | null
  reference_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user?: User
}

// --- Configuración ---
export interface Setting {
  id: string
  key: string
  value: unknown
  updated_by: string | null
  updated_at: string
}

// --- Materias primas ---
export type RawMaterialUnit = "unidades" | "metros" | "rollos" | "hojas" | "kilogramos" | "litros"

export interface RawMaterial {
  id: string
  name: string
  category: string
  description: string | null
  stock: number
  unit: RawMaterialUnit
  min_stock_alert: number
  cost_per_unit: number
  supplier_id: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface RawMaterialMovement {
  id: string
  raw_material_id: string
  movement_type: MovementType
  quantity: number
  previous_stock: number
  new_stock: number
  notes: string | null
  created_by: string
  created_at: string
  raw_material?: RawMaterial
  creator?: User
}

// --- Tipos expandidos (con joins de Supabase) ---
export type MovementExpanded = CashBankMovement & {
  account?: { name: string; type: AccountType }
}

export interface DashboardStats {
  ventasMes: number
  gastosMes: number
  cuentasPorCobrar: number
  unidadesVendidas: number
  dineroCaja: number
  dineroBanco: number
  liquidezTotal: number
}

export interface RecentSale {
  id: string
  invoice_number: string
  total: number
  status: string
  payment_method: string
  created_at: string
  client: { full_name: string } | null
}

export interface DailyData {
  day: string
  ventas: number
  gastos: number
}

export interface Debtor {
  id: string
  clientName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  invoiceNumber: string
}

// --- Tipos auxiliares para la UI ---
export interface NavItem {
  label: string
  href: string
  icon: string
  module: ModuleName
  section: "principal" | "secundaria" | "admin"
}

export interface StatCard {
  label: string
  value: number | string
  icon: string
  trend?: {
    value: number
    isPositive: boolean
  }
  format?: "currency" | "number" | "text"
  borderColor?: "gold" | "success" | "error" | "warning" | "info"
}

// --- Wiki ---
export type WikiCategory = "credenciales" | "notas" | "ideas" | "tareas" | "enlaces" | "identidad"
export type WikiTaskStatus = "pendiente" | "en_progreso" | "completada"
export type WikiTaskPriority = "baja" | "media" | "alta"

export interface WikiEntryMetadata {
  username?: string
  password?: string
  pin?: string
  url?: string
  status?: WikiTaskStatus
  priority?: WikiTaskPriority
  tags?: string[]
}

export interface WikiEntry {
  id: string
  category: WikiCategory
  title: string
  content: string | null
  metadata: WikiEntryMetadata
  is_pinned: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
