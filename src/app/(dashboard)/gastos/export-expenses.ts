import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { formatCOP } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { Expense, ExpenseCategory } from "@/lib/types"

// ═══════════════════════════════════════════════════════════════════
// BRAND KIT — Casa Artemisa
// ═══════════════════════════════════════════════════════════════════
const B = {
  gold: "C9A55C",
  black: "0A0A0A",
  cream: "F5F0E6",
  creamDark: "EDE8DA",
  white: "FFFFFF",
  grayLight: "F8F8F8",
  grayMid: "999999",
  grayText: "555555",
  success: "22C55E",
  warning: "F59E0B",
  error: "EF4444",
}

const COP_FMT = "$ #,##0"
const LAST_COL = 10 // columna J

function fillRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, color: string) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
  }
}

function getPaymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value
}

export type ExpenseForExport = Omit<Expense, "category" | "supplier"> & {
  category?: ExpenseCategory
  supplier?: { name: string }
}

/**
 * Exporta reporte de gastos a Excel premium — brandkit Casa Artemisa.
 */
export async function exportExpensesToExcel(expenses: ExpenseForExport[]): Promise<void> {
  if (expenses.length === 0) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "MIDAS — Casa Artemisa"
  wb.created = new Date()

  const ws = wb.addWorksheet("Reporte de Gastos", {
    properties: { defaultColWidth: 14 },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    views: [{ showGridLines: false }],
  })

  ws.columns = [
    { key: "A", width: 2 },   // margen
    { key: "B", width: 14 },  // fecha
    { key: "C", width: 32 },  // concepto
    { key: "D", width: 20 },  // categoría
    { key: "E", width: 22 },  // proveedor
    { key: "F", width: 17 },  // monto
    { key: "G", width: 15 },  // método pago
    { key: "H", width: 16 },  // # factura
    { key: "I", width: 6 },   // recurrente
    { key: "J", width: 28 },  // notas
    { key: "K", width: 2 },   // margen
  ]

  // ═══════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const totalRecords = expenses.length
  const avgExpense = totalRecords > 0 ? totalAmount / totalRecords : 0

  // Categoría top (por monto)
  const catTotals: Record<string, number> = {}
  expenses.forEach((e) => {
    const catName = e.category?.name || "Sin categoría"
    catTotals[catName] = (catTotals[catName] || 0) + e.amount
  })
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]

  let row = 1

  // ═══════════════════════════════════════════════════════════
  // ROW 1 — Barra negra con marca
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL + 1, B.black)
  ws.getRow(row).height = 28

  ws.mergeCells(row, 2, row, 4)
  const brandCell = ws.getCell(row, 2)
  brandCell.value = "CASA ARTEMISA"
  brandCell.font = { name: "Georgia", size: 13, bold: true, color: { argb: B.gold } }
  brandCell.alignment = { vertical: "middle" }

  ws.mergeCells(row, 5, row, 7)
  const reportLabel = ws.getCell(row, 5)
  reportLabel.value = "Reporte de Gastos"
  reportLabel.font = { name: "Calibri", size: 10, color: { argb: B.grayMid } }
  reportLabel.alignment = { vertical: "middle" }

  ws.mergeCells(row, 8, row, LAST_COL)
  const dateCell = ws.getCell(row, 8)
  dateCell.value = new Date().toLocaleDateString("es-CO", { dateStyle: "long" })
  dateCell.font = { name: "Calibri", size: 9, color: { argb: B.gold } }
  dateCell.alignment = { vertical: "middle", horizontal: "right" }
  row++

  // ROW 2 — Línea dorada
  fillRow(ws, row, 1, LAST_COL + 1, B.gold)
  ws.getRow(row).height = 2.5
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 3 — KPIs compactos en fila cream
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL + 1, B.cream)
  ws.getRow(row).height = 32

  // KPI 1: Total gastos (cols 2-3)
  ws.mergeCells(row, 2, row, 3)
  const kpi1 = ws.getCell(row, 2)
  kpi1.value = { richText: [
    { text: "Total gastos  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: formatCOP(totalAmount), font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi1.alignment = { vertical: "middle" }

  ws.getCell(row, 4).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 2: # Registros (cols 4-5)
  ws.mergeCells(row, 4, row, 5)
  const kpi2 = ws.getCell(row, 4)
  kpi2.value = { richText: [
    { text: "Registros  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${totalRecords}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi2.alignment = { vertical: "middle" }

  ws.getCell(row, 6).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 3: Promedio (cols 6-7)
  ws.mergeCells(row, 6, row, 7)
  const kpi3 = ws.getCell(row, 6)
  kpi3.value = { richText: [
    { text: "Promedio  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: formatCOP(Math.round(avgExpense)), font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi3.alignment = { vertical: "middle" }

  ws.getCell(row, 8).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 4: Categoría top (cols 8-10)
  ws.mergeCells(row, 8, row, LAST_COL)
  const kpi4 = ws.getCell(row, 8)
  kpi4.value = { richText: [
    { text: "Top categoría  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: topCategory ? topCategory[0] : "—", font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi4.alignment = { vertical: "middle" }
  row++

  // ROW 4 — Spacer
  ws.getRow(row).height = 6
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 5 — TABLE HEADER (barra negra)
  // ═══════════════════════════════════════════════════════════
  const headerRow = row
  const headers = [
    "", "Fecha", "Concepto", "Categoría", "Proveedor",
    "Monto", "Método pago", "# Factura", "Rec.", "Notas", "",
  ]

  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: B.white } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: B.black } }
    cell.alignment = {
      vertical: "middle",
      horizontal: i === 5 ? "right" : "left",
    }
  })
  ws.getRow(row).height = 22
  row++

  // ═══════════════════════════════════════════════════════════
  // TABLE BODY
  // ═══════════════════════════════════════════════════════════
  expenses.forEach((exp, idx) => {
    const bg = idx % 2 === 0 ? B.grayLight : B.white
    const supplierName = exp.supplier?.name || "—"
    const categoryName = exp.category?.name || "—"

    const vals: (string | number)[] = [
      "",
      exp.expense_date,
      exp.concept,
      categoryName,
      supplierName,
      exp.amount,
      getPaymentLabel(exp.payment_method),
      exp.supplier_invoice_number || "—",
      exp.is_recurring ? "Sí" : "No",
      exp.notes || "—",
      "",
    ]

    vals.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1)
      cell.value = v
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 5 ? "right" : "left",
      }

      if (i === 2) {
        // Concepto en bold
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.black } }
      } else if (i === 5) {
        // Monto en gold bold
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.gold } }
        if (typeof v === "number") cell.numFmt = COP_FMT
      } else {
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
      }
    })
    ws.getRow(row).height = 19
    row++
  })

  // ═══════════════════════════════════════════════════════════
  // TOTAL ROW
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL + 1, B.cream)
  ws.getRow(row).height = 26

  ws.mergeCells(row, 2, row, 4)
  const totLabel = ws.getCell(row, 2)
  totLabel.value = "TOTAL"
  totLabel.font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
  totLabel.alignment = { vertical: "middle" }

  const totVal = ws.getCell(row, 6)
  totVal.value = totalAmount
  totVal.numFmt = COP_FMT
  totVal.font = { name: "Georgia", size: 11, bold: true, color: { argb: B.gold } }
  totVal.alignment = { horizontal: "right", vertical: "middle" }
  row++

  // ═══════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════
  row++
  fillRow(ws, row, 1, LAST_COL + 1, B.gold)
  ws.getRow(row).height = 2
  row++

  ws.mergeCells(row, 2, row, 5)
  const fL = ws.getCell(row, 2)
  fL.value = "Casa Artemisa · Colombian Streetwear · MIDAS"
  fL.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }

  ws.mergeCells(row, 7, row, LAST_COL)
  const fR = ws.getCell(row, 7)
  fR.value = `Generado ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })} · Confidencial`
  fR.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }
  fR.alignment = { horizontal: "right" }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FINAL
  // ═══════════════════════════════════════════════════════════
  ws.headerFooter.oddFooter = "&C&7Página &P de &N"
  ws.autoFilter = {
    from: { row: headerRow, column: 2 },
    to: { row: headerRow + expenses.length, column: LAST_COL },
  }
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().split("T")[0]
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Reporte_Gastos_MIDAS_${today}.xlsx`
  )
}
