import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function appointmentRoutes(app: FastifyInstance) {
  // Listar agendamentos por período
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { start, end } = request.query as { start: string; end: string }

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        startsAt: {
          gte: start ? new Date(start) : undefined,
          lte: end ? new Date(end) : undefined,
        },
      },
      include: {
        doctor: true,
        patient: true,
      },
      orderBy: { startsAt: 'asc' },
    })

    return reply.send(appointments)
  })

  // Criar agendamento
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      doctorId: z.string(),
      patientId: z.string(),
      startsAt: z.string(),
      endsAt: z.string(),
      notes: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { doctorId, patientId, startsAt, endsAt, notes } = result.data

    // Verificar conflito de horário
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinicId,
        doctorId,
        status: { notIn: ['CANCELLED'] },
        OR: [
          {
            startsAt: { lte: new Date(startsAt) },
            endsAt: { gt: new Date(startsAt) },
          },
          {
            startsAt: { lt: new Date(endsAt) },
            endsAt: { gte: new Date(endsAt) },
          },
        ],
      },
    })

    if (conflict) {
      return reply.status(400).send({ error: 'Médico já tem consulta neste horário' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        doctorId,
        patientId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        notes,
      },
      include: {
        doctor: true,
        patient: true,
      },
    })

    return reply.status(201).send(appointment)
  })

  // Atualizar status
  app.patch('/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const schema = z.object({
      status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'DONE']),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId },
    })

    if (!appointment) {
      return reply.status(404).send({ error: 'Agendamento não encontrado' })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: result.data.status },
      include: { doctor: true, patient: true },
    })

    return reply.send(updated)
  })

  // Deletar agendamento
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId },
    })

    if (!appointment) {
      return reply.status(404).send({ error: 'Agendamento não encontrado' })
    }

    await prisma.appointment.delete({ where: { id } })

    return reply.status(204).send()
  })
}