import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      clinicId: string
      role: string
    }
    user: {
      sub: string
      clinicId: string
      role: string
    }
  }
}