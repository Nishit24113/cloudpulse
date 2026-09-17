import axios from 'axios'

const API_BASE_URL = 'https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const checkHealth = async () => {
  const response = await api.get('/health')
  return response.data
}

export const sendMetrics = async (metrics) => {
  const response = await api.post('/metrics', { metrics })
  return response.data
}

export const sendLogs = async (logs) => {
  const response = await api.post('/logs', { logs })
  return response.data
}

export const getMetrics = async () => {
  // Mock data for now since query API isn't deployed yet
  return {
    metrics: [
      { name: 'cpu.usage', value: 75.5, timestamp: Date.now() },
      { name: 'memory.usage', value: 8192, timestamp: Date.now() },
      { name: 'api.requests', value: 1250, timestamp: Date.now() },
      { name: 'api.response_time', value: 125, timestamp: Date.now() },
    ],
  }
}

export default api
