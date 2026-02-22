import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { formatCOP } from "@/lib/format"
import { RAW_MATERIAL_CATEGORIES } from "@/lib/constants"
import type { RawMaterial } from "@/lib/types"

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
  info: "3B82F6",
}

const COP_FMT = "$ #,##0"
const LAST_COL = 11 // columna K

function fillRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, color: string) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
  }
}

function getCategoryLabel(value: string): string {
  return RAW_MATERIAL_CATEGORIES.find((c) => c.value === value)?.label || value
}

/**
 * Exporta inventario de materias primas a Excel premium — brandkit Casa Artemisa.
 */
export async function exportMaterialsToExcel(materials: RawMaterial[]): Promise<void> {
  if (materials.length === 0) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "MIDAS — Casa Artemisa"
  wb.created = new Date()

  const ws = wb.addWorksheet("Inventario Materias Primas", {
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
    { key: "B", width: 30 },  // material
    { key: "C", width: 16 },  // categoría
    { key: "D", width: 12 },  // unidad
    { key: "E", width: 12 },  // stock actual
    { key: "F", width: 12 },  // stock mínimo
    { key: "G", width: 12 },  // estado stock
    { key: "H", width: 15 },  // costo unitario
    { key: "I", width: 17 },  // valor total
    { key: "J", width: 22 },  // proveedor
    { key: "K", width: 28 },  // descripción
    { key: "L", width: 2 },   // margen
  ]

  // ═══════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════
  const totalMaterials = materials.length
  const totalUnits = materials.reduce((s, m) => s + m.stock, 0)
  const totalValue = materials.reduce((s, m) => s + m.stock * m.cost_per_unit, 0)
  const lowStock = materials.filter((m) => m.stock > 0 && m.stock <= m.min_stock_alert).length
  const outOfStock = materials.filter((m) => m.stock === 0).length

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
  reportLabel.value = "Inventario de Materias Primas"
  reportLabel.font = { name: "Calibri", size: 10, color: { argb: B.grayMid } }
  reportLabel.alignment = { vertical: "middle" }

  ws.mergeCells(row, 9, row, LAST_COL)
  const dateCell = ws.getCell(row, 9)
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

  // KPI 1: Total materiales (cols 2-3)
  ws.mergeCells(row, 2, row, 3)
  const kpi1 = ws.getCell(row, 2)
  kpi1.value = { richText: [
    { text: "Materiales  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${totalMaterials}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi1.alignment = { vertical: "middle" }

  ws.getCell(row, 4).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 2: Unidades totales (cols 4-5)
  ws.mergeCells(row, 4, row, 5)
  const kpi2 = ws.getCell(row, 4)
  kpi2.value = { richText: [
    { text: "Unidades  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${totalUnits.toLocaleString("es-CO")}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi2.alignment = { vertical: "middle" }

  ws.getCell(row, 6).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 3: Valor inventario (cols 6-7)
  ws.mergeCells(row, 6, row, 7)
  const kpi3 = ws.getCell(row, 6)
  kpi3.value = { richText: [
    { text: "Valor inv.  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `$${totalValue.toLocaleString("es-CO")}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi3.alignment = { vertical: "middle" }

  ws.getCell(row, 8).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 4: Stock bajo (cols 8-9)
  ws.mergeCells(row, 8, row, 9)
  const kpi4 = ws.getCell(row, 8)
  kpi4.value = { richText: [
    { text: "Stock bajo  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${lowStock}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: lowStock > 0 ? B.warning : B.black } } },
  ]}
  kpi4.alignment = { vertical: "middle" }

  ws.getCell(row, 10).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 5: Agotados (cols 10-11)
  ws.mergeCells(row, 10, row, LAST_COL)
  const kpi5 = ws.getCell(row, 10)
  kpi5.value = { richText: [
    { text: "Agotados  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${outOfStock}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: outOfStock > 0 ? B.error : B.black } } },
  ]}
  kpi5.alignment = { vertical: "middle" }
  row++

  // ROW 4 — Spacer
  ws.getRow(row).height = 6
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 5 — TABLE HEADER (barra negra)
  // ═══════════════════════════════════════════════════════════
  const headerRow = row
  const headers = [
    "", "Material", "Categoría", "Unidad", "Stock", "Mín. alerta",
    "Estado", "Costo unit.", "Valor total", "Proveedor", "Descripción", "",
  ]

  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: B.white } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: B.black } }
    cell.alignment = {
      vertical: "middle",
      horizontal: (i >= 4 && i <= 5) || i === 7 || i === 8 ? "right" : "left",
    }
  })
  ws.getRow(row).height = 22
  row++

  // ═══════════════════════════════════════════════════════════
  // TABLE BODY
  // ═══════════════════════════════════════════════════════════
  materials.forEach((mat, idx) => {
    const bg = idx % 2 === 0 ? B.grayLight : B.white
    const valor = mat.stock * mat.cost_per_unit

    // Estado del stock
    let estado: string
    let estadoColor: string
    if (mat.stock === 0) {
      estado = "Agotado"
      estadoColor = B.error
    } else if (mat.stock <= mat.min_stock_alert) {
      estado = "Bajo"
      estadoColor = B.warning
    } else {
      estado = "OK"
      estadoColor = B.success
    }

    const supplierName = mat.supplier
      ? (mat.supplier as unknown as { name: string }).name
      : "—"

    const vals: (string | number)[] = [
      "",
      mat.name,
      getCategoryLabel(mat.category),
      mat.unit,
      mat.stock,
      mat.min_stock_alert,
      estado,
      mat.cost_per_unit,
      valor,
      supplierName,
      mat.description || "—",
      "",
    ]

    vals.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1)
      cell.value = v
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
      cell.alignment = {
        vertical: "middle",
        horizontal: (i >= 4 && i <= 5) || i === 7 || i === 8 ? "right" : "left",
      }

      if (i === 1) {
        // Nombre material en bold
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.black } }
      } else if (i === 6) {
        // Estado con color
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: estadoColor } }
      } else if (i === 8) {
        // Valor total en gold bold
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.gold } }
        if (typeof v === "number") cell.numFmt = COP_FMT
      } else if (i === 7) {
        // Costo unitario
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
        if (typeof v === "number") cell.numFmt = COP_FMT
      } else if (i === 4 || i === 5) {
        // Números de stock
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
        cell.numFmt = "#,##0"
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

  ws.mergeCells(row, 2, row, 3)
  const totLabel = ws.getCell(row, 2)
  totLabel.value = "TOTAL"
  totLabel.font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
  totLabel.alignment = { vertical: "middle" }

  // Total unidades
  const totUnits = ws.getCell(row, 5)
  totUnits.value = totalUnits
  totUnits.numFmt = "#,##0"
  totUnits.font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
  totUnits.alignment = { horizontal: "right", vertical: "middle" }

  // Total valor
  const totVal = ws.getCell(row, 9)
  totVal.value = totalValue
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

  ws.mergeCells(row, 8, row, LAST_COL)
  const fR = ws.getCell(row, 8)
  fR.value = `Generado ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })} · Confidencial`
  fR.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }
  fR.alignment = { horizontal: "right" }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FINAL
  // ═══════════════════════════════════════════════════════════
  ws.headerFooter.oddFooter = "&C&7Página &P de &N"
  ws.autoFilter = {
    from: { row: headerRow, column: 2 },
    to: { row: headerRow + materials.length, column: LAST_COL },
  }
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().split("T")[0]
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Inventario_Materias_Primas_MIDAS_${today}.xlsx`
  )
}
