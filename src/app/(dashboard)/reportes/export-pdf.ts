import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

/**
 * Exporta el contenido de un div como PDF branded.
 * Captura el DOM con html2canvas y lo compone en un PDF A4 landscape
 * con header CASA ARTEMISA dorado y footer en cada pagina.
 */
export async function exportReportPDF(
  element: HTMLElement,
  title: string,
  period: string
): Promise<void> {

  // Capturar el DOM como canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FFFFFF",
    logging: false,
    allowTaint: true,
  })

  const imgWidth = canvas.width
  const imgHeight = canvas.height

  // PDF A4 landscape
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageW = pdf.internal.pageSize.getWidth()   // 297mm
  const pageH = pdf.internal.pageSize.getHeight()   // 210mm
  const margin = 12
  const headerH = 22
  const footerH = 12
  const contentW = pageW - margin * 2
  const contentH = pageH - margin - headerH - footerH

  // Escalar imagen al ancho disponible
  const scale = contentW / (imgWidth / 2)  // /2 porque scale=2
  const scaledH = (imgHeight / 2) * scale

  // Calcular cuantas paginas necesitamos
  const totalPages = Math.max(1, Math.ceil(scaledH / contentH))

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage()

    // Header — fondo negro
    pdf.setFillColor(10, 10, 10)
    pdf.rect(0, 0, pageW, headerH, "F")

    // Linea dorada bajo header
    pdf.setFillColor(201, 165, 92)
    pdf.rect(0, headerH, pageW, 1, "F")

    // Texto header
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.setTextColor(201, 165, 92)
    pdf.text("CASA ARTEMISA", margin, 10)

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(153, 153, 153)
    pdf.text(title, margin, 17)

    pdf.setFontSize(9)
    pdf.setTextColor(201, 165, 92)
    pdf.text(period, pageW - margin, 10, { align: "right" })

    pdf.setFontSize(7)
    pdf.setTextColor(153, 153, 153)
    pdf.text(
      `Generado: ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}`,
      pageW - margin, 17, { align: "right" }
    )

    // Contenido — clip de la imagen para esta pagina
    const srcY = page * contentH / scale * 2  // posicion en canvas original
    const srcH = Math.min(contentH / scale * 2, imgHeight - srcY)

    if (srcH > 0) {
      // Crear canvas recortado para esta pagina
      const pageCanvas = document.createElement("canvas")
      pageCanvas.width = imgWidth
      pageCanvas.height = srcH
      const ctx = pageCanvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH)
        const pageImgData = pageCanvas.toDataURL("image/png")
        const drawH = (srcH / 2) * scale
        pdf.addImage(pageImgData, "PNG", margin, headerH + 3, contentW, drawH)
      }
    }

    // Footer
    const footerY = pageH - footerH + 4

    // Linea dorada
    pdf.setFillColor(201, 165, 92)
    pdf.rect(margin, footerY - 3, contentW, 0.5, "F")

    pdf.setFont("helvetica", "italic")
    pdf.setFontSize(7)
    pdf.setTextColor(153, 153, 153)
    pdf.text("Casa Artemisa · Colombian Streetwear · MIDAS", margin, footerY + 1)
    pdf.text(
      `Pagina ${page + 1} de ${totalPages} · Confidencial`,
      pageW - margin, footerY + 1, { align: "right" }
    )
  }

  const today = new Date().toISOString().split("T")[0]
  pdf.save(`Reporte_${title.replace(/\s+/g, "_")}_MIDAS_${today}.pdf`)
}
