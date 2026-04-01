import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function patientRoutes(app: FastifyInstance) {
  // Listar pacientes
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const patients = await prisma.patient.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    })

    return reply.send(patients)
  })

  // Buscar paciente por ID
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        appointments: {
          orderBy: { startsAt: 'desc' },
          take: 5,
          include: { doctor: true },
        },
      },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Paciente não encontrado' })
    }

    return reply.send(patient)
  })

  // Criar paciente
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      cpf: z.string().optional(),
      birthDate: z.string().optional(),
      notes: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { name, email, phone, cpf, birthDate, notes } = result.data

    const patient = await prisma.patient.create({
      data: {
        clinicId,
        name,
        email: email || null,
        phone,
        cpf,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
      },
    })

    return reply.status(201).send(patient)
  })

  // Atualizar paciente
  app.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      cpf: z.string().optional(),
      birthDate: z.string().optional(),
      notes: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Paciente não encontrado' })
    }

    const { birthDate, email, ...rest } = result.data

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        email: email || null,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    })

    return reply.send(updated)
  })

  // Deletar paciente
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Paciente não encontrado' })
    }

    await prisma.patient.delete({ where: { id } })

    return reply.status(204).send()
  })
}