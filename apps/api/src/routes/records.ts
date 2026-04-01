import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function recordRoutes(app: FastifyInstance) {
  // Listar prontuários de um paciente
  app.get('/patient/:patientId', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { patientId } = request.params as { patientId: string }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Paciente não encontrado' })
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(records)
  })

  // Criar prontuário
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      patientId: z.string(),
      appointmentId: z.string().optional(),
      content: z.object({
        complaint: z.string().optional(),
        anamnesis: z.string().optional(),
        physicalExam: z.string().optional(),
        diagnosis: z.string().optional(),
        prescription: z.string().optional(),
        notes: z.string().optional(),
      }),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { patientId, appointmentId, content } = result.data

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Paciente não encontrado' })
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        appointmentId,
        content: JSON.stringify(content),
      },
    })

    return reply.status(201).send(record)
  })

  // Atualizar prontuário
  app.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const schema = z.object({
      content: z.object({
        complaint: z.string().optional(),
        anamnesis: z.string().optional(),
        physicalExam: z.string().optional(),
        diagnosis: z.string().optional(),
        prescription: z.string().optional(),
        notes: z.string().optional(),
      }),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const record = await prisma.medicalRecord.findFirst({
      where: {
        id,
        patient: { clinicId },
      },
    })

    if (!record) {
      return reply.status(404).send({ error: 'Prontuário não encontrado' })
    }

    const updated = await prisma.medicalRecord.update({
      where: { id },
      data: { content: JSON.stringify(result.data.content) },
    })

    return reply.send(updated)
  })

  // Deletar prontuário
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { id } = request.params as { id: string }

    const record = await prisma.medicalRecord.findFirst({
      where: {
        id,
        patient: { clinicId },
      },
    })

    if (!record) {
      return reply.status(404).send({ error: 'Prontuário não encontrado' })
    }

    await prisma.medicalRecord.delete({ where: { id } })

    return reply.status(204).send()
  })
}