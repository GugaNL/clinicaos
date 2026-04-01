import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function paymentRoutes(app: FastifyInstance) {
  // Listar pagamentos
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { start, end, status } = request.query as {
      start?: string
      end?: string
      status?: string
    }

    const payments = await prisma.payment.findMany({
      where: {
        clinicId,
        ...(status && { status: status as any }),
        ...(start && end && {
          createdAt: {
            gte: new Date(start),
            lte: new Date(end),
          },
        }),
      },
      include: {
        appointment: {
          include: {
            doctor: true,
            patient: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(payments)
  })

  // Criar pagamento vinculado a uma consulta
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      appointmentId: z.string(),
      amount: z.number().positive(),
      method: z.enum(['PIX', 'CASH', 'CREDIT_CARD', 'HEALTH_INSURANCE']),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { appointmentId, amount, method } = result.data

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
    })

    if (!appointment) {
      return reply.status(404).send({ error: 'Consulta não encontrada' })
    }

    const existing = await prisma.payment.findUnique({
      where: { appointmentId },
    })

    if (existing) {
      return reply.status(400).send({ error: 'Esta consulta já tem um pagamento' })
    }

    const payment = await prisma.payment.create({
      data: {
        clinicId,
        appointmentId,
        amount,
        method,
        status: 'PENDING',
      },
      include: {
        appointment: {
          include: { doctor: true, patient: true },
        },
      },
    })

    return reply.status(201).send(payment)
  })

  // Atualizar status do pagamento
  app.patch('/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const schema = z.object({
      status: z.enum(['PENDING', 'PAID', 'REFUNDED']),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const payment = await prisma.payment.findFirst({
      where: { id, clinicId },
    })

    if (!payment) {
      return reply.status(404).send({ error: 'Pagamento não encontrado' })
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: result.data.status,
        paidAt: result.data.status === 'PAID' ? new Date() : null,
      },
      include: {
        appointment: {
          include: { doctor: true, patient: true },
        },
      },
    })

    return reply.send(updated)
  })

  // Relatório mensal
  app.get('/report', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const today = new Date()
    const months = Array.from({ length: 6 }, (_, i) => subMonths(today, i))

    const report = await Promise.all(
      months.map(async (month) => {
        const start = startOfMonth(month)
        const end = endOfMonth(month)

        const [paid, pending] = await Promise.all([
          prisma.payment.aggregate({
            where: {
              clinicId,
              status: 'PAID',
              paidAt: { gte: start, lte: end },
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.payment.aggregate({
            where: {
              clinicId,
              status: 'PENDING',
              createdAt: { gte: start, lte: end },
            },
            _sum: { amount: true },
            _count: true,
          }),
        ])

        return {
          month: start.toISOString(),
          paid: Number(paid._sum.amount || 0),
          pending: Number(pending._sum.amount || 0),
          paidCount: paid._count,
          pendingCount: pending._count,
        }
      })
    )

    return reply.send(report.reverse())
  })

  // Inadimplência
  app.get('/overdue', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const overdue = await prisma.payment.findMany({
      where: {
        clinicId,
        status: 'PENDING',
        appointment: {
          startsAt: { lt: new Date() },
          status: 'DONE',
        },
      },
      include: {
        appointment: {
          include: { doctor: true, patient: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return reply.send(overdue)
  })
}