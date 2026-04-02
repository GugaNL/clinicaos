import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { doctorRoutes } from './routes/doctors'
import { patientRoutes } from './routes/patients'
import { appointmentRoutes } from './routes/appointments'
import { dashboardRoutes } from './routes/dashboard'
import { recordRoutes } from './routes/records'
import { paymentRoutes } from './routes/payments'
import { sendAppointmentReminders } from './jobs/reminders'
import { settingsRoutes } from './routes/settings'
import { searchRoutes } from './routes/search'

const app = Fastify({ logger: true })

app.register(cors, { origin: process.env.WEB_URL || '*' })
app.register(jwt, { secret: process.env.JWT_SECRET || 'secret' })

app.register(authRoutes, { prefix: '/auth' })
app.register(doctorRoutes, { prefix: '/doctors' })
app.register(patientRoutes, { prefix: '/patients' })
app.register(appointmentRoutes, { prefix: '/appointments' })
app.register(dashboardRoutes, { prefix: '/dashboard' })
app.register(recordRoutes, { prefix: '/records' })
app.register(paymentRoutes, { prefix: '/payments' })
app.register(settingsRoutes, { prefix: '/settings' })
app.register(searchRoutes, { prefix: '/search' })

app.get('/health', async () => ({ status: 'ok' }))

setInterval(async () => {
  console.log('Verificando lembretes...')
  await sendAppointmentReminders()
}, 60 * 60 * 1000)

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