import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Registra un movimiento de caja/banco y actualiza el balance de la cuenta.
 *
 * Se usa desde ventas, gastos, abonos CxC y abonos CxP para mantener
 * sincronizados los balances de las cuentas financieras.
 */
export async function registerCashMovement(
  supabase: SupabaseClient,
  params: {
    accountId: string
    type: "in" | "out"
    amount: number
    concept: string
    referenceType?: string
    referenceId?: string
    createdBy?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { accountId, type, amount, concept, referenceType, referenceId, createdBy } = params

  if (!accountId || amount <= 0) {
    return { success: false, error: "accountId y amount > 0 requeridos" }
  }

  // 1. Leer balance actual
  const { data: account, error: readErr } = await supabase
    .from("cash_bank_accounts")
    .select("balance")
    .eq("id", accountId)
    .single()

  if (readErr || !account) {
    console.error("registerCashMovement: error leyendo cuenta", readErr)
    return { success: false, error: readErr?.message || "Cuenta no encontrada" }
  }

  const previousBalance = account.balance
  const newBalance = type === "in"
    ? previousBalance + amount
    : previousBalance - amount

  // 2. Insertar movimiento
  const { error: movErr } = await supabase.from("cash_bank_movements").insert({
    account_id: accountId,
    movement_type: type,
    amount,
    previous_balance: previousBalance,
    new_balance: newBalance,
    concept,
    reference_type: referenceType || null,
    reference_id: referenceId || null,
    created_by: createdBy || null,
  })

  if (movErr) {
    console.error("registerCashMovement: error insertando movimiento", movErr)
    return { success: false, error: movErr.message }
  }

  // 3. Actualizar balance de la cuenta
  const { error: updErr } = await supabase
    .from("cash_bank_accounts")
    .update({ balance: newBalance })
    .eq("id", accountId)

  if (updErr) {
    console.error("registerCashMovement: error actualizando balance", updErr)
    return { success: false, error: updErr.message }
  }

  return { success: true }
}

/**
 * Busca el ID de la cuenta financiera que corresponde al método de pago.
 * Mapea: efectivo→Efectivo, bancolombia→Bancolombia, nequi→Nequi, daviplata→Daviplata.
 * Si no encuentra match, devuelve la primera cuenta activa.
 */
export async function findAccountForMethod(
  supabase: SupabaseClient,
  paymentMethod: string
): Promise<string | null> {
  const methodToName: Record<string, string> = {
    efectivo: "Efectivo",
    bancolombia: "Bancolombia",
    nequi: "Nequi",
    daviplata: "Daviplata",
  }

  const accountName = methodToName[paymentMethod]

  if (accountName) {
    const { data } = await supabase
      .from("cash_bank_accounts")
      .select("id")
      .ilike("name", accountName)
      .eq("is_active", true)
      .limit(1)
      .single()

    if (data) return data.id
  }

  // Fallback: primera cuenta activa
  const { data: fallback } = await supabase
    .from("cash_bank_accounts")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single()

  return fallback?.id || null
}

/**
 * Sincroniza movimientos históricos: recorre ventas, gastos y payment_records
 * que aún NO tienen movimiento de caja y los crea retroactivamente.
 * Recalcula los balances de todas las cuentas al final.
 *
 * Solo se ejecuta una vez (botón manual) para migrar datos existentes.
 */
export async function syncHistoricalMovements(
  supabase: SupabaseClient,
  userId?: string
): Promise<{ created: number; errors: string[] }> {
  let created = 0
  const errors: string[] = []

  // Cargar todas las cuentas para mapear por nombre
  const { data: allAccounts } = await supabase
    .from("cash_bank_accounts")
    .select("id, name, type")
    .eq("is_active", true)

  if (!allAccounts || allAccounts.length === 0) {
    return { created: 0, errors: ["No se encontraron cuentas activas"] }
  }

  const nameToId: Record<string, string> = {}
  for (const acc of allAccounts) {
    nameToId[acc.name.toLowerCase()] = acc.id
  }

  const methodToName: Record<string, string> = {
    efectivo: "efectivo",
    bancolombia: "bancolombia",
    nequi: "nequi",
    daviplata: "daviplata",
  }

  function resolveAccountId(method: string, accountId: string | null): string | null {
    // Si ya tiene un accountId válido, usarlo
    if (accountId && allAccounts!.some((a) => a.id === accountId)) return accountId
    // Sino, mapear por método de pago
    const name = methodToName[method]
    if (name && nameToId[name]) return nameToId[name]
    // Fallback: primera cuenta
    return allAccounts![0].id
  }

  // Cargar movimientos existentes para evitar duplicados
  const { data: existingMovements } = await supabase
    .from("cash_bank_movements")
    .select("reference_type, reference_id")

  const existingSet = new Set(
    (existingMovements || [])
      .filter((m) => m.reference_type && m.reference_id)
      .map((m) => `${m.reference_type}:${m.reference_id}`)
  )

  function alreadyExists(refType: string, refId: string): boolean {
    return existingSet.has(`${refType}:${refId}`)
  }

  // ═══════════════════════════════════════════════════════════
  // 1. Ventas pagadas (no crédito) → INGRESO por el total
  // ═══════════════════════════════════════════════════════════
  const { data: paidSales } = await supabase
    .from("sales")
    .select("id, total, payment_method, payment_account_id, invoice_number, is_credit, sale_date, created_by")
    .or("is_credit.is.null,is_credit.eq.false")
    .eq("status", "paid")

  for (const sale of paidSales || []) {
    if (alreadyExists("sale", sale.id)) continue

    const accId = resolveAccountId(sale.payment_method, sale.payment_account_id)
    if (!accId) continue

    const { error } = await supabase.from("cash_bank_movements").insert({
      account_id: accId,
      movement_type: "in",
      amount: sale.total,
      previous_balance: 0,
      new_balance: 0,
      concept: `Venta ${sale.invoice_number}`,
      reference_type: "sale",
      reference_id: sale.id,
      created_by: sale.created_by || userId || null,
    })

    if (error) {
      errors.push(`Venta ${sale.invoice_number}: ${error.message}`)
    } else {
      created++
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Payment records (tipo receivable) → INGRESO (abonos CxC)
  // ═══════════════════════════════════════════════════════════
  const { data: receivablePayments } = await supabase
    .from("payment_records")
    .select("id, amount, payment_method, payment_account_id, notes, registered_by, payment_date")
    .eq("type", "receivable")

  for (const pr of receivablePayments || []) {
    if (alreadyExists("payment_record", pr.id)) continue

    const accId = resolveAccountId(pr.payment_method, pr.payment_account_id)
    if (!accId) continue

    const { error } = await supabase.from("cash_bank_movements").insert({
      account_id: accId,
      movement_type: "in",
      amount: pr.amount,
      previous_balance: 0,
      new_balance: 0,
      concept: pr.notes || "Abono CxC",
      reference_type: "payment_record",
      reference_id: pr.id,
      created_by: pr.registered_by || userId || null,
    })

    if (error) {
      errors.push(`Abono CxC ${pr.id}: ${error.message}`)
    } else {
      created++
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Gastos sin cuenta por pagar → EGRESO
  // ═══════════════════════════════════════════════════════════
  const { data: allExpenses } = await supabase
    .from("expenses")
    .select("id, amount, payment_method, payment_account_id, concept, registered_by")

  // Obtener IDs de gastos que tienen AP (esos NO se descuentan directo)
  const { data: apExpenses } = await supabase
    .from("accounts_payable")
    .select("expense_id")

  const expensesWithAP = new Set((apExpenses || []).map((a) => a.expense_id).filter(Boolean))

  for (const exp of allExpenses || []) {
    if (expensesWithAP.has(exp.id)) continue
    if (alreadyExists("expense", exp.id)) continue

    const accId = resolveAccountId(exp.payment_method, exp.payment_account_id)
    if (!accId) continue

    const { error } = await supabase.from("cash_bank_movements").insert({
      account_id: accId,
      movement_type: "out",
      amount: exp.amount,
      previous_balance: 0,
      new_balance: 0,
      concept: `Gasto: ${exp.concept}`,
      reference_type: "expense",
      reference_id: exp.id,
      created_by: exp.registered_by || userId || null,
    })

    if (error) {
      errors.push(`Gasto ${exp.concept}: ${error.message}`)
    } else {
      created++
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Payment records (tipo payable) → EGRESO (abonos CxP)
  // ═══════════════════════════════════════════════════════════
  const { data: payablePayments } = await supabase
    .from("payment_records")
    .select("id, amount, payment_method, payment_account_id, notes, registered_by")
    .eq("type", "payable")

  for (const pr of payablePayments || []) {
    if (alreadyExists("payment_record", pr.id)) continue

    const accId = resolveAccountId(pr.payment_method, pr.payment_account_id)
    if (!accId) continue

    const { error } = await supabase.from("cash_bank_movements").insert({
      account_id: accId,
      movement_type: "out",
      amount: pr.amount,
      previous_balance: 0,
      new_balance: 0,
      concept: pr.notes || "Pago CxP",
      reference_type: "payment_record",
      reference_id: pr.id,
      created_by: pr.registered_by || userId || null,
    })

    if (error) {
      errors.push(`Pago CxP ${pr.id}: ${error.message}`)
    } else {
      created++
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 5. Recalcular balances de todas las cuentas
  // ═══════════════════════════════════════════════════════════
  for (const acc of allAccounts) {
    // Sumar ingresos
    const { data: inData } = await supabase
      .from("cash_bank_movements")
      .select("amount")
      .eq("account_id", acc.id)
      .eq("movement_type", "in")

    const totalIn = (inData || []).reduce((s, m) => s + m.amount, 0)

    // Sumar egresos
    const { data: outData } = await supabase
      .from("cash_bank_movements")
      .select("amount")
      .eq("account_id", acc.id)
      .eq("movement_type", "out")

    const totalOut = (outData || []).reduce((s, m) => s + m.amount, 0)

    const finalBalance = totalIn - totalOut

    await supabase
      .from("cash_bank_accounts")
      .update({ balance: finalBalance })
      .eq("id", acc.id)
  }

  return { created, errors }
}
