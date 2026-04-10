import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { from, to, subject, body } = await request.json()

    // Validaciones
    if (!from || !to || !subject || !body) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(from) || !emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Direcciones de correo inválidas' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'La API Key de Resend no está configurada' },
        { status: 500 }
      )
    }

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text: body,
    })

    if (error) {
      console.error('Error de Resend:', error)
      return NextResponse.json(
        { error: error.message || 'Error al enviar el correo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Error en el servidor:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
