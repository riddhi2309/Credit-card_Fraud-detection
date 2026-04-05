import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Copy, Check, ChevronDown, ChevronRight, RefreshCw, WifiOff } from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge.jsx'
import { useApi } from '@/hooks/useApi.js'
import { SAMPLE_TRANSACTIONS } from '@/lib/utils.js'

const sampleTransaction = SAMPLE_TRANSACTIONS[0]

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/predict',
    desc: 'Score a single transaction. Returns fraud probability, label, confidence, and risk level.',
    bodyNote: 'JSON with Time, V1–V28, Amount',
  },
  {
    method: 'POST',
    path: '/explain',
    desc: 'Score + SHAP feature attributions. Requires pip install shap on the backend.',
    bodyNote: 'Same JSON as /predict',
  },
  {
    method: 'POST',
    path: '/predict_batch',
    desc: 'Upload CSV file. Returns all rows scored. Optional Class column enables metrics.',
    bodyNote: 'multipart/form-data — field name: file',
  },
  {
    method: 'GET',
    path: '/health',
    desc: 'Model load status, uptime, and current scoring mode (classifier / ensemble).',
    bodyNote: null,
  },
  {
    method: 'POST',
    path: '/reload',
    desc: 'Hot-reload all model files without restarting Flask. Call after adding vae_model.pt.',
    bodyNote: 'Empty body',
  },
]

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-300">
      {copied ? <Check className="w-3.5 h-3.5 text-electric-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function EndpointRow({ ep }) {
  const [open, setOpen] = useState(false)
  const isGet = ep.method === 'GET'
  return (
    <div className="card mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className={`px-2 py-0.5 rounded font-mono text-xs font-medium border ${
          isGet
            ? 'text-electric-400 bg-electric-500/10 border-electric-500/20'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        }`}>
          {ep.method}
        </span>
        <span className="font-mono text-sm text-slate-200">{ep.path}</span>
        <span className="text-xs text-slate-500 flex-1 hidden md:block">{ep.desc}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-3 border-t border-white/5">
              <p className="text-xs text-slate-400 mb-2">{ep.desc}</p>
              {ep.bodyNote && (
                <p className="text-xs font-mono text-slate-600">Body: {ep.bodyNote}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Playground() {
  const [inputJson, setInputJson]     = useState(JSON.stringify(sampleTransaction, null, 2))
  const [response, setResponse]       = useState(null)
  const [parseError, setParseError]   = useState(null)
  const [activeMode, setActiveMode]   = useState('predict') // predict | explain | health
  const [healthData, setHealthData]   = useState(null)
  const { predict, explain, getHealth, reloadModels, loading, apiStatus } = useApi()

  const runPredict = async () => {
    try {
      const parsed = JSON.parse(inputJson)
      setParseError(null)
      const res = await predict(parsed)
      setResponse(res)
    } catch (e) {
      setParseError('Invalid JSON: ' + e.message)
    }
  }

  const runExplain = async () => {
    try {
      const parsed = JSON.parse(inputJson)
      setParseError(null)
      const res = await explain(parsed)
      setResponse(res)
    } catch (e) {
      setParseError('Invalid JSON: ' + e.message)
    }
  }

  const runHealth = async () => {
    const res = await getHealth()
    setHealthData(res)
    setResponse(res)
  }

  const runReload = async () => {
    const res = await reloadModels()
    setResponse(res)
  }

  const loadSample = (idx) => {
    setInputJson(JSON.stringify(SAMPLE_TRANSACTIONS[idx % SAMPLE_TRANSACTIONS.length], null, 2))
    setResponse(null)
    setParseError(null)
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Offline banner */}
      {apiStatus === 'offline' && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Backend offline — start Flask with <code className="font-mono text-xs bg-navy-950 px-1.5 py-0.5 rounded ml-1">python app.py</code>
        </div>
      )}

      <div className="mb-8">
        <p className="section-label mb-1">Developer tools</p>
        <h1 className="font-display text-2xl font-700">API playground</h1>
        <p className="text-slate-400 text-sm mt-2">
          Live tester for all FraudShield endpoints.
          Base URL: <code className="font-mono text-electric-400 text-xs bg-navy-900 px-1.5 py-0.5 rounded">http://localhost:5000</code>
        </p>
      </div>

      {/* Endpoint reference */}
      <div className="mb-8">
        <p className="section-label mb-4">Endpoints</p>
        {ENDPOINTS.map(ep => <EndpointRow key={ep.path + ep.method} ep={ep} />)}
      </div>

      {/* Live tester */}
      <div className="card p-5">
        <p className="section-label mb-4">Live tester</p>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'predict', label: 'POST /predict' },
            { id: 'explain', label: 'POST /explain' },
            { id: 'health',  label: 'GET /health' },
            { id: 'reload',  label: 'POST /reload' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveMode(tab.id); setResponse(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                activeMode === tab.id
                  ? 'bg-electric-500/10 border-electric-500/30 text-electric-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Input */}
          <div>
            {(activeMode === 'predict' || activeMode === 'explain') && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-mono">Request JSON</p>
                  <div className="flex items-center gap-1">
                    <CopyButton text={inputJson} />
                    <button
                      onClick={() => loadSample(Math.floor(Math.random() * SAMPLE_TRANSACTIONS.length))}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-300"
                      title="Load random sample"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={inputJson}
                  onChange={e => setInputJson(e.target.value)}
                  className="w-full h-72 bg-navy-950 border border-white/10 rounded-lg p-4 text-xs font-mono
                             text-slate-300 resize-none focus:outline-none focus:border-electric-500/50 leading-relaxed"
                  spellCheck={false}
                />
                {parseError && (
                  <p className="text-xs text-danger-400 font-mono mt-2">{parseError}</p>
                )}
              </>
            )}
            {(activeMode === 'health' || activeMode === 'reload') && (
              <div className="h-72 flex items-center justify-center bg-navy-950 border border-white/10 rounded-lg">
                <p className="text-xs text-slate-600 font-mono">No request body needed</p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={
                activeMode === 'predict' ? runPredict :
                activeMode === 'explain' ? runExplain :
                activeMode === 'health'  ? runHealth  :
                runReload
              }
              disabled={loading || apiStatus === 'offline'}
              className="btn-primary mt-3 flex items-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <><span className="w-3.5 h-3.5 border border-navy-950 border-t-transparent rounded-full animate-spin" /> Running...</>
                : <><Play className="w-3.5 h-3.5" /> Send request</>
              }
            </button>
          </div>

          {/* Response */}
          <div>
            <p className="text-xs text-slate-500 font-mono mb-2">Response</p>
            <div className="h-72 bg-navy-950 border border-white/10 rounded-lg p-4 overflow-auto">
              <AnimatePresence mode="wait">
                {response ? (
                  <motion.div key="resp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <pre className="text-xs font-mono text-electric-400/80 leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                    {typeof response.fraud_probability === 'number' && (
                      <div className="mt-4 p-3 bg-navy-900 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-2">Result</p>
                        <div className="flex items-center gap-3">
                          <RiskBadge probability={response.fraud_probability} />
                          <span className="font-mono text-xs text-slate-300">
                            {(response.fraud_probability * 100).toFixed(2)}% fraud probability
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            · {response.confidence} confidence
                          </span>
                        </div>
                        {response.top_features && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-2">Top SHAP features</p>
                            {response.top_features.slice(0, 4).map(f => (
                              <div key={f.feature} className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-slate-400 w-8">{f.feature}</span>
                                <div className="flex-1 bg-navy-800 rounded-full h-1">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(Math.abs(f.shap_value) * 200, 100)}%`,
                                      backgroundColor: f.shap_value > 0 ? '#ff4757' : '#00e67a',
                                    }}
                                  />
                                </div>
                                <span className={`font-mono text-xs w-16 text-right ${f.shap_value > 0 ? 'text-danger-400' : 'text-electric-400'}`}>
                                  {f.shap_value > 0 ? '+' : ''}{f.shap_value.toFixed(3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.p key="empty" className="text-xs font-mono text-slate-600">
                    // Response will appear here...
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}