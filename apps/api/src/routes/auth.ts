import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { createHash } from 'crypto'

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export async function authRoutes(app: FastifyInstance) {
  // Registro de nova clínica + admin
  app.post('/register', async (request, reply) => {
    const schema = z.object({
      clinicName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { clinicName, slug, name, email, password } = result.data

    const slugExists = await prisma.clinic.findUnique({ where: { slug } })
    if (slugExists) {
      return reply.status(400).send({ error: 'Slug já em uso' })
    }

    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        slug,
        users: {
          create: {
            name,
            email,
            password: hashPassword(password),
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    })

    const user = clinic.users[0]

    const token = app.jwt.sign({
      sub: user.id,
      clinicId: clinic.id,
      role: user.role,
    })

    return reply.status(201).send({ token, clinicId: clinic.id })
  })

  // Login
  app.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
      slug: z.string(),
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { email, password, slug } = result.data

    const clinic = await prisma.clinic.findUnique({ where: { slug } })
    if (!clinic) {
      return reply.status(401).send({ error: 'Clínica não encontrada' })
    }

    const user = await prisma.user.findUnique({
      where: { email_clinicId: { email, clinicId: clinic.id } },
    })

    if (!user || user.password !== hashPassword(password)) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      clinicId: clinic.id,
      role: user.role,
    })

    return reply.send({ token, clinicId: clinic.id })
  })
}