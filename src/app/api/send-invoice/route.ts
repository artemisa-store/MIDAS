import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no está configurada. Agrega tu API key en .env.local" },
      { status: 500 }
    )
  }

  const resend = new Resend(apiKey)

  try {
    const body = await request.json()
    const { to, invoiceNumber, clientName, pdfBase64, emailHtml } = body

    if (!to || !invoiceNumber || !pdfBase64 || !emailHtml) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: to, invoiceNumber, pdfBase64, emailHtml" },
        { status: 400 }
      )
    }

    const { data, error } = await resend.emails.send({
      from: "Casa Artemisa <facturacion@casaartemisa.store>",
      to: [to],
      subject: `Tu factura de Casa Artemisa - ${invoiceNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Factura_${invoiceNumber.replace(/\s/g, "_")}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    })

    if (error) {
      console.error("Error enviando email:", error)
      return NextResponse.json(
        { error: error.message || "Error al enviar el email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error("Error en send-invoice:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
