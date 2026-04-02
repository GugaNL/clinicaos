import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/tenant'

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.user as { clinicId: string }
    const { q } = request.query as { q: string }

    if (!q || q.length < 2) {
      return reply.send({ patients: [], doctors: [], appointments: [] })
    }

    const [patients, doctors, appointments] = await Promise.all([
      prisma.patient.findMany({
        where: {
          clinicId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { cpf: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
      }),
      prisma.doctor.findMany({
        where: {
          clinicId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { specialty: { contains: q, mode: 'insensitive' } },
            { crm: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, specialty: true, color: true },
      }),
      prisma.appointment.findMany({
        where: {
          clinicId,
          OR: [
            { patient: { name: { contains: q, mode: 'insensitive' } } },
            { doctor: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        include: { patient: true, doctor: true },
        orderBy: { startsAt: 'desc' },
      }),
    ])

    return reply.send({ patients, doctors, appointments })
  })
}