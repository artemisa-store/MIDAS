import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { formatDateShort } from "@/lib/format"
import { SALE_CHANNELS, PAYMENT_METHODS, SALE_STATUS_CONFIG } from "@/lib/constants"
import type { SaleStatus } from "@/lib/types"

// Brand Kit
const B = {
  gold: "C9A55C", black: "0A0A0A", cream: "F5F0E6", creamDark: "EDE8DA",
  white: "FFFFFF", grayLight: "F8F8F8", grayMid: "999999", grayText: "555555",
  success: "22C55E", warning: "F59E0B", error: "EF4444", info: "3B82F6",
}
const COP_FMT = "$ #,##0"

function fillRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, color: string) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
  }
}

function addBrandHeader(ws: ExcelJS.Worksheet, lastCol: number, sheetTitle: string, period: string): number {
  let row = 1
  // Black header
  fillRow(ws, row, 1, lastCol, B.black)
  ws.getRow(row).height = 28

  // Dividir el header en 3 secciones sin solapamiento
  const titleStart = Math.min(5, lastCol - 2)
  const periodStart = Math.max(titleStart + 2, lastCol - 3)

  ws.mergeCells(row, 2, row, titleStart - 1)
  const brand = ws.getCell(row, 2)
  brand.value = "CASA ARTEMISA"
  brand.font = { name: "Georgia", size: 13, bold: true, color: { argb: B.gold } }
  brand.alignment = { vertical: "middle" }

  if (periodStart > titleStart) {
    ws.mergeCells(row, titleStart, row, periodStart - 1)
    const title = ws.getCell(row, titleStart)
    title.value = sheetTitle
    title.font = { name: "Calibri", size: 10, color: { argb: B.grayMid } }
    title.alignment = { vertical: "middle" }
  }

  if (periodStart < lastCol) {
    ws.mergeCells(row, periodStart, row, lastCol - 1)
    const dateC = ws.getCell(row, periodStart)
    dateC.value = period
    dateC.font = { name: "Calibri", size: 9, color: { argb: B.gold } }
    dateC.alignment = { vertical: "middle", horizontal: "right" }
  }

  row++
  // Gold line
  fillRow(ws, row, 1, lastCol, B.gold)
  ws.getRow(row).height = 2.5
  row++
  return row
}

function addKpiRow(ws: ExcelJS.Worksheet, row: number, lastCol: number, kpis: { label: string; value: string }[]): number {
  fillRow(ws, row, 1, lastCol, B.cream)
  ws.getRow(row).height = 32
  const colsPerKpi = Math.floor((lastCol - 2) / kpis.length)
  kpis.forEach((kpi, i) => {
    const startCol = 2 + i * colsPerKpi
    const endCol = Math.min(startCol + colsPerKpi - 1, lastCol - 1)
    if (startCol < endCol) ws.mergeCells(row, startCol, row, endCol)
    const cell = ws.getCell(row, startCol)
    cell.value = { richText: [
      { text: `${kpi.label}  `, font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
      { text: kpi.value, font: { name: "Georgia", size: 11, bold: true, color: { argb: B.black } } },
    ]}
    cell.alignment = { vertical: "middle" }
    if (i > 0) {
      ws.getCell(row, startCol).border = { left: { style: "thin", color: { argb: B.creamDark } } }
    }
  })
  return row + 1
}

function addTableHeader(ws: ExcelJS.Worksheet, row: number, headers: string[], alignRight: number[] = []): number {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: B.white } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: B.black } }
    cell.alignment = { vertical: "middle", horizontal: alignRight.includes(i) ? "right" : "left" }
  })
  ws.getRow(row).height = 22
  return row + 1
}

function addFooter(ws: ExcelJS.Worksheet, row: number, lastCol: number) {
  row++
  fillRow(ws, row, 1, lastCol, B.gold)
  ws.getRow(row).height = 2
  row++

  // Dividir footer en 2 mitades sin solapamiento
  const mid = Math.ceil(lastCol / 2)
  const leftEnd = Math.min(mid, lastCol - 1)
  const rightStart = leftEnd + 1

  ws.mergeCells(row, 2, row, leftEnd)
  const fL = ws.getCell(row, 2)
  fL.value = "Casa Artemisa · Colombian Streetwear · MIDAS"
  fL.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }

  if (rightStart < lastCol) {
    ws.mergeCells(row, rightStart, row, lastCol - 1)
    const fR = ws.getCell(row, rightStart)
    fR.value = `Generado ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })} · Confidencial`
    fR.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }
    fR.alignment = { horizontal: "right" }
  }
}

function wsConfig(): Partial<ExcelJS.AddWorksheetOptions> {
  return {
    properties: { defaultColWidth: 14 },
    pageSetup: {
      paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    views: [{ showGridLines: false }],
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReportExcelData {
  period: string
  kpis: {
    ventasBrutas: number
    costoVentas: number
    gananciaBruta: number
    gastosOperativos: number
    gananciaNeta: number
    margenNeto: number
    totalCxC: number
    totalCxP: number
    valorInventario: number
    valorMateriasPrimas: number
  }
  sales: any[]
  expenses: any[]
  receivables: any[]
  payables: any[]
  variants: any[]
  rawMaterials: any[]
}

export async function exportReportExcel(data: ReportExcelData): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "MIDAS — Casa Artemisa"
  wb.created = new Date()

  const cop = (n: number) => `$${n.toLocaleString("es-CO")}`

  // ═══ HOJA 1: RESUMEN ═══
  {
    const lastCol = 10
    const ws = wb.addWorksheet("Resumen", wsConfig())
    ws.columns = [
      { width: 2 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 2 },
    ]
    let row = addBrandHeader(ws, lastCol, "Resumen Financiero", data.period)
    row = addKpiRow(ws, row, lastCol, [
      { label: "Ventas brutas", value: cop(data.kpis.ventasBrutas) },
      { label: "Ganancia bruta", value: cop(data.kpis.gananciaBruta) },
      { label: "Gastos", value: cop(data.kpis.gastosOperativos) },
      { label: "Ganancia neta", value: cop(data.kpis.gananciaNeta) },
    ])
    row++ // spacer

    // P&L table
    row = addTableHeader(ws, row, ["", "Concepto", "", "", "", "Valor", "", "", "", ""], [5])
    const plRows = [
      ["Ventas brutas", data.kpis.ventasBrutas],
      ["(-) Costo de ventas", data.kpis.costoVentas],
      ["= Ganancia bruta", data.kpis.gananciaBruta],
      ["(-) Gastos operativos", data.kpis.gastosOperativos],
      ["= Ganancia neta", data.kpis.gananciaNeta],
      ["Margen neto", `${data.kpis.margenNeto.toFixed(1)}%`],
      ["CxC pendiente", data.kpis.totalCxC],
      ["CxP pendiente", data.kpis.totalCxP],
      ["Valor inventario", data.kpis.valorInventario],
      ["Valor materias primas", data.kpis.valorMateriasPrimas],
    ]
    plRows.forEach(([label, val], idx) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      fillRow(ws, row, 1, lastCol, bg)
      ws.mergeCells(row, 2, row, 5)
      const lbl = ws.getCell(row, 2)
      lbl.value = label as string
      const isBold = (label as string).startsWith("=")
      lbl.font = { name: "Calibri", size: 9, bold: isBold, color: { argb: isBold ? B.black : B.grayText } }
      lbl.alignment = { vertical: "middle" }
      ws.mergeCells(row, 6, row, 9)
      const valCell = ws.getCell(row, 6)
      if (typeof val === "number") {
        valCell.value = val
        valCell.numFmt = COP_FMT
      } else {
        valCell.value = val
      }
      valCell.font = { name: "Georgia", size: 10, bold: isBold, color: { argb: isBold ? B.gold : B.grayText } }
      valCell.alignment = { vertical: "middle", horizontal: "right" }
      ws.getRow(row).height = 20
      row++
    })
    addFooter(ws, row, lastCol)
  }

  // ═══ HOJA 2: VENTAS ═══
  {
    const lastCol = 11
    const ws = wb.addWorksheet("Ventas", wsConfig())
    ws.columns = [
      { width: 2 }, { width: 16 }, { width: 13 }, { width: 22 }, { width: 13 },
      { width: 13 }, { width: 11 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 2 },
    ]
    let row = addBrandHeader(ws, lastCol, "Detalle de Ventas", data.period)
    const totalVentas = data.sales.reduce((s: number, v: any) => s + (v.total || 0), 0)
    const units = data.sales.reduce((s: number, v: any) => s + ((v.items || []).reduce((q: number, i: any) => q + i.quantity, 0)), 0)
    row = addKpiRow(ws, row, lastCol, [
      { label: "Total", value: cop(totalVentas) },
      { label: "Facturas", value: `${data.sales.length}` },
      { label: "Ticket prom", value: cop(data.sales.length > 0 ? Math.round(totalVentas / data.sales.length) : 0) },
      { label: "Unidades", value: `${units}` },
    ])
    row++
    const headerRow = row
    row = addTableHeader(ws, row,
      ["", "Factura", "Fecha", "Cliente", "Canal", "M. Pago", "Estado", "Uds", "Subtotal", "Total", ""],
      [7, 8, 9]
    )
    data.sales.forEach((sale: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const chLabel = SALE_CHANNELS.find(c => c.value === sale.sale_channel)?.label || sale.sale_channel
      const pmLabel = PAYMENT_METHODS.find(m => m.value === sale.payment_method)?.label || sale.payment_method
      const stLabel = SALE_STATUS_CONFIG[sale.status as SaleStatus]?.label || sale.status
      const uds = (sale.items || []).reduce((q: number, i: any) => q + i.quantity, 0)
      const vals: (string | number)[] = [
        "", sale.invoice_number || "", formatDateShort(sale.sale_date || sale.created_at),
        sale.client?.full_name || "—", chLabel, pmLabel, stLabel, uds,
        sale.subtotal, sale.total, "",
      ]
      vals.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = v
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: [7, 8, 9].includes(i) ? "right" : "left" }
        if (i === 1) cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.gold } }
        else if (typeof v === "number") { cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }; cell.numFmt = COP_FMT }
        else cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    // Total row
    fillRow(ws, row, 1, lastCol, B.cream)
    ws.getRow(row).height = 26
    ws.mergeCells(row, 2, row, 8)
    ws.getCell(row, 2).value = "TOTAL"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
    ws.getCell(row, 2).alignment = { vertical: "middle" }
    ws.getCell(row, 9).value = totalVentas
    ws.getCell(row, 9).numFmt = COP_FMT
    ws.getCell(row, 9).font = { name: "Georgia", size: 11, bold: true, color: { argb: B.gold } }
    ws.getCell(row, 9).alignment = { horizontal: "right", vertical: "middle" }
    row++
    addFooter(ws, row, lastCol)
    ws.autoFilter = { from: { row: headerRow, column: 2 }, to: { row: headerRow + data.sales.length, column: lastCol - 1 } }
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]
  }

  // ═══ HOJA 3: GASTOS ═══
  {
    const lastCol = 9
    const ws = wb.addWorksheet("Gastos", wsConfig())
    ws.columns = [
      { width: 2 }, { width: 13 }, { width: 24 }, { width: 16 }, { width: 18 },
      { width: 13 }, { width: 15 }, { width: 15 }, { width: 2 },
    ]
    let row = addBrandHeader(ws, lastCol, "Detalle de Gastos", data.period)
    const totalGastos = data.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    row = addKpiRow(ws, row, lastCol, [
      { label: "Total gastos", value: cop(totalGastos) },
      { label: "Registros", value: `${data.expenses.length}` },
      { label: "Promedio", value: cop(data.expenses.length > 0 ? Math.round(totalGastos / data.expenses.length) : 0) },
    ])
    row++
    const headerRow = row
    row = addTableHeader(ws, row,
      ["", "Fecha", "Concepto", "Categoria", "Proveedor", "M. Pago", "Recurrente", "Monto", ""],
      [7]
    )
    data.expenses.forEach((exp: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const pmLabel = PAYMENT_METHODS.find(m => m.value === exp.payment_method)?.label || exp.payment_method
      const vals: (string | number)[] = [
        "", formatDateShort(exp.expense_date), exp.concept || "",
        exp.category?.name || "—", exp.supplier?.name || "—", pmLabel,
        exp.is_recurring ? "Si" : "No", exp.amount, "",
      ]
      vals.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = v
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: i === 7 ? "right" : "left" }
        if (typeof v === "number") { cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }; cell.numFmt = COP_FMT }
        else cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    fillRow(ws, row, 1, lastCol, B.cream)
    ws.getRow(row).height = 26
    ws.mergeCells(row, 2, row, 6)
    ws.getCell(row, 2).value = "TOTAL"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
    ws.getCell(row, 2).alignment = { vertical: "middle" }
    ws.getCell(row, 7).value = totalGastos
    ws.getCell(row, 7).numFmt = COP_FMT
    ws.getCell(row, 7).font = { name: "Georgia", size: 11, bold: true, color: { argb: B.gold } }
    ws.getCell(row, 7).alignment = { horizontal: "right", vertical: "middle" }
    row++
    addFooter(ws, row, lastCol)
    ws.autoFilter = { from: { row: headerRow, column: 2 }, to: { row: headerRow + data.expenses.length, column: lastCol - 1 } }
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]
  }

  // ═══ HOJA 4: CARTERA ═══
  {
    const lastCol = 10
    const ws = wb.addWorksheet("Cartera", wsConfig())
    ws.columns = [
      { width: 2 }, { width: 20 }, { width: 16 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 13 }, { width: 11 }, { width: 8 }, { width: 2 },
    ]
    let row = addBrandHeader(ws, lastCol, "Cartera CxC + CxP", data.period)
    const totalCxC = data.receivables.reduce((s: number, r: any) => s + (r.remaining_amount || 0), 0)
    const totalCxP = data.payables.reduce((s: number, p: any) => s + (p.remaining_amount || 0), 0)
    row = addKpiRow(ws, row, lastCol, [
      { label: "CxC pendiente", value: cop(totalCxC) },
      { label: "CxP pendiente", value: cop(totalCxP) },
      { label: "Balance neto", value: cop(totalCxC - totalCxP) },
    ])
    row++

    // CxC section
    ws.mergeCells(row, 2, row, 4)
    ws.getCell(row, 2).value = "CUENTAS POR COBRAR"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.gold } }
    ws.getRow(row).height = 22
    row++
    row = addTableHeader(ws, row,
      ["", "Cliente", "Factura", "Total", "Pagado", "Pendiente", "Vencimiento", "Estado", "Dias", ""],
      [3, 4, 5]
    )
    data.receivables.forEach((ar: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const dias = ar.due_date ? Math.floor((Date.now() - new Date(ar.due_date).getTime()) / 86400000) : 0
      const vals: (string | number)[] = [
        "", ar.client?.full_name || "—", ar.sale?.invoice_number || "—",
        ar.total_amount, ar.paid_amount, ar.remaining_amount,
        ar.due_date ? formatDateShort(ar.due_date) : "—", ar.status, Math.max(0, dias), "",
      ]
      vals.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = v
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: [3, 4, 5].includes(i) ? "right" : "left" }
        if (typeof v === "number" && i <= 5) { cell.numFmt = COP_FMT }
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    row += 2

    // CxP section
    ws.mergeCells(row, 2, row, 4)
    ws.getCell(row, 2).value = "CUENTAS POR PAGAR"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.gold } }
    ws.getRow(row).height = 22
    row++
    row = addTableHeader(ws, row,
      ["", "Proveedor", "Concepto", "Total", "Pagado", "Pendiente", "Vencimiento", "Estado", "Dias", ""],
      [3, 4, 5]
    )
    data.payables.forEach((ap: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const dias = ap.due_date ? Math.floor((Date.now() - new Date(ap.due_date).getTime()) / 86400000) : 0
      const vals: (string | number)[] = [
        "", ap.supplier?.name || "—", ap.notes || "—",
        ap.total_amount, ap.paid_amount, ap.remaining_amount,
        ap.due_date ? formatDateShort(ap.due_date) : "—", ap.status, Math.max(0, dias), "",
      ]
      vals.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = v
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: [3, 4, 5].includes(i) ? "right" : "left" }
        if (typeof v === "number" && i <= 5) { cell.numFmt = COP_FMT }
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    addFooter(ws, row, lastCol)
  }

  // ═══ HOJA 5: INVENTARIO ═══
  {
    const lastCol = 10
    const ws = wb.addWorksheet("Inventario", wsConfig())
    ws.columns = [
      { width: 2 }, { width: 20 }, { width: 18 }, { width: 10 }, { width: 10 },
      { width: 14 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 2 },
    ]
    let row = addBrandHeader(ws, lastCol, "Valoracion de Inventario", "Snapshot actual")
    row = addKpiRow(ws, row, lastCol, [
      { label: "Valor productos", value: cop(data.kpis.valorInventario) },
      { label: "Valor materias primas", value: cop(data.kpis.valorMateriasPrimas) },
      { label: "Valor total", value: cop(data.kpis.valorInventario + data.kpis.valorMateriasPrimas) },
    ])
    row++

    // Productos
    ws.mergeCells(row, 2, row, 4)
    ws.getCell(row, 2).value = "PRODUCTOS"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.gold } }
    ws.getRow(row).height = 22
    row++
    row = addTableHeader(ws, row,
      ["", "Producto", "Variante", "Categoria", "Stock", "Costo unit.", "Valor total", "Alerta", "Estado", ""],
      [4, 5, 6]
    )
    data.variants.forEach((v: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const variante = `${v.color || ""} / ${v.size || ""}`
      const valor = (v.stock || 0) * (v.cost_per_unit || 0)
      const vals: (string | number)[] = [
        "", v.product?.name || "—", variante, v.product?.category || "—",
        v.stock, v.cost_per_unit, valor, v.min_stock_alert,
        v.stock <= v.min_stock_alert ? "Bajo" : "OK", "",
      ]
      vals.forEach((val, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = val
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: [4, 5, 6].includes(i) ? "right" : "left" }
        if (typeof val === "number" && (i === 5 || i === 6)) { cell.numFmt = COP_FMT }
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    row += 2

    // Materias primas
    ws.mergeCells(row, 2, row, 4)
    ws.getCell(row, 2).value = "MATERIAS PRIMAS"
    ws.getCell(row, 2).font = { name: "Georgia", size: 10, bold: true, color: { argb: B.gold } }
    ws.getRow(row).height = 22
    row++
    row = addTableHeader(ws, row,
      ["", "Material", "Categoria", "Stock", "Unidad", "Costo unit.", "Valor total", "Alerta", "Estado", ""],
      [3, 5, 6]
    )
    data.rawMaterials.forEach((rm: any, idx: number) => {
      const bg = idx % 2 === 0 ? B.grayLight : B.white
      const valor = (rm.stock || 0) * (rm.cost_per_unit || 0)
      const vals: (string | number)[] = [
        "", rm.name || "—", rm.category || "—", rm.stock, rm.unit || "und",
        rm.cost_per_unit, valor, rm.min_stock_alert,
        rm.stock <= rm.min_stock_alert ? "Bajo" : "OK", "",
      ]
      vals.forEach((val, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = val
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
        cell.alignment = { vertical: "middle", horizontal: [3, 5, 6].includes(i) ? "right" : "left" }
        if (typeof val === "number" && (i === 5 || i === 6)) { cell.numFmt = COP_FMT }
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      })
      ws.getRow(row).height = 19
      row++
    })
    addFooter(ws, row, lastCol)
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().split("T")[0]
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Reporte_Completo_MIDAS_${today}.xlsx`
  )
}
