import axios from 'axios'

// API Base URL - الباك إند على VPS
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.alshailfund.com/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('alshuail_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // For FormData uploads, let the browser set the Content-Type with proper boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('alshuail_token')
      localStorage.removeItem('alshuail_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('alshuail_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('alshuail_token')
    delete api.defaults.headers.common['Authorization']
  }
}

export const getAuthToken = () => {
  return localStorage.getItem('alshuail_token')
}

export const isAuthenticated = () => {
  return !!getAuthToken()
}
