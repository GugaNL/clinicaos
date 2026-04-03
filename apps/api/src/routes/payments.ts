import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { mpPayment } from '../lib/mercadopago'

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

  // Gerar PIX via Mercado Pago
  app.post('/:id/pix', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const payment = await prisma.payment.findFirst({
      where: { id, clinicId },
      include: {
        appointment: {
          include: { patient: true },
        },
      },
    })

    if (!payment) {
      return reply.status(404).send({ error: 'Pagamento não encontrado' })
    }

    if (payment.status === 'PAID') {
      return reply.status(400).send({ error: 'Pagamento já realizado' })
    }

    try {
      const mpResponse = await mpPayment.create({
        body: {
          transaction_amount: Number(payment.amount),
          description: `Consulta médica - ${payment.appointment.patient.name}`,
          payment_method_id: 'pix',
          external_reference: payment.id,
          payer: {
            email: payment.appointment.patient.email || 'paciente@clinicaos.com.br',
            first_name: payment.appointment.patient.name.split(' ')[0],
            last_name: payment.appointment.patient.name.split(' ').slice(1).join(' '),
          },
        },
      })

      return reply.send({
        pixCopiaECola: mpResponse.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
        mpPaymentId: mpResponse.id,
        expiresAt: mpResponse.date_of_expiration,
      })
      } catch (err: any) {
        console.error('Erro ao gerar PIX:', JSON.stringify(err?.cause || err?.message || err))
        return reply.status(500).send({ error: 'Erro ao gerar PIX', details: err.message })
      }
  })

  // Gerar Boleto via Mercado Pago
app.post('/:id/boleto', { preHandler: authenticate }, async (request, reply) => {
  const { clinicId } = request.user as { clinicId: string }
  const { id } = request.params as { id: string }

  const schema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    cpf: z.string(),
    zip: z.string(),
    street: z.string(),
    number: z.string(),
    city: z.string(),
    state: z.string(),
  })

  const result = schema.safeParse(request.body)
  if (!result.success) {
    return reply.status(400).send({ error: 'Dados inválidos' })
  }

  const payment = await prisma.payment.findFirst({
    where: { id, clinicId },
    include: {
      appointment: {
        include: { patient: true },
      },
    },
  })

  if (!payment) {
    return reply.status(404).send({ error: 'Pagamento não encontrado' })
  }

  if (payment.status === 'PAID') {
    return reply.status(400).send({ error: 'Pagamento já realizado' })
  }

  const { firstName, lastName, email, cpf, zip, street, number, city, state } = result.data

  try {
    const mpResponse = await mpPayment.create({
      body: {
        transaction_amount: Number(payment.amount),
        description: `Consulta médica - ${payment.appointment.patient.name}`,
        payment_method_id: 'bolbradesco',
        external_reference: payment.id,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, ''),
          },
          address: {
            zip_code: zip.replace(/\D/g, ''),
            street_name: street,
            street_number: number,
            neighborhood: '',
            city,
            federal_unit: state,
          },
        },
      },
    })

    return reply.send({
      boletoUrl: (mpResponse as any).transaction_details?.external_resource_url,
      barcode: (mpResponse as any).barcode?.content,
      expiresAt: mpResponse.date_of_expiration,
      mpPaymentId: mpResponse.id,
    })
    } catch (err: any) {
      console.error('Erro boleto MP full:', JSON.stringify(err))
      console.error('Erro boleto MP cause:', JSON.stringify(err?.cause))
      console.error('Erro boleto MP message:', err?.message)
      return reply.status(500).send({ 
        error: 'Erro ao gerar boleto', 
        details: err?.message || 'internal_error'
      })
    }
  })

  // Webhook do Mercado Pago
  app.post('/webhook/mercadopago', async (request, reply) => {
    const body = request.body as any

    if (body.type === 'payment') {
      const mpId = body.data?.id
      if (!mpId) return reply.status(200).send()

      try {
        const mpResponse = await mpPayment.get({ id: mpId })

        if (mpResponse.status === 'approved') {
          // Busca o pagamento pelo valor e atualiza
          const externalRef = mpResponse.external_reference
          if (externalRef) {
            await prisma.payment.update({
              where: { id: externalRef },
              data: {
                status: 'PAID',
                paidAt: new Date(),
              },
            })
          }
        }
      } catch (err) {
        console.error('Erro no webhook MP:', err)
      }
    }

    return reply.status(200).send()
  })
}