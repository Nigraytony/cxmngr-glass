import axios from 'axios'
import { getApiBase } from './api'

export const http = axios.create({
  baseURL: getApiBase(),
})

export default http
