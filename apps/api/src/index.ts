import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { doctorRoutes } from './routes/doctors'

const app = Fastify({ logger: true })

app.register(cors, {
  origin: process.env.WEB_URL || '*',
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'secret',
})

app.register(authRoutes, { prefix: '/auth' })
app.register(doctorRoutes, { prefix: '/doctors' })

app.get('/health', async () => {
  return { status: 'ok' }
})

const start = async () => {
  try {
    const port = Number(process.env.API_PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`API rodando na porta ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()