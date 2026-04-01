import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function doctorRoutes(app: FastifyInstance) {
  // Listar médicos
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const doctors = await prisma.doctor.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    })

    return reply.send(doctors)
  })

  // Buscar médico por ID
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const doctor = await prisma.doctor.findFirst({
      where: { id, clinicId },
    })

    if (!doctor) {
      return reply.status(404).send({ error: 'Médico não encontrado' })
    }

    return reply.send(doctor)
  })

  // Criar médico
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      name: z.string().min(2),
      crm: z.string().optional(),
      specialty: z.string().optional(),
      color: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { name, crm, specialty, color } = result.data

    const doctor = await prisma.doctor.create({
      data: {
        clinicId,
        name,
        crm,
        specialty,
        color: color || '#3B82F6',
      },
    })

    return reply.status(201).send(doctor)
  })

  // Atualizar médico
  app.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const schema = z.object({
      name: z.string().min(2).optional(),
      crm: z.string().optional(),
      specialty: z.string().optional(),
      color: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id, clinicId },
    })

    if (!doctor) {
      return reply.status(404).send({ error: 'Médico não encontrado' })
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: result.data,
    })

    return reply.send(updated)
  })

  // Deletar médico
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const doctor = await prisma.doctor.findFirst({
      where: { id, clinicId },
    })

    if (!doctor) {
      return reply.status(404).send({ error: 'Médico não encontrado' })
    }

    await prisma.doctor.delete({ where: { id } })

    return reply.status(204).send()
  })
}