import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { formatCOP } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { Partner, PartnerWithdrawal } from "@/lib/types"

type WithdrawalExpanded = PartnerWithdrawal & {
  partner?: { name: string }
}

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
  error: "EF4444",
}

const COP_FMT = "$ #,##0"
const LAST_COL = 8 // columna H

function fillRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, color: string) {
  for (let c = c1; c <= c2; c++) {
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
  }
}

function getPaymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value
}

/**
 * Exporta reporte de retiros de socios a Excel premium — brandkit Casa Artemisa.
 */
export async function exportWithdrawalsToExcel(
  withdrawals: WithdrawalExpanded[],
  partners: Partner[],
  utilidadPeriodo: number
): Promise<void> {
  if (withdrawals.length === 0) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "MIDAS — Casa Artemisa"
  wb.created = new Date()

  const ws = wb.addWorksheet("Retiros de Socios", {
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
    { key: "C", width: 24 },  // socio
    { key: "D", width: 10 },  // %
    { key: "E", width: 17 },  // monto
    { key: "F", width: 15 },  // método
    { key: "G", width: 32 },  // notas
    { key: "H", width: 2 },   // margen
  ]

  // ═══════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════
  const totalRetirado = withdrawals.reduce((s, w) => s + w.amount, 0)
  const numRetiros = withdrawals.length
  const sociosUnicos = new Set(withdrawals.map((w) => w.partner_id)).size
  const disponible = utilidadPeriodo - totalRetirado

  let row = 1

  // ═══════════════════════════════════════════════════════════
  // ROW 1 — Barra negra con marca
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL, B.black)
  ws.getRow(row).height = 28

  ws.mergeCells(row, 2, row, 3)
  const brandCell = ws.getCell(row, 2)
  brandCell.value = "CASA ARTEMISA"
  brandCell.font = { name: "Georgia", size: 13, bold: true, color: { argb: B.gold } }
  brandCell.alignment = { vertical: "middle" }

  ws.mergeCells(row, 4, row, 5)
  const reportLabel = ws.getCell(row, 4)
  reportLabel.value = "Retiros de Socios"
  reportLabel.font = { name: "Calibri", size: 10, color: { argb: B.grayMid } }
  reportLabel.alignment = { vertical: "middle" }

  ws.mergeCells(row, 6, row, LAST_COL - 1)
  const dateCell = ws.getCell(row, 6)
  dateCell.value = new Date().toLocaleDateString("es-CO", { dateStyle: "long" })
  dateCell.font = { name: "Calibri", size: 9, color: { argb: B.gold } }
  dateCell.alignment = { vertical: "middle", horizontal: "right" }
  row++

  // ROW 2 — Línea dorada
  fillRow(ws, row, 1, LAST_COL, B.gold)
  ws.getRow(row).height = 2.5
  row++

  // ═══════════════════════════════════════════════════════════
  // ROW 3 — KPIs compactos en fila cream
  // ═══════════════════════════════════════════════════════════
  fillRow(ws, row, 1, LAST_COL, B.cream)
  ws.getRow(row).height = 32

  // KPI 1: Total retirado
  ws.mergeCells(row, 2, row, 3)
  const kpi1 = ws.getCell(row, 2)
  kpi1.value = { richText: [
    { text: "Total retirado  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: formatCOP(totalRetirado), font: { name: "Georgia", size: 12, bold: true, color: { argb: B.error } } },
  ]}
  kpi1.alignment = { vertical: "middle" }

  ws.getCell(row, 4).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 2: # Retiros
  const kpi2 = ws.getCell(row, 4)
  kpi2.value = { richText: [
    { text: "Retiros  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: `${numRetiros}`, font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi2.alignment = { vertical: "middle" }

  ws.getCell(row, 5).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 3: Utilidad período
  const kpi3 = ws.getCell(row, 5)
  kpi3.value = { richText: [
    { text: "Utilidad  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: formatCOP(utilidadPeriodo), font: { name: "Georgia", size: 12, bold: true, color: { argb: B.black } } },
  ]}
  kpi3.alignment = { vertical: "middle" }

  ws.getCell(row, 6).border = { left: { style: "thin", color: { argb: B.creamDark } } }

  // KPI 4: Disponible + Socios
  ws.mergeCells(row, 6, row, LAST_COL - 1)
  const kpi4 = ws.getCell(row, 6)
  kpi4.value = { richText: [
    { text: "Disponible  ", font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
    { text: formatCOP(disponible), font: { name: "Georgia", size: 12, bold: true, color: { argb: disponible >= 0 ? B.success : B.error } } },
    { text: `  ·  ${sociosUnicos} socios`, font: { name: "Calibri", size: 8, color: { argb: B.grayMid } } },
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
  const headers = ["", "Fecha", "Socio", "%", "Monto", "Método", "Notas", ""]

  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: B.white } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: B.black } }
    cell.alignment = {
      vertical: "middle",
      horizontal: i === 4 ? "right" : "left",
    }
  })
  ws.getRow(row).height = 22
  row++

  // ═══════════════════════════════════════════════════════════
  // TABLE BODY
  // ═══════════════════════════════════════════════════════════
  withdrawals.forEach((w, idx) => {
    const bg = idx % 2 === 0 ? B.grayLight : B.white
    const partner = partners.find((p) => p.id === w.partner_id)

    const vals: (string | number)[] = [
      "",
      w.withdrawal_date,
      w.partner?.name || "—",
      partner ? `${partner.distribution_percentage}%` : "—",
      w.amount,
      getPaymentLabel(w.method),
      w.notes || "—",
      "",
    ]

    vals.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1)
      cell.value = v
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      cell.border = { bottom: { style: "hair", color: { argb: B.creamDark } } }
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 4 ? "right" : "left",
      }

      if (i === 2) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.black } }
      } else if (i === 4) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: B.error } }
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
  fillRow(ws, row, 1, LAST_COL, B.cream)
  ws.getRow(row).height = 26

  ws.mergeCells(row, 2, row, 3)
  const totLabel = ws.getCell(row, 2)
  totLabel.value = "TOTAL"
  totLabel.font = { name: "Georgia", size: 10, bold: true, color: { argb: B.black } }
  totLabel.alignment = { vertical: "middle" }

  const totVal = ws.getCell(row, 5)
  totVal.value = totalRetirado
  totVal.numFmt = COP_FMT
  totVal.font = { name: "Georgia", size: 11, bold: true, color: { argb: B.gold } }
  totVal.alignment = { horizontal: "right", vertical: "middle" }
  row++

  // ═══════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════
  row++
  fillRow(ws, row, 1, LAST_COL, B.gold)
  ws.getRow(row).height = 2
  row++

  ws.mergeCells(row, 2, row, 4)
  const fL = ws.getCell(row, 2)
  fL.value = "Casa Artemisa · Colombian Streetwear · MIDAS"
  fL.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }

  ws.mergeCells(row, 5, row, LAST_COL - 1)
  const fR = ws.getCell(row, 5)
  fR.value = `Generado ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })} · Confidencial`
  fR.font = { name: "Calibri", size: 7.5, italic: true, color: { argb: B.grayMid } }
  fR.alignment = { horizontal: "right" }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FINAL
  // ═══════════════════════════════════════════════════════════
  ws.headerFooter.oddFooter = "&C&7Página &P de &N"
  ws.autoFilter = {
    from: { row: headerRow, column: 2 },
    to: { row: headerRow + withdrawals.length, column: LAST_COL - 1 },
  }
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: headerRow, showGridLines: false }]

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().split("T")[0]
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Retiros_Socios_MIDAS_${today}.xlsx`
  )
}
