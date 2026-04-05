import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Download, WifiOff } from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge.jsx'
import { useApi } from '@/hooks/useApi.js'
import { formatPercent } from '@/lib/utils.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function BatchUpload() {
  const [file, setFile]   = useState(null)
  const [dragging, setDragging] = useState(false)
  const [results, setResults]   = useState(null)
  const [stage, setStage]       = useState('idle') // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState(null)
  const fileRef = useRef()
  const { predictBatch, loading, apiStatus } = useApi()

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) return
    setFile(f)
    setResults(null)
    setStage('idle')
    setErrorMsg(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file) return
    setStage('uploading')
    setErrorMsg(null)
    const res = await predictBatch(file)
    if (res.error) {
      setErrorMsg(res.error)
      setStage('error')
      return
    }
    setResults(res)
    setStage('done')
  }

  const predictions = results?.predictions ?? []
  const fraudCount  = results?.fraud_count ?? 0
  const totalCount  = results?.total ?? 0
  const metrics     = results?.metrics ?? null

  return (
    <div className="p-8 animate-fade-in max-w-5xl">

      {/* Offline banner */}
      {apiStatus === 'offline' && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Backend offline — start Flask with <code className="font-mono text-xs bg-navy-950 px-1.5 py-0.5 rounded ml-1">python app.py</code>
        </div>
      )}

      <div className="mb-8">
        <p className="section-label mb-1">Batch analysis</p>
        <h1 className="font-display text-2xl font-700">Batch upload portal</h1>
        <p className="text-slate-400 text-sm mt-2">
          Upload a CSV of transactions — FraudShield will score every row with your trained XGBoost model.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 mb-6 ${
          dragging
            ? 'border-electric-400/60 bg-electric-500/10'
            : file
            ? 'border-electric-500/40 bg-electric-500/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <FileText className="w-10 h-10 text-electric-400 mx-auto mb-3" />
              <p className="font-mono text-sm text-electric-400">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
                onClick={e => {
                  e.stopPropagation()
                  setFile(null); setResults(null); setStage('idle'); setErrorMsg(null)
                }}
              >
                Remove
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-medium">Drop your CSV here</p>
              <p className="text-slate-500 text-xs mt-1">or click to browse</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Format hint */}
      <div className="card p-4 mb-6">
        <p className="section-label mb-2">Required CSV columns</p>
        <code className="text-xs font-mono text-slate-400">
          Time, V1, V2, V3 ... V28, Amount
        </code>
        <p className="text-xs text-slate-600 mt-1">
          Optional: include a <span className="font-mono">Class</span> column to get F1 + AUC-ROC metrics
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm font-mono">
          Error: {errorMsg}
        </div>
      )}

      {/* Submit */}
      {file && stage !== 'done' && (
        <button
          onClick={handleSubmit}
          disabled={loading || apiStatus === 'offline'}
          className="btn-primary flex items-center gap-2 mb-8 disabled:opacity-50"
        >
          {loading ? (
            <><span className="w-3.5 h-3.5 border border-navy-950 border-t-transparent rounded-full animate-spin" />
            Scoring with XGBoost...</>
          ) : (
            <><Upload className="w-4 h-4" /> Run fraud analysis</>
          )}
        </button>
      )}

      {/* Real results from API */}
      <AnimatePresence>
        {stage === 'done' && results && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total rows',    value: totalCount,                              color: 'text-slate-200' },
                { label: 'Fraud flagged', value: fraudCount,                              color: 'text-danger-400' },
                { label: 'Flag rate',     value: formatPercent(results.fraud_rate ?? 0),  color: 'text-amber-400' },
                { label: 'AUC-ROC',       value: metrics?.auc_roc?.toFixed(3) ?? 'N/A',  color: 'text-electric-400' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <p className="text-xs font-mono text-slate-500">{s.label}</p>
                  <p className={`font-display text-2xl font-700 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Metrics row (only if Class column was present) */}
            {metrics && (
              <div className="card p-4 mb-6 grid grid-cols-4 gap-4">
                {[
                  { label: 'F1 Score',  value: metrics.f1_score },
                  { label: 'AUC-ROC',   value: metrics.auc_roc },
                  { label: 'Precision', value: metrics.precision },
                  { label: 'Recall',    value: metrics.recall },
                ].map(m => (
                  <div key={m.label}>
                    <p className="text-xs font-mono text-slate-500 mb-1">{m.label}</p>
                    <p className="font-mono text-sm text-electric-400 font-medium">
                      {m.value?.toFixed(4) ?? 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Results table */}
            <div className="card mb-4">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <p className="section-label">Scored transactions ({predictions.length})</p>
                <a
                  href={`${API_BASE}${results.download_url}`}
                  download="batch_predictions.csv"
                  className="btn-secondary flex items-center gap-2 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV
                </a>
              </div>

              <div className="divide-y divide-white/5">
                <div className="px-5 py-2 grid grid-cols-12 gap-4 text-xs font-mono text-slate-600">
                  <span className="col-span-1">Row</span>
                  <span className="col-span-3">Fraud prob.</span>
                  <span className="col-span-3">Confidence</span>
                  <span className="col-span-2">Risk</span>
                  <span className="col-span-3">Verdict</span>
                </div>

                {predictions.map(row => (
                  <div
                    key={row.row}
                    className={`px-5 py-3 grid grid-cols-12 gap-4 text-sm hover:bg-white/[0.02] transition-colors ${
                      row.fraud ? 'bg-danger-500/5' : ''
                    }`}
                  >
                    <span className="col-span-1 font-mono text-xs text-slate-600">{row.row}</span>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 bg-navy-800 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.fraud_probability * 100}%`,
                            backgroundColor: row.fraud_probability > 0.75 ? '#ff4757' : row.fraud_probability > 0.4 ? '#ffb347' : '#00e67a',
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 w-10 text-right">
                        {(row.fraud_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="col-span-3 font-mono text-xs text-slate-400">{row.confidence}</span>
                    <span className="col-span-2">
                      <RiskBadge probability={row.fraud_probability} />
                    </span>
                    <span className={`col-span-3 font-mono text-xs ${row.fraud ? 'text-danger-400' : 'text-electric-400'}`}>
                      {row.fraud ? '⚠ FRAUD' : '✓ Legit'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}