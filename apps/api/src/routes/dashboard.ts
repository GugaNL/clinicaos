import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const today = new Date()

    const [
      appointmentsToday,
      totalPatients,
      totalDoctors,
      revenueMonth,
      nextAppointments,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          clinicId,
          startsAt: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      prisma.patient.count({ where: { clinicId } }),
      prisma.doctor.count({ where: { clinicId } }),
      prisma.payment.aggregate({
        where: {
          clinicId,
          status: 'PAID',
          paidAt: {
            gte: startOfMonth(today),
            lte: endOfMonth(today),
          },
        },
        _sum: { amount: true },
      }),
      prisma.appointment.findMany({
        where: {
          clinicId,
          startsAt: { gte: today },
          status: { notIn: ['CANCELLED', 'DONE'] },
        },
        include: { doctor: true, patient: true },
        orderBy: { startsAt: 'asc' },
        take: 5,
      }),
    ])

    return reply.send({
      appointmentsToday,
      totalPatients,
      totalDoctors,
      revenueMonth: revenueMonth._sum.amount || 0,
      nextAppointments,
    })
  })
}