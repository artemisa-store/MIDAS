import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { formatDateShort } from "@/lib/format"
import { SALE_STATUS_CONFIG, SALE_CHANNELS, PAYMENT_METHODS } from "@/lib/constants"
import type { SaleExpanded } from "../facturacion/recibo-termico"
import type { SaleStatus } from "@/lib/types"

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

const COP_FMT = '$ #,##0'
const LAST_COL = 16 // columna P

// Helper: fill range
function fillRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, color: string) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
  }
}

/**
 * Exporta ventas a un Excel premium — brandkit Casa Artemisa.
 */
export async function exportSalesToExcel(sales: SaleExpanded[]): Promise<void> {
  if (sales.length === 0) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "MIDAS — Casa Artemisa"
  wb.created = new Date()

  const ws = wb.addWorksheet("Reporte de Ventas", {
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
    { key: "B", width: 16 },  // factura
    { key: "C", width: 13 },  // fecha
    { key: "D", width: 22 },  // cliente
    { key: "E", width: 15 },  // teléfono
    { key: "F", width: 13 },  // ciudad
    { key: "G", width: 13 },  // canal
    { key: "H", width: 13 },  // m. pago
    { key: "I", width: 11 },  // estado
    { key: "J", width: 7 },   // uds
    { key: "K", width: 14 },  // subtotal
    { key: "L", width: 13 },  // descuento
    { key: "M", width: 12 },  // envío
    { key: "N", width: 15 },  // total
    { key: "O", width: 9 },   // crédito
    { key: "P", width: 30 },  // productos
    { key: "Q", width: 2 },   // margen
  ]

  // ═══════════════════════════════════════════════════════════
  // CALCULOS
  // ═══════════════════════════════════════════════════════════
  const active = sales.filter((s) => s.status !== "returned")
  const totalVentas = active.reduce((s, v) => s + v.total, 0)
  const ticketProm = active.length > 0 ? Math.round(totalVentas / active.length) : 0
  const unidades = active.reduce(
    (s, v) => s + (v.items || []).reduce((q, i) => q + i.quantity, 0), 0
  )
  const devs = sales.filter((s) => s.status === "returned").length

  const periodoFrom = sales.length > 0
    ? formatDateShort(sales[sales.length - 1].sale_date || sales[sales.length - 1].created_at)
    : ""
  const periodoTo = sales.length > 0
    ? formatDateShort(sales[0].sale_date || sales[0].created_at)
    : ""

  let row = 1

  // ═══════════════════════════════════════════════════════════
  // ROW 1 — Barra negra con marca (compacta)
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL + 1, B.black)
  ws.getRow(row).height = 28

  ws.mergeCells(row, 2, row, 6)
  const brandCell = ws.getCell(row, 2)
  brandCell.value = "CASA ARTEMISA"
  brandCell.font = { name: "Georgia", size: 13, bold: true, color: { argb: B.gold } }
  brandCell.alignment = { vertical: "middle" }

  ws.mergeCells(row, 7, row, 9)
  const reportLabel = ws.getCell(row, 7)
  reportLabel.value = "Reporte de Ventas"
  reportLabel.font = { name: "Calibri", size: 10, color: { argb: B.grayMid } }
  reportLabel.alignment = { vertical: "middle" }

  ws.mergeCells(row, 13, row, LAST_COL)
  const dateCell = ws.getCell(row, 13)
  dateCell.value = `${periodoFrom}  —  ${periodoTo}`
  dateCell.font = { name: "Calibri", size: 9, color: { argb: B.gold } }
  dateCell.alignment = { vertical: "middle", horizontal: "right" }
  row++

  // ROW 2 — Línea dorada 2px
  fillRow(ws, row, 1, LAST_COL + 1, B.gold)
  ws.getRow(row).height = 2.5
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 3 — KPIs en una sola fila compacta con fondo cream
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL + 1, B.cream)
  ws.getRow(row).height = 32

  // KPI 1: Total vendido (cols 2-4)
  ws.mergeCells(row, 2, row, 4)
  const kpi1 = ws.getCell(row, 2)
  kpi1.value = { richText: [
    { text: "Total vendido  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `$${totalVentas.toLocaleString("es-CO")}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi1.alignment = { vertical: "middle" }

  // Separador vertical sutil
  ws.getCell(row, 5).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 2: Ventas (cols 5-6)
  ws.mergeCells(row, 5, row, 6)
  const kpi2 = ws.getCell(row, 5)
  kpi2.value = { richText: [
    { text: "Ventas  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${active.length}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi2.alignment = { vertical: "middle" }

  ws.getCell(row, 7).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 3: Ticket promedio (cols 7-9)
  ws.mergeCells(row, 7, row, 9)
  const kpi3 = ws.getCell(row, 7)
  kpi3.value = { richText: [
    { text: "Ticket prom.  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `$${ticketProm.toLocaleString("es-CO")}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi3.alignment = { vertical: "middle" }

  ws.getCell(row, 10).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 4: Unidades (cols 10-12)
  ws.mergeCells(row, 10, row, 12)
  const kpi4 = ws.getCell(row, 10)
  kpi4.value = { richText: [
    { text: "Unidades  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${unidades.toLocaleString("es-CO")}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi4.alignment = { vertical: "middle" }

  ws.getCell(row, 13).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 5: Devoluciones (cols 13-14)
  ws.mergeCells(row, 13, row, 14)
  const kpi5 = ws.getCell(row, 13)
  kpi5.value = { richText: [
    { text: "Devol.  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${devs}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: devs > 0 ? B.error : B.black } } },
  ]}
  kpi5.alignment = { vertical: "middle" }

  // Registros count (cols 15-16)
  ws.mergeCells(row, 15, row, 16)
  const regCell = ws.getCell(row, 15)
  regCell.value = `${sales.length} reg.`
  regCell.font = { name: "Calibri", size: 8, italic: true, color: { argb: B.grayMid } }
  regCell.alignment = { vertical: "middle", horizontal: "right" }
  row++

  // ROW 4 — spacer mínimo
  ws.getRow(row).height = 6
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 5 — TABLE HEADER (barra negra)
  // ═══════════════════════════════════════════════════════════
  const headerRow = row
  const headers = [
    "", "# Factura", "Fecha", "Cliente", "Teléfono", "Ciudad",
    "Canal", "M. Pago", "Estado", "Uds.", "Subtotal",
    "Descuento", "Envío", "Total", "Crédito", "Productos", "",
  ]

  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: B.white } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: B.black } }
    cell.alignment = {
      vertical: "middle",
      horizontal: i >= 10 && i <= 14 ? "right" : "left",
    }
  })
  ws.getRow(row).height = 22
  row++

  // ═══════════════════════════════════════════════════════════
  // TABLE BODY
  // ═══════════════════════════════════════════════════════════
  const STATUS_COLORS: Record<string, string> = {
    paid: B.success, pending: B.warning, shipped: B.info,
    delivered: B.success, returned: B.error,
  }

  sales.forEach((sale, idx) => {
    const bg = idx % 2 === 0 ? B.grayLight : B.white
    const itemCount = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0)
    const chLabel = SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
    const pmLabel = PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method
    const stLabel = SALE_STATUS_CONFIG[sale.status as SaleStatus]?.label || sale.status

    let desc = 0
    if (sale.discount_value > 0) {
      desc = sale.discount_type === "percentage"
        ? Math.round(sale.subtotal * (sale.discount_value / 100))
        : sale.discount_value
    }

    const prods = (sale.items || [])
      .map((i) => i.variant?.product?.name || "Producto")
      .filter((v, vi, a) => a.indexOf(v) === vi)
      .join(", ")

    const vals = [
      "", sale.invoice_number,
      formatDateShort(sale.sale_date || sale.created_at),
      sale.client?.full_name || "—",
      sale.client?.phone_whatsapp || "—",
      sale.client?.city || "—",
      chLabel, pmLabel, stLabel, itemCount,
      sale.subtotal, desc, sale.shipping_cost, sale.total,
      sale.is_credit ? "Sí" : "No", prods, "",
    ]

    vals.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1)
      cell.value = v
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
      cell.alignment = { vertical: "middle", horizontal: i >= 10 && i <= 14 ? "right" : "left" }

      if (i === 1) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.gold } }
      } else if (i === 8) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: STATUS_COLORS[sale.status] || B.grayMid } }
      } else if (i === 13) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.black } }
        if (typeof v === "number") cell.numFmt = COP_FMT
      } else if (typeof v === "number" && i >= 10 && i <= 13) {
        cell.font = { name: "Calibri", size: 9, color: { argb: B.grayText } }
        cell.numFmt = COP_FMT
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

  ws.mergeCells(row, 2, row, 9)
  const totLabel = ws.getCell(row, 2)
  totLabel.value = "TOTAL"
  totLabel.font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
  totLabel.alignment = { vertical: "middle" }

  const grandTotal = sales.reduce((s, v) => s + v.total, 0)
  ws.mergeCells(row, 13, row, 14)
  const totVal = ws.getCell(row, 13)
  totVal.value = grandTotal
  totVal.numFmt = COP_FMT
  totVal.font = { name: "Georgia", size: 11, bold: true, color: { argb: B.gold } }
  totVal.alignment = { horizontal: "right", vertical: "middle" }
  row++

  // ═══════════════════════════════════════════════════════════
  // FOOTER — Línea dorada + texto
  // ═══════════════════════════════════════════════════════════
  row++
  fillRow(ws, row, 1, LAST_COL + 1, B.gold)
  ws.getRow(row).height = 2
  row++

  ws.mergeCells(row, 2, row, 8)
  const fL = ws.getCell(row, 2)
  fL.value = "Casa Artemisa · Colombian Streetwear · MIDAS"
  fL.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }

  ws.mergeCells(row, 12, row, LAST_COL)
  const fR = ws.getCell(row, 12)
  fR.value = `Generado ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })} · Confidencial`
  fR.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }
  fR.alignment = { horizontal: "right" }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FINAL
  // ═══════════════════════════════════════════════════════════
  ws.headerFooter.oddFooter = "&C&7Página &P de &N"
  ws.autoFilter = {
    from: { row: headerRow, column: 2 },
    to: { row: headerRow + sales.length, column: LAST_COL },
  }
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().split("T")[0]
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Reporte_Ventas_MIDAS_${today}.xlsx`
  )
}
