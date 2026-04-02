import axios from 'axios'

const evolution = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
  },
})

const instance = process.env.EVOLUTION_INSTANCE || 'clinicaos'

export async function sendWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`

  await evolution.post(`/message/sendText/${instance}`, {
    number,
    textMessage: { text: message },
  })
}