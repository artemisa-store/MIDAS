"use client"

import type { SaleExpanded } from "./recibo-termico"
import { formatCOP } from "@/lib/format"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PAYMENT_METHODS, SALE_CHANNELS, SALE_STATUS_CONFIG } from "@/lib/constants"

/**
 * Genera el HTML completo de la factura A4 con diseño premium.
 * Se abre en una nueva ventana del navegador para renderizado perfecto
 * (fuentes, colores, gradientes, todo funciona nativo).
 */
function generarHTMLFacturaA4(sale: SaleExpanded): string {
  const fechaObj = new Date(sale.sale_date || sale.created_at)
  const fechaFormateada = format(fechaObj, "d 'de' MMMM 'de' yyyy", { locale: es })
  const horaFormateada = format(fechaObj, "h:mm a", { locale: es })

  const metodoPago =
    PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method
  const canalVenta =
    SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
  const estadoLabel = SALE_STATUS_CONFIG[sale.status]?.label || sale.status

  let descuentoTexto = ""
  let descuentoValor = 0
  if (sale.discount_value && sale.discount_value > 0) {
    if (sale.discount_type === "percentage") {
      descuentoValor = Math.round(sale.subtotal * (sale.discount_value / 100))
      descuentoTexto = `Descuento (${sale.discount_value}%)`
    } else {
      descuentoValor = sale.discount_value
      descuentoTexto = "Descuento"
    }
  }

  const totalItems = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0)

  const filasProductos = (sale.items || [])
    .map((item, idx) => {
      const nombre = item.variant?.product?.name || "Producto"
      const detalles = [item.variant?.color, item.variant?.size, item.variant?.cut]
        .filter(Boolean)
        .join(" \u00B7 ")
      const bgColor = idx % 2 === 0 ? "#F9F7F2" : "#FFFFFF"

      return `
        <tr style="background:${bgColor};">
          <td class="td-prod">
            <strong>${nombre}</strong>
            ${detalles ? `<div class="prod-detail">${detalles}</div>` : ""}
          </td>
          <td class="td-center">${item.quantity}</td>
          <td class="td-right muted">${formatCOP(item.unit_price)}</td>
          <td class="td-right bold">${formatCOP(item.subtotal)}</td>
        </tr>
      `
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${sale.invoice_number} - Casa Artemisa</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      html, body { margin: 0; padding: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { margin-top: 0 !important; }
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      color: #1A1A1A;
      background: #F5F0E6;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .page-content {
      flex: 1;
      overflow: hidden;
    }

    /* ── Barra superior dorada ── */
    .gold-bar {
      height: 6px;
      background: linear-gradient(90deg, #B8923E, #C9A55C, #E8D5A8, #C9A55C, #B8923E);
    }

    /* ── Header ── */
    .header {
      padding: 24px 40px 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 30px;
      font-weight: 700;
      color: #C9A55C;
      letter-spacing: 4px;
      line-height: 1;
    }
    .brand-sub {
      font-size: 10px;
      color: #9A9488;
      letter-spacing: 3px;
      font-weight: 500;
      margin-top: 5px;
    }
    .brand-nit {
      font-size: 9px;
      color: #B0A99A;
      margin-top: 2px;
    }

    /* ── Factura badge ── */
    .invoice-badge {
      background: #0A0A0A;
      color: #FFFFFF;
      padding: 10px 24px;
      border-radius: 8px;
      text-align: center;
      min-width: 160px;
    }
    .invoice-badge-label {
      font-size: 9px;
      letter-spacing: 3px;
      color: #C9A55C;
      font-weight: 600;
    }
    .invoice-badge-number {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .invoice-date {
      text-align: right;
      font-size: 11px;
      color: #9A9488;
      margin-top: 6px;
    }

    /* ── Separador ── */
    .separator {
      margin: 14px 40px;
      height: 1px;
      background: #E8E3D8;
    }

    /* ── Cards de info ── */
    .info-row {
      display: flex;
      gap: 16px;
      padding: 0 40px;
      margin-bottom: 14px;
    }
    .info-card {
      flex: 1;
      background: #FAFAF7;
      border: 1px solid #EEEADE;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 2.5px;
      color: #C9A55C;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .info-name {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .info-detail {
      font-size: 11px;
      color: #7A7468;
      line-height: 1.5;
    }
    .info-flex {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 2px 0;
    }
    .info-flex-label { color: #7A7468; }
    .info-flex-value { font-weight: 600; }
    .status-paid { color: #059669; }
    .status-pending { color: #D97706; }

    /* ── Notas ── */
    .notes-box {
      margin: 0 40px 12px;
      background: #FFF9ED;
      border: 1px solid #E8D5A8;
      border-left: 3px solid #C9A55C;
      border-radius: 0 8px 8px 0;
      padding: 10px 16px;
    }
    .notes-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #C9A55C;
      margin-bottom: 3px;
    }
    .notes-text { font-size: 11px; color: #1A1A1A; }

    /* ── Tabla de productos ── */
    .products-table {
      margin: 0 40px;
      width: calc(100% - 80px);
      border-collapse: collapse;
      font-size: 12px;
    }
    .products-table thead tr {
      background: #0A0A0A;
    }
    .products-table th {
      padding: 8px 12px;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #C9A55C;
      text-transform: uppercase;
    }
    .products-table th:first-child { text-align: left; border-radius: 6px 0 0 0; }
    .products-table th:last-child { border-radius: 0 6px 0 0; }
    .td-prod { padding: 7px 12px; border-bottom: 1px solid #EEEADE; }
    .td-center { padding: 7px 12px; text-align: center; border-bottom: 1px solid #EEEADE; }
    .td-right { padding: 7px 12px; text-align: right; border-bottom: 1px solid #EEEADE; }
    .prod-detail { font-size: 10px; color: #9A9488; margin-top: 1px; }
    .muted { color: #7A7468; }
    .bold { font-weight: 600; }

    /* ── Resumen financiero ── */
    .summary {
      margin: 12px 40px 0;
      display: flex;
      justify-content: flex-end;
    }
    .summary-box { width: 280px; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 12px;
    }
    .summary-row .label { color: #7A7468; }
    .summary-row .value { font-weight: 500; }
    .summary-row .discount { color: #DC2626; }

    /* ── Total ── */
    .total-box {
      margin: 10px 40px 0;
      display: flex;
      justify-content: flex-end;
    }
    .total-inner {
      background: #0A0A0A;
      border-radius: 8px;
      padding: 12px 24px;
      display: flex;
      align-items: baseline;
      gap: 20px;
      min-width: 280px;
      justify-content: space-between;
    }
    .total-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #FFFFFF;
    }
    .total-amount {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #C9A55C;
    }

    /* ── Footer ── */
    .footer {
      margin-top: auto;
    }
    .footer-content {
      padding: 14px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-thanks {
      font-size: 14px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 2px;
    }
    .footer-dream {
      font-size: 11px;
      color: #9A9488;
      font-style: italic;
    }
    .footer-right {
      text-align: right;
    }
    .footer-social {
      font-size: 10px;
      color: #7A7468;
    }
    .footer-social b { color: #C9A55C; font-weight: 600; }
    .footer-powered {
      font-size: 8px;
      color: #B0A99A;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
    .footer-bar {
      height: 4px;
      background: linear-gradient(90deg, #B8923E, #C9A55C, #E8D5A8, #C9A55C, #B8923E);
    }

    /* ── Botón de descarga (no se imprime) ── */
    .download-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #0A0A0A;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    }
    .download-btn {
      background: #C9A55C;
      color: #FFFFFF;
      border: none;
      padding: 10px 28px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      letter-spacing: 0.5px;
    }
    .download-btn:hover { background: #B8923E; }
    .download-text { color: #9A9488; font-size: 13px; }
  </style>
</head>
<body>

  <!-- Barra de descarga (solo en pantalla) -->
  <div class="download-bar no-print">
    <span class="download-text">Factura ${sale.invoice_number}</span>
    <button class="download-btn" onclick="window.print()">
      Descargar PDF / Imprimir
    </button>
  </div>

  <div class="page" style="margin-top:52px;">

    <!-- Barra dorada superior -->
    <div class="gold-bar"></div>

    <div class="page-content">

    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-name">CASA ARTEMISA</div>
        <div class="brand-sub">MEDELL\u00CDN &middot; BAJO CAUCA</div>
        <div class="brand-nit">NIT: 1.216.725.990-1</div>
      </div>
      <div>
        <div class="invoice-badge">
          <div class="invoice-badge-label">FACTURA</div>
          <div class="invoice-badge-number">${sale.invoice_number}</div>
        </div>
        <div class="invoice-date">
          ${fechaFormateada}<br>${horaFormateada}
        </div>
      </div>
    </div>

    <div class="separator"></div>

    <!-- Info Cliente + Venta -->
    <div class="info-row">
      <div class="info-card">
        <div class="info-label">Cliente</div>
        <div class="info-name">${sale.client?.full_name || "Consumidor final"}</div>
        <div class="info-detail">
          ${sale.client?.phone_whatsapp ? `Tel: ${sale.client.phone_whatsapp}<br>` : ""}
          ${sale.client?.email ? `${sale.client.email}<br>` : ""}
          ${sale.client?.address ? `${sale.client.address}${sale.client.city ? `, ${sale.client.city}` : ""}` : ""}
        </div>
      </div>
      <div class="info-card">
        <div class="info-label">Detalles de venta</div>
        <div class="info-flex">
          <span class="info-flex-label">M\u00E9todo de pago</span>
          <span class="info-flex-value">${metodoPago}</span>
        </div>
        <div class="info-flex">
          <span class="info-flex-label">Canal de venta</span>
          <span class="info-flex-value">${canalVenta}</span>
        </div>
        <div class="info-flex">
          <span class="info-flex-label">Estado</span>
          <span class="info-flex-value ${sale.status === "paid" || sale.status === "delivered" ? "status-paid" : "status-pending"}">${estadoLabel}</span>
        </div>
      </div>
    </div>

    ${sale.notes ? `
    <!-- Notas / Dirección -->
    <div class="notes-box">
      <div class="notes-label">DIRECCI\u00D3N / NOTAS</div>
      <div class="notes-text">${sale.notes}</div>
    </div>
    ` : ""}

    <!-- Tabla de productos -->
    <table class="products-table">
      <thead>
        <tr>
          <th style="text-align:left;">Producto</th>
          <th style="text-align:center;">Cant.</th>
          <th style="text-align:right;">Precio</th>
          <th style="text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${filasProductos}
      </tbody>
    </table>

    <!-- Resumen -->
    <div class="summary">
      <div class="summary-box">
        <div class="summary-row">
          <span class="label">Subtotal (${totalItems} art.)</span>
          <span class="value">${formatCOP(sale.subtotal)}</span>
        </div>
        ${descuentoValor > 0 ? `
        <div class="summary-row">
          <span class="label">${descuentoTexto}</span>
          <span class="value discount">-${formatCOP(descuentoValor)}</span>
        </div>` : ""}
        ${sale.shipping_cost > 0 ? `
        <div class="summary-row">
          <span class="label">Env\u00EDo</span>
          <span class="value">${formatCOP(sale.shipping_cost)}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Total -->
    <div class="total-box">
      <div class="total-inner">
        <span class="total-label">TOTAL</span>
        <span class="total-amount">${formatCOP(sale.total)}</span>
      </div>
    </div>

    ${sale.is_credit ? `
    <!-- Información de Crédito -->
    <div style="margin:8px 40px 0;display:flex;justify-content:flex-end;">
      <div style="width:280px;background:#FFF9ED;border:1px solid #E8D5A8;border-left:3px solid #D97706;border-radius:0 6px 6px 0;padding:10px 14px;">
        <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#D97706;margin-bottom:6px;">VENTA A CR\u00C9DITO</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
          <span style="color:#7A7468;">Comisi\u00F3n (${sale.credit_fee_percentage}%)</span>
          <span style="font-weight:600;color:#D97706;">+${formatCOP(sale.credit_fee_amount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;font-weight:700;">
          <span>Total con comisi\u00F3n</span>
          <span>${formatCOP(sale.total_with_fee)}</span>
        </div>
        ${sale.initial_payment > 0 ? `
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
          <span style="color:#7A7468;">Abono inicial</span>
          <span style="font-weight:600;color:#059669;">-${formatCOP(sale.initial_payment)}</span>
        </div>` : ""}
        <div style="border-top:1px solid #E8D5A8;margin-top:3px;padding-top:4px;display:flex;justify-content:space-between;font-size:13px;font-weight:800;">
          <span style="color:#DC2626;">Saldo pendiente</span>
          <span style="color:#DC2626;">${formatCOP(sale.total_with_fee - sale.initial_payment)}</span>
        </div>
        ${sale.credit_installments > 0 ? `
        <div style="font-size:10px;color:#7A7468;margin-top:2px;text-align:right;">
          ${sale.credit_installments} cuota(s)
        </div>` : ""}
      </div>
    </div>
    ` : ""}

    </div><!-- /page-content -->

    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div>
          <div class="footer-thanks">\u00A1Gracias por tu compra!</div>
          <div class="footer-dream">Recuerda siempre so\u00F1ar</div>
        </div>
        <div class="footer-right">
          <div class="footer-social">
            <b>IG</b> @casaartemisa__ &nbsp;|&nbsp; <b>Web</b> casaartemisa.store
          </div>
          <div class="footer-powered">Powered by MIDAS</div>
        </div>
      </div>
      <div class="footer-bar"></div>
    </div>

  </div>

  <script>
    window.onbeforeprint = function() {
      document.querySelector('.page').style.marginTop = '0';
    };
    window.onafterprint = function() {
      document.querySelector('.page').style.marginTop = '52px';
    };
  </script>
</body>
</html>`
}

/**
 * Abre la factura en una nueva ventana con diseño premium.
 * El navegador renderiza todo perfectamente (fuentes, gradientes, colores).
 * El usuario puede guardar como PDF desde el botón o Ctrl+P.
 */
export async function downloadInvoicePDF(sale: SaleExpanded): Promise<void> {
  const html = generarHTMLFacturaA4(sale)

  const ventana = window.open("", "_blank", "width=900,height=1100")
  if (!ventana) {
    // Fallback: abrir como blob URL
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
    return
  }

  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
}

/**
 * Genera la factura como PDF base64 para enviar por email.
 * Usa html2canvas + jsPDF como fallback para generar el archivo.
 */
export async function generateInvoicePDFBase64(sale: SaleExpanded): Promise<string> {
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])
  const html2canvas = html2canvasModule.default
  const { jsPDF } = jsPDFModule

  // Para el base64, usamos html2canvas con fuentes del sistema
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.left = "-9999px"
  container.style.top = "0"
  container.style.width = "794px"
  container.style.minHeight = "1123px"
  container.style.background = "#FFFFFF"
  container.style.fontFamily = "'Segoe UI', -apple-system, Arial, sans-serif"

  // Versión simplificada del HTML para html2canvas (sin Google Fonts)
  const simpleHTML = generarHTMLFacturaA4(sale)
    .replace(/<!DOCTYPE html>[\s\S]*?<body>/, "")
    .replace(/<\/body>[\s\S]*?<\/html>/, "")
    .replace(/<link[^>]*googleapis[^>]*>/g, "")
    .replace(/font-family:\s*'Inter'[^;]*/g, "font-family: 'Segoe UI', Arial, sans-serif")
    .replace(/font-family:\s*'Space Grotesk'[^;]*/g, "font-family: 'Segoe UI', Arial, sans-serif")
    .replace(/class="download-bar no-print"[\s\S]*?<\/div>/, "")
    .replace(/style="margin-top:52px;"/, "")
    .replace(/<script>[\s\S]*?<\/script>/, "")

  container.innerHTML = simpleHTML
  document.body.appendChild(container)

  await new Promise((r) => setTimeout(r, 300))

  const canvas = await html2canvas(container, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#FFFFFF",
    width: 794,
    windowWidth: 794,
  })

  document.body.removeChild(container)

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const imgData = canvas.toDataURL("image/png")
  const pdfWidth = 210
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)

  return pdf.output("datauristring").split(",")[1]
}

/**
 * Genera el HTML del email bonito para enviar al cliente.
 */
export function generarHTMLEmail(sale: SaleExpanded): string {
  const fechaObj = new Date(sale.sale_date || sale.created_at)
  const fechaFormateada = format(fechaObj, "d 'de' MMMM 'de' yyyy", { locale: es })
  const metodoPago =
    PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method

  const listaItems = (sale.items || [])
    .map((item) => {
      const nombre = item.variant?.product?.name || "Producto"
      const detalles = [item.variant?.color, item.variant?.size, item.variant?.cut]
        .filter(Boolean)
        .join(" \u00B7 ")
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #F0EBE0;font-size:14px;">
            <strong>${nombre}</strong>
            ${detalles ? `<br><span style="font-size:12px;color:#8A8478;">${detalles}</span>` : ""}
          </td>
          <td style="padding:10px 16px;text-align:center;border-bottom:1px solid #F0EBE0;font-size:14px;">
            ${item.quantity}
          </td>
          <td style="padding:10px 16px;text-align:right;border-bottom:1px solid #F0EBE0;font-size:14px;font-weight:600;">
            ${formatCOP(item.subtotal)}
          </td>
        </tr>
      `
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5F0E6;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0A0A0A;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#C9A55C;letter-spacing:4px;">CASA ARTEMISA</div>
              <div style="font-size:12px;color:#8A8478;letter-spacing:2px;margin-top:6px;">MEDELL\u00CDN &middot; BAJO CAUCA</div>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;padding:40px;">
              <div style="font-size:20px;font-weight:700;color:#1A1A1A;margin-bottom:6px;">
                \u00A1Hola, ${sale.client?.full_name?.split(" ")[0] || ""}!
              </div>
              <div style="font-size:15px;color:#6B6B6B;margin-bottom:24px;line-height:1.6;">
                Gracias por tu compra. Adjuntamos tu factura <strong style="color:#C9A55C;">${sale.invoice_number}</strong> con todos los detalles.
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F0;border-radius:10px;margin-bottom:24px;border:1px solid #E8E3D8;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#C9A55C;margin-bottom:6px;">RESUMEN</div>
                    <div style="font-size:13px;color:#6B6B6B;margin-bottom:4px;">${fechaFormateada}</div>
                    <div style="font-size:13px;color:#6B6B6B;">Pago: ${metodoPago}</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <thead>
                  <tr style="background:#1A1A1A;">
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:1px;color:#C9A55C;">PRODUCTO</th>
                    <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;letter-spacing:1px;color:#C9A55C;">CANT.</th>
                    <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;letter-spacing:1px;color:#C9A55C;">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>${listaItems}</tbody>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #C9A55C;">
                <tr>
                  <td style="padding:16px 0;text-align:right;">
                    <span style="font-size:14px;font-weight:600;color:#6B6B6B;margin-right:16px;">TOTAL</span>
                    <span style="font-size:26px;font-weight:700;color:#C9A55C;">${formatCOP(sale.total)}</span>
                  </td>
                </tr>
              </table>
              ${sale.is_credit ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF9ED;border:1px solid #E8D5A8;border-radius:8px;margin-bottom:16px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#D97706;margin-bottom:8px;">VENTA A CR\u00C9DITO</div>
                    <div style="font-size:13px;color:#6B6B6B;margin-bottom:4px;">
                      Comisi\u00F3n (${sale.credit_fee_percentage}%): <strong style="color:#D97706;">+${formatCOP(sale.credit_fee_amount)}</strong>
                    </div>
                    <div style="font-size:14px;font-weight:700;margin-bottom:4px;">
                      Total con comisi\u00F3n: ${formatCOP(sale.total_with_fee)}
                    </div>
                    ${sale.initial_payment > 0 ? `
                    <div style="font-size:13px;color:#059669;margin-bottom:4px;">
                      Abono inicial: -${formatCOP(sale.initial_payment)}
                    </div>` : ""}
                    <div style="border-top:1px solid #E8D5A8;padding-top:8px;margin-top:4px;font-size:16px;font-weight:800;color:#DC2626;">
                      Saldo pendiente: ${formatCOP(sale.total_with_fee - sale.initial_payment)}
                    </div>
                  </td>
                </tr>
              </table>
              ` : ""}
              <div style="text-align:center;padding:24px 0 8px;border-top:1px solid #F0EBE0;">
                <div style="font-size:16px;font-weight:700;color:#1A1A1A;margin-bottom:4px;">Recuerda siempre so\u00F1ar</div>
                <div style="font-size:13px;color:#8A8478;">Tu factura en PDF est\u00E1 adjunta a este correo.</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0A0A0A;padding:24px 40px;border-radius:0 0 12px 12px;text-align:center;">
              <div style="font-size:13px;color:#8A8478;margin-bottom:8px;">
                <span style="color:#C9A55C;">IG</span> @casaartemisa__ &nbsp;|&nbsp; <span style="color:#C9A55C;">Web</span> casaartemisa.store
              </div>
              <div style="font-size:10px;color:#555;letter-spacing:0.5px;">NIT: 1.216.725.990-1 &middot; Powered by MIDAS</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
