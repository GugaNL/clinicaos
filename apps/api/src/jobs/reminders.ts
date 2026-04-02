import { prisma } from '../lib/prisma'
import { sendWhatsApp } from '../lib/whatsapp'
import { format, addHours, startOfHour, endOfHour } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function sendAppointmentReminders() {
  const now = new Date()

  // Lembretes 24h antes
  const in24h = addHours(now, 24)
  const appointments24h = await prisma.appointment.findMany({
    where: {
      startsAt: {
        gte: startOfHour(in24h),
        lte: endOfHour(in24h),
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      patient: true,
      doctor: true,
      clinic: true,
    },
  })

  for (const apt of appointments24h) {
    if (!apt.patient.phone) continue
    const date = format(apt.startsAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    const message = `Olá, ${apt.patient.name}! 👋\n\nLembramos que você tem uma consulta marcada:\n\n📅 *${date}*\n👨‍⚕️ Dr(a). ${apt.doctor.name}\n🏥 ${apt.clinic.name}\n\nCaso precise remarcar, entre em contato conosco.\n\nAté logo! 😊`
    try {
      await sendWhatsApp(apt.patient.phone, message)
      await prisma.reminder.create({
        data: {
          appointmentId: apt.id,
          channel: 'WHATSAPP',
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch {
      await prisma.reminder.create({
        data: {
          appointmentId: apt.id,
          channel: 'WHATSAPP',
          status: 'FAILED',
        },
      })
    }
  }

  // Lembretes 2h antes
  const in2h = addHours(now, 2)
  const appointments2h = await prisma.appointment.findMany({
    where: {
      startsAt: {
        gte: startOfHour(in2h),
        lte: endOfHour(in2h),
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      patient: true,
      doctor: true,
      clinic: true,
    },
  })

  for (const apt of appointments2h) {
    if (!apt.patient.phone) continue
    const date = format(apt.startsAt, "HH:mm", { locale: ptBR })
    const message = `Olá, ${apt.patient.name}! ⏰\n\nSua consulta é *hoje às ${date}*!\n\n👨‍⚕️ Dr(a). ${apt.doctor.name}\n🏥 ${apt.clinic.name}\n\nEstamos te esperando! 😊`
    try {
      await sendWhatsApp(apt.patient.phone, message)
      await prisma.reminder.create({
        data: {
          appointmentId: apt.id,
          channel: 'WHATSAPP',
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch {
      await prisma.reminder.create({
        data: {
          appointmentId: apt.id,
          channel: 'WHATSAPP',
          status: 'FAILED',
        },
      })
    }
  }

  console.log(`Lembretes enviados: ${appointments24h.length + appointments2h.length}`)
}

export async function sendConfirmationMessage(appointmentId: string) {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!apt || !apt.patient.phone) return

  const date = format(apt.startsAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const message = `Olá, ${apt.patient.name}! ✅\n\nSua consulta foi agendada com sucesso!\n\n📅 *${date}*\n👨‍⚕️ Dr(a). ${apt.doctor.name}\n🏥 ${apt.clinic.name}\n\nCaso precise remarcar, entre em contato conosco.\n\nAté logo! 😊`

  try {
    await sendWhatsApp(apt.patient.phone, message)
  } catch (err) {
    console.error('Erro ao enviar confirmação:', err)
  }
}

export async function sendPostConsultationMessage(appointmentId: string) {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!apt || !apt.patient.phone) return

  const message = `Olá, ${apt.patient.name}! 😊\n\nEsperamos que sua consulta com Dr(a). ${apt.doctor.name} tenha sido ótima!\n\nGostaríamos de saber sua opinião. Como foi seu atendimento?\n\n⭐ Responda com uma nota de 1 a 5\n\nObrigado pela confiança! 🙏\n🏥 ${apt.clinic.name}`

  try {
    await sendWhatsApp(apt.patient.phone, message)
  } catch (err) {
    console.error('Erro ao enviar pesquisa:', err)
  }
}