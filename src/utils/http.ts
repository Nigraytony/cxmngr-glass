import axios from 'axios'
import { getApiBase } from './api'
import { getAuthHeaders } from './auth'

export const http = axios.create({
  baseURL: getApiBase(),
})

// Attach auth header automatically to every request when available
http.interceptors.request.use((config) => {
  try {
    config.headers = { ...(config.headers || {}), ...getAuthHeaders() }
  } catch (e) {
    // ignore
  }
  return config
}, (err) => Promise.reject(err))

export default http
