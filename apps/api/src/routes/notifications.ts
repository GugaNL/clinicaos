import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'
import { startOfDay, endOfDay } from 'date-fns'

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const today = new Date()

    const [appointmentsToday, pendingPayments] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          clinicId,
          startsAt: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        include: { patient: true, doctor: true },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          clinicId,
          status: 'PENDING',
        },
        include: {
          appointment: {
            include: { patient: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const notifications = [
      ...appointmentsToday.map((apt) => ({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: `Consulta às ${new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        description: `${apt.patient.name} com ${apt.doctor.name}`,
        href: '/agendamentos',
      })),
      ...pendingPayments.map((pay) => ({
        id: `pay-${pay.id}`,
        type: 'payment',
        title: 'Pagamento pendente',
        description: `${pay.appointment.patient.name} — R$ ${Number(pay.amount).toFixed(2).replace('.', ',')}`,
        href: '/financeiro',
      })),
    ]

    return reply.send({
      notifications,
      total: notifications.length,
    })
  })
}