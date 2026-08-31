/**
 * src/api/client.js
 *
 * Centralized Axios instance for all API calls.
 * In dev, Vite's proxy forwards /api/* to the FastAPI backend (port 8000).
 * In production (Vercel), we'll set VITE_API_BASE_URL to the Render backend URL.
 *
 * Why a central instance? Same reason you'd create a single axios instance
 * in Express apps — consistent base URL, interceptors, and timeout config
 * in one place instead of scattered across every fetch call.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000, // 30s — LLM calls can be slow
  headers: {
    'Content-Type': 'application/json',
  },
})

export default apiClient
