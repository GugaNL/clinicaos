import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function settingsRoutes(app: FastifyInstance) {
  // Buscar dados da clínica
  app.get('/clinic', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    })

    if (!clinic) {
      return reply.status(404).send({ error: 'Clínica não encontrada' })
    }

    return reply.send(clinic)
  })

  // Atualizar dados da clínica
  app.put('/clinic', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().optional(),
      address: z.string().optional(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: result.data,
    })

    return reply.send(clinic)
  })

  // Listar usuários da clínica
  app.get('/users', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const users = await prisma.user.findMany({
      where: { clinicId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return reply.send(users)
  })

  // Convidar novo usuário
  app.post('/users', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }

    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTIONIST']),
      password: z.string().min(6),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { name, email, role, password } = result.data
    const { createHash } = await import('crypto')

    const existing = await prisma.user.findUnique({
      where: { email_clinicId: { email, clinicId } },
    })

    if (existing) {
      return reply.status(400).send({ error: 'E-mail já cadastrado nesta clínica' })
    }

    const user = await prisma.user.create({
      data: {
        clinicId,
        name,
        email,
        role,
        password: createHash('sha256').update(password).digest('hex'),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return reply.status(201).send(user)
  })

  // Remover usuário
  app.delete('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId, sub } = request.user as { clinicId: string; sub: string }
    const { id } = request.params as { id: string }

    if (id === sub) {
      return reply.status(400).send({ error: 'Você não pode remover sua própria conta' })
    }

    const user = await prisma.user.findFirst({
      where: { id, clinicId },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    await prisma.user.delete({ where: { id } })

    return reply.status(204).send()
  })
}