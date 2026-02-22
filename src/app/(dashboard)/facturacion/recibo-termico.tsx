"use client"

import { forwardRef, useImperativeHandle, useCallback } from "react"
import type { Sale, SaleItem, Client, ProductVariant, Product } from "@/lib/types"
import { formatCOP } from "@/lib/format"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { SALE_STATUS_CONFIG, PAYMENT_METHODS, SALE_CHANNELS } from "@/lib/constants"

// === Tipo de item con variante y producto expandidos ===
interface SaleItemExpanded extends SaleItem {
  variant?: ProductVariant & {
    product?: Product
  }
}

// === Tipo de venta con cliente e items expandidos ===
interface SaleExpanded extends Sale {
  client?: Client
  items?: SaleItemExpanded[]
}

// === Referencia expuesta al padre ===
export interface ReciboTermicoRef {
  imprimir: () => void
}

interface ReciboTermicoProps {
  sale: SaleExpanded
  showPreview?: boolean
}

/**
 * Genera el HTML completo del recibo térmico con diseño premium
 * optimizado para impresoras térmicas de 80mm.
 * TODO el texto es negro puro (#000) para evitar borrosidad en térmicas.
 */
/**
 * Genera el HTML completo del recibo térmico con diseño HAUTE COUTURE ULTRA PREMIUM
 * optimizado para impresoras térmicas de 80mm.
 * Estilo editorial de lujo extremo: dominancia de negros puros,
 * espaciado dramático y arquitectura de grilla perfecta.
 */
function generarHTMLRecibo(sale: SaleExpanded): string {
  const fechaObj = new Date(sale.sale_date || sale.created_at)
  const fechaFormateada = format(fechaObj, "dd.MM.yy", { locale: es })
  const horaFormateada = format(fechaObj, "HH:mm", { locale: es })

  const metodoPago = PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method
  const canalVenta = SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
  const estadoLabel = SALE_STATUS_CONFIG[sale.status]?.label || sale.status

  let descuentoTexto = ""
  let descuentoValor = 0
  if (sale.discount_value && sale.discount_value > 0) {
    if (sale.discount_type === "percentage") {
      descuentoValor = Math.round(sale.subtotal * (sale.discount_value / 100))
      descuentoTexto = `BENEFICIO (${sale.discount_value}%)`
    } else {
      descuentoValor = sale.discount_value
      descuentoTexto = "BENEFICIO"
    }
  }

  // Generar líneas de items — formato editorial tabular oscuro
  const lineasItems = (sale.items || [])
    .map((item) => {
      const nombreProducto = item.variant?.product?.name || "PRODUCTO"
      const detalles = [item.variant?.color, item.variant?.size, item.variant?.cut]
        .filter(Boolean).join(" \u00B7 ")
      const subtotalItem = formatCOP(item.subtotal)

      return `
        <div class="item-block">
          <div class="item-header">
            <span class="item-name">${nombreProducto.toUpperCase()}</span>
          </div>
          ${detalles ? `<div class="item-details">${detalles.toUpperCase()}</div>` : ""}
          <div class="item-metrics">
            <span class="item-qty">${item.quantity}  X  ${formatCOP(item.unit_price)}</span>
            <span class="item-total">${subtotalItem}</span>
          </div>
        </div>
      `
    })
    .join("")

  const totalItems = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0)

  // HTML del recibo — Diseño Alta Costura, 100% Monocromo Extremo
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm">
  <title>Recibo ${sale.invoice_number}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body { padding: 4mm 2mm !important; }
    }
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;700;900&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 4mm 2mm;
      line-height: 1.3;
      text-transform: uppercase;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Utilidades de Línea Duras */
    .divider-solid-xl { border-top: 4px solid #000; margin: 8px 0; }
    .divider-solid-sm { border-top: 1px solid #000; margin: 4px 0; }
    .divider-dashed   { border-top: 1px dashed #000; margin: 6px 0; }
    .divider-dotted   { border-top: 1px dotted #000; margin: 6px 0; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'Courier Prime', monospace; }

    /* Bloques Invertidos (Alta Costura) */
    .block-inverted {
      background-color: #000;
      color: #fff;
      padding: 8px 6px;
      text-align: center;
      margin: 10px 0;
      font-weight: 900;
      letter-spacing: 3px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Cabecera / Marca */
    .brand-hero {
      text-align: center;
      padding: 12px 0;
    }
    .brand-title {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 6px;
      margin-bottom: 2px;
      line-height: 1;
    }

    /* Número de Factura Gigante */
    .invoice-hero {
      text-align: center;
      margin: 12px 0;
      padding: 10px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .invoice-label {
      font-size: 10px;
      letter-spacing: 4px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .invoice-number {
      font-family: 'Courier Prime', monospace;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    /* Grilla de Datos */
    .data-grid {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 3px 0;
    }
    .data-label {
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 1px;
    }
    .data-val {
      font-weight: 900;
      font-size: 11px;
      text-align: right;
    }
    .data-val-mono {
      font-family: 'Courier Prime', monospace;
      font-weight: 700;
      font-size: 12px;
    }

    /* Items - Estructura Editorial */
    .items-header {
      background-color: #000;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 4px;
      padding: 4px 6px;
      margin: 12px 0 6px 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .item-block {
      padding: 6px 0;
      border-bottom: 1px dashed #000;
    }
    .item-block:last-child { border-bottom: none; }
    .item-name {
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    .item-details {
      font-size: 9px;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .item-metrics {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      align-items: baseline;
    }
    .item-qty {
      font-family: 'Courier Prime', monospace;
      font-size: 10px;
      font-weight: 700;
    }
    .item-total {
      font-weight: 900;
      font-size: 13px;
    }

    /* Zona de Totales (Drama) */
    .total-area {
      margin-top: 12px;
    }
    .total-main {
      background-color: #000;
      color: #fff;
      padding: 12px 10px;
      margin: 12px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .total-main-label {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
    }
    .total-main-val {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    /* Documento Autenticidad */
    .auth-badge {
      border: 3px solid #000;
      padding: 12px 8px;
      text-align: center;
      margin: 16px 0;
    }
    .auth-title {
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 4px;
      margin-bottom: 0;
    }

    /* Plan Financiero */
    .credit-box {
      border: 3px solid #000;
      padding: 8px 6px;
      margin: 12px 0;
    }
    .credit-header {
      background: #000;
      color: #fff;
      text-align: center;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 3px;
      padding: 4px;
      margin-bottom: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Pie de página */
    .footer-stamp {
      font-family: 'Courier Prime', monospace;
      text-align: center;
      font-size: 9px;
      letter-spacing: 4px;
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #000;
    }
    .barcode-art {
      font-family: 'Courier Prime', monospace;
      font-size: 14px;
      text-align: center;
      letter-spacing: 2px;
      font-weight: 700;
      margin: 10px 0;
    }
  </style>
</head>
<body>

  <!-- ================= MARCA HERO ================= -->
  <div class="divider-solid-xl"></div>
  <div class="brand-hero">
    <div class="brand-title">ARTEMISA</div>
  </div>
  <div class="divider-solid-xl" style="margin-top: 2px;"></div>

  <!-- ================= INVOICE HIGHLIGHT ================= -->
  <div class="invoice-hero">
    <div class="invoice-label">DOCUMENTO DE VENTA</div>
    <div class="invoice-number"># ${sale.invoice_number}</div>
  </div>

  <!-- ================= METADATA ================= -->
  <div class="data-grid">
    <span class="data-label">FECHA EMISIÓN</span>
    <span class="data-val data-val-mono">${fechaFormateada} &nbsp;${horaFormateada}</span>
  </div>
  <div class="data-grid">
    <span class="data-label">IDENTIFICACIÓN</span>
    <span class="data-val data-val-mono">NIT 1.216.725.990-1</span>
  </div>
  
  ${sale.client ? `
  <div class="divider-dotted"></div>
  <div class="data-grid">
    <span class="data-label">CLIENTE</span>
    <span class="data-val">${sale.client.full_name}</span>
  </div>
  ${sale.client.phone_whatsapp ? `
  <div class="data-grid">
    <span class="data-label">TEL CONTACTO</span>
    <span class="data-val data-val-mono">${sale.client.phone_whatsapp}</span>
  </div>` : ""}
  ${sale.client.city ? `
  <div class="data-grid">
    <span class="data-label">UBICACIÓN</span>
    <span class="data-val">${sale.client.city}</span>
  </div>` : ""}
  ` : ""}

  <!-- ================= ITEMS ================= -->
  <div class="items-header">DETALLE DE LA INVERSIÓN</div>

  ${lineasItems}

  <!-- ================= TOTALES AREA ================= -->
  <div class="total-area">
    <div class="data-grid">
      <span class="data-label">SUBTOTAL [${totalItems} ART]</span>
      <span class="data-val">${formatCOP(sale.subtotal)}</span>
    </div>
    
    ${descuentoValor > 0 ? `
    <div class="data-grid">
      <span class="data-label">${descuentoTexto}</span>
      <span class="data-val">-${formatCOP(descuentoValor)}</span>
    </div>` : ""}
    
    ${sale.shipping_cost > 0 ? `
    <div class="data-grid" style="margin-top:4px;">
      <span class="data-label">LOGÍSTICA / ENVÍO</span>
      <span class="data-val">${formatCOP(sale.shipping_cost)}</span>
    </div>` : ""}
    
    <div class="total-main">
      <span class="total-main-label">TOTAL</span>
      <span class="total-main-val">${formatCOP(sale.total)}</span>
    </div>
  </div>

  <!-- ================= PLAN FINANCIERO (CREDITO) ================= -->
  ${sale.is_credit ? `
  <div class="credit-box">
    <div class="credit-header">PLAN DE FINANCIACIÓN</div>
    <div class="data-grid">
      <span class="data-label">BASE OPERATIVA (${sale.credit_fee_percentage}%)</span>
      <span class="data-val">+${formatCOP(sale.credit_fee_amount)}</span>
    </div>
    <div class="data-grid">
      <span class="data-label">INVERSIÓN FINAL</span>
      <span class="data-val">${formatCOP(sale.total_with_fee)}</span>
    </div>
    ${sale.initial_payment > 0 ? `
    <div class="data-grid">
      <span class="data-label">ANTICIPO RECIBIDO</span>
      <span class="data-val">-${formatCOP(sale.initial_payment)}</span>
    </div>` : ""}
    
    <div class="divider-solid-sm" style="margin: 6px 0;"></div>
    
    <div class="data-grid" style="font-size: 14px;">
      <span class="data-label" style="font-size:12px; font-weight:900;">SALDO VIGENTE</span>
      <span class="data-val" style="font-size:15px; font-weight:900;">${formatCOP(sale.total_with_fee - sale.initial_payment)}</span>
    </div>
    
    ${sale.credit_installments > 0 ? `
    <div class="text-center" style="font-size:9px; font-weight:900; letter-spacing:1px; margin-top:6px; padding:4px; border:1px solid #000;">
      ESTRUCTURADO EN ${sale.credit_installments} CUOTAS
    </div>` : ""}
  </div>
  ` : ""}

  <!-- ================= OPERACIÓN ================= -->
  <div class="divider-dotted"></div>
  <div class="data-grid">
    <span class="data-label">MÉTODO PAGO</span>
    <span class="data-val">${metodoPago}</span>
  </div>
  <div class="data-grid">
    <span class="data-label">CANAL VENTA</span>
    <span class="data-val">${canalVenta}</span>
  </div>
  <div class="data-grid">
    <span class="data-label">ESTADÍA</span>
    <span class="data-val">${estadoLabel}</span>
  </div>

  ${sale.notes ? `
  <div class="divider-dashed"></div>
  <div style="padding:4px 0;">
    <div class="data-label" style="margin-bottom:2px;">NOTAS ADICIONALES:</div>
    <div style="font-size:10px; font-weight:500; line-height:1.4;">${sale.notes}</div>
  </div>` : ""}

  <!-- ================= AUTHENTICITY BADGE ================= -->
  <div class="auth-badge">
    <div class="auth-title">AUTENTICIDAD GARANTIZADA</div>
  </div>

  <!-- ================= FOOTER ================= -->
  <div class="text-center" style="font-weight:900; font-size:13px; letter-spacing:2px; margin: 12px 0;">
    GRACIAS POR SU<br>PREFERENCIA
  </div>

  <div class="text-center font-mono" style="font-size:10px; font-weight:700; margin-bottom:12px;">
    WWW.CASAARTEMISA.STORE<br>
    IG @CASAARTEMISA__
  </div>

  <!-- Fake Barcode for aesthetic -->
  <div class="barcode-art">
    ||| ||||| ||| | || ||||| || ||| |
  </div>
  
  <div class="footer-stamp">
    SISTEMA MIDAS \u00B7 PRO CESADO
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
    window.onafterprint = function() {
      window.close();
    };
  </script>
</body>
</html>`
}

/**
 * Función exportada para imprimir un recibo desde cualquier lugar.
 * Abre una ventana nueva con el HTML del recibo y dispara window.print().
 */
export function printReceipt(sale: SaleExpanded): void {
  const html = generarHTMLRecibo(sale)

  const ventanaImpresion = window.open("", "_blank", "width=340,height=700")
  if (!ventanaImpresion) {
    // Fallback con iframe oculto
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 2000)
      }, 500)
    }
    return
  }

  ventanaImpresion.document.open()
  ventanaImpresion.document.write(html)
  ventanaImpresion.document.close()
}

/**
 * Vista previa del recibo térmico en pantalla.
 * El preview refleja la estructura de "Alta Costura" del HTML impreso, 
 * usando puro TailwindCSS para una previsualización idéntica.
 */
const ReciboTermico = forwardRef<ReciboTermicoRef, ReciboTermicoProps>(
  function ReciboTermico({ sale, showPreview = true }, ref) {
    const imprimir = useCallback(() => {
      printReceipt(sale)
    }, [sale])

    useImperativeHandle(ref, () => ({ imprimir }))

    if (!showPreview) return null

    const fechaObj = new Date(sale.sale_date || sale.created_at)
    const fechaFormateada = format(fechaObj, "dd.MM.yy", { locale: es })
    const horaFormateada = format(fechaObj, "HH:mm", { locale: es })
    const metodoPago = PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method
    const canalVenta = SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
    const estadoLabel = SALE_STATUS_CONFIG[sale.status]?.label || sale.status

    let descuentoTexto = ""
    let descuentoValor = 0
    if (sale.discount_value && sale.discount_value > 0) {
      if (sale.discount_type === "percentage") {
        descuentoValor = Math.round(sale.subtotal * (sale.discount_value / 100))
        descuentoTexto = `BENEFICIO (${sale.discount_value}%)`
      } else {
        descuentoValor = sale.discount_value
        descuentoTexto = "BENEFICIO"
      }
    }

    const totalItems = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0)

    return (
      <div
        className="mx-auto bg-white text-black shadow-2xl border border-gray-300 uppercase select-none"
        style={{
          width: 302,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          lineHeight: 1.3,
          padding: '16px 8px'
        }}
      >
        {/* ================= MARCA HERO ================= */}
        <div className="border-t-[4px] border-black my-2" />
        <div className="text-center py-2.5">
          <div className="font-black text-[36px] tracking-[6px] leading-none mb-1">ARTEMISA</div>
        </div>
        <div className="border-t-[4px] border-black my-2 mt-0.5" />

        {/* ================= INVOICE HIGHLIGHT ================= */}
        <div className="text-center py-2.5 my-3 border-y border-black">
          <div className="text-[10px] tracking-[4px] font-bold mb-1">DOCUMENTO DE VENTA</div>
          <div className="font-mono text-[24px] font-bold tracking-[2px]"># {sale.invoice_number}</div>
        </div>

        {/* ================= METADATA ================= */}
        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-[10px] tracking-[1px]">FECHA EMISIÓN</span>
          <span className="font-mono font-bold text-[12px] text-right">{fechaFormateada} &nbsp;{horaFormateada}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-[10px] tracking-[1px]">IDENTIFICACIÓN</span>
          <span className="font-mono font-bold text-[12px] text-right">NIT 1.216.725.990-1</span>
        </div>

        {sale.client && (
          <>
            <div className="border-t border-dotted border-black my-1.5" />
            <div className="flex justify-between items-baseline py-1">
              <span className="font-bold text-[10px] tracking-[1px]">CLIENTE</span>
              <span className="font-black text-[11px] text-right">{sale.client.full_name}</span>
            </div>
            {sale.client.phone_whatsapp && (
              <div className="flex justify-between items-baseline py-1">
                <span className="font-bold text-[10px] tracking-[1px]">TEL CONTACTO</span>
                <span className="font-mono font-bold text-[12px] text-right">{sale.client.phone_whatsapp}</span>
              </div>
            )}
            {sale.client.city && (
              <div className="flex justify-between items-baseline py-1">
                <span className="font-bold text-[10px] tracking-[1px]">UBICACIÓN</span>
                <span className="font-black text-[11px] text-right">{sale.client.city}</span>
              </div>
            )}
          </>
        )}

        {/* ================= ITEMS ================= */}
        <div className="bg-black text-white text-[9px] font-bold tracking-[4px] text-center py-1 mt-3 mb-1.5">
          DETALLE DE LA INVERSIÓN
        </div>

        <div className="pb-1">
          {(sale.items || []).map((item, idx) => {
            const nombreProducto = item.variant?.product?.name || "PRODUCTO"
            const detalles = [item.variant?.color, item.variant?.size, item.variant?.cut]
              .filter(Boolean).join(" · ")

            return (
              <div key={item.id || idx} className="py-1.5 border-b border-dashed border-black last:border-b-0">
                <div className="font-black text-[12px] tracking-[0.5px]">
                  {nombreProducto}
                </div>
                {detalles && (
                  <div className="text-[9px] font-medium mt-0.5 tracking-[1px]">{detalles}</div>
                )}
                <div className="flex justify-between items-baseline mt-1">
                  <span className="font-mono font-bold text-[10px]">{item.quantity} &nbsp;X&nbsp; {formatCOP(item.unit_price)}</span>
                  <span className="font-black text-[13px]">{formatCOP(item.subtotal)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ================= TOTALES AREA ================= */}
        <div className="mt-3">
          <div className="flex justify-between items-baseline py-1">
            <span className="font-bold text-[10px] tracking-[1px]">SUBTOTAL [{totalItems} ART]</span>
            <span className="font-black text-[11px] text-right">{formatCOP(sale.subtotal)}</span>
          </div>

          {descuentoValor > 0 && (
            <div className="flex justify-between items-baseline py-1">
              <span className="font-bold text-[10px] tracking-[1px]">{descuentoTexto}</span>
              <span className="font-black text-[11px] text-right">-{formatCOP(descuentoValor)}</span>
            </div>
          )}

          {sale.shipping_cost > 0 && (
            <div className="flex justify-between items-baseline py-1 mt-1">
              <span className="font-bold text-[10px] tracking-[1px]">LOGÍSTICA / ENVÍO</span>
              <span className="font-black text-[11px] text-right">{formatCOP(sale.shipping_cost)}</span>
            </div>
          )}

          <div className="bg-black text-white px-2.5 py-3 my-3 flex justify-between items-center">
            <span className="text-[16px] font-black tracking-[2px]">TOTAL</span>
            <span className="text-[22px] font-black tracking-[-0.5px]">{formatCOP(sale.total)}</span>
          </div>
        </div>

        {/* ================= PLAN FINANCIERO ================= */}
        {sale.is_credit && (
          <div className="border-[3px] border-black p-1.5 my-3">
            <div className="bg-black text-white text-center font-black text-[11px] tracking-[3px] py-1 mb-2">
              PLAN DE FINANCIACIÓN
            </div>

            <div className="flex justify-between items-baseline py-1">
              <span className="font-bold text-[10px] tracking-[1px]">BASE OPERATIVA ({sale.credit_fee_percentage}%)</span>
              <span className="font-black text-[11px] text-right">+{formatCOP(sale.credit_fee_amount)}</span>
            </div>

            <div className="flex justify-between items-baseline py-1">
              <span className="font-bold text-[10px] tracking-[1px]">INVERSIÓN FINAL</span>
              <span className="font-black text-[11px] text-right">{formatCOP(sale.total_with_fee)}</span>
            </div>

            {sale.initial_payment > 0 && (
              <div className="flex justify-between items-baseline py-1">
                <span className="font-bold text-[10px] tracking-[1px]">ANTICIPO RECIBIDO</span>
                <span className="font-black text-[11px] text-right">-{formatCOP(sale.initial_payment)}</span>
              </div>
            )}

            <div className="border-t border-black my-1.5" />

            <div className="flex justify-between items-baseline py-1">
              <span className="font-black text-[12px]">SALDO VIGENTE</span>
              <span className="font-black text-[15px]">{formatCOP(sale.total_with_fee - sale.initial_payment)}</span>
            </div>

            {sale.credit_installments > 0 && (
              <div className="text-center text-[9px] font-black tracking-[1px] mt-1.5 p-1 border border-black">
                ESTRUCTURADO EN {sale.credit_installments} CUOTAS
              </div>
            )}
          </div>
        )}

        {/* ================= OPERACIÓN ================= */}
        <div className="border-t border-dotted border-black my-1.5" />
        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-[10px] tracking-[1px]">MÉTODO PAGO</span>
          <span className="font-black text-[11px] text-right">{metodoPago}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-[10px] tracking-[1px]">CANAL VENTA</span>
          <span className="font-black text-[11px] text-right">{canalVenta}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-[10px] tracking-[1px]">ESTADÍA</span>
          <span className="font-black text-[11px] text-right">{estadoLabel}</span>
        </div>

        {sale.notes && (
          <>
            <div className="border-t border-dashed border-black my-1.5" />
            <div className="py-1">
              <div className="font-bold text-[10px] tracking-[1px] mb-0.5">NOTAS ADICIONALES:</div>
              <div className="text-[10px] font-medium leading-[1.4]">{sale.notes}</div>
            </div>
          </>
        )}

        {/* ================= AUTHENTICITY BADGE ================= */}
        <div className="border-[3px] border-black p-3 text-center my-4">
          <div className="font-black text-[13px] tracking-[4px]">AUTENTICIDAD GARANTIZADA</div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="text-center font-black text-[13px] tracking-[2px] my-3">
          GRACIAS POR SU<br />PREFERENCIA
        </div>

        <div className="text-center font-mono text-[10px] font-bold mb-3">
          WWW.CASAARTEMISA.STORE<br />
          IG @CASAARTEMISA__
        </div>

        <div className="font-mono text-center text-[14px] font-bold tracking-[2px] my-2.5">
          ||| ||||| ||| | || ||||| || ||| |
        </div>

        <div className="font-mono text-center text-[9px] tracking-[4px] mt-4 pt-2 border-t border-black">
          SISTEMA MIDAS · PRO CESADO
        </div>
      </div>
    )
  }
)

export { ReciboTermico }
export type { SaleExpanded, SaleItemExpanded }
