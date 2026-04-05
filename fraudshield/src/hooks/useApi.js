import { useState, useCallback, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = json
    throw err
  }
  return json
}

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('unknown') // online | degraded | offline

  const getHealth = useCallback(async () => {
    try {
      const data = await apiFetch('/health', { headers: {} })
      setApiStatus(data.models?.classifier ? 'online' : 'degraded')
      return data
    } catch {
      setApiStatus('offline')
      return { status: 'offline', models: { scaler: false, classifier: false, vae: false } }
    }
  }, [])

  useEffect(() => { getHealth() }, [getHealth])

  const predict = useCallback(async (transactionData) => {
    setLoading(true)
    setError(null)
    try {
      return await apiFetch('/predict', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      })
    } catch (err) {
      setError(err.message)
      return { error: err.message, status: err.status }
    } finally {
      setLoading(false)
    }
  }, [])

  const explain = useCallback(async (transactionData) => {
    setLoading(true)
    setError(null)
    try {
      return await apiFetch('/explain', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      })
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const predictBatch = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Do NOT set Content-Type — browser sets it with boundary automatically
      const res = await fetch(`${API_BASE}/predict_batch`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      return json
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadModels = useCallback(async () => {
    try {
      const result = await apiFetch('/reload', { method: 'POST', body: '{}' })
      await getHealth()
      return result
    } catch (err) {
      return { error: err.message }
    }
  }, [getHealth])

  return {
    predict,
    explain,
    predictBatch,
    getHealth,
    reloadModels,
    loading,
    error,
    apiStatus,
  }
}