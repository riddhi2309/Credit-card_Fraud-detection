import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { AlertTriangle, TrendingUp, Shield, Activity, RefreshCw, WifiOff } from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge.jsx'
import { formatCurrency, formatPercent, timeAgo, SAMPLE_TRANSACTIONS } from '@/lib/utils.js'
import { useApi } from '@/hooks/useApi.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs font-mono">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { predict, getHealth, apiStatus } = useApi()

  const [transactions, setTransactions] = useState([])
  const [chartData, setChartData]       = useState([])
  const [isLive, setIsLive]             = useState(true)
  const [stats, setStats]               = useState({
    total: 0, flagged: 0, rate: 0, auc: '—'
  })
  const [health, setHealth] = useState(null)
  const sampleIndex = useRef(0)

  // Load health once on mount
  useEffect(() => {
    getHealth().then(h => setHealth(h))
  }, [getHealth])

  // Score one real transaction from the sample pool
  const scoreNext = useCallback(async () => {
    const tx = SAMPLE_TRANSACTIONS[sampleIndex.current % SAMPLE_TRANSACTIONS.length]
    sampleIndex.current += 1

    const result = await predict(tx)
    if (result.error) return

    const entry = {
      id:          Math.random().toString(36).substr(2, 8).toUpperCase(),
      amount:      tx.Amount,
      probability: result.fraud_probability,
      fraud:       result.fraud,
      confidence:  result.confidence,
      risk_level:  result.risk_level,
      timestamp:   new Date().toISOString(),
    }

    setTransactions(prev => [entry, ...prev.slice(0, 19)])
    setStats(prev => {
      const total   = prev.total + 1
      const flagged = prev.flagged + (result.fraud ? 1 : 0)
      return { ...prev, total, flagged, rate: flagged / total }
    })
    setChartData(prev => {
      const now = new Date()
      const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      const last = prev[prev.length - 1]
      if (last && last.time === label) {
        return prev.map((d, i) =>
          i === prev.length - 1
            ? { ...d, transactions: d.transactions + 1, fraud: d.fraud + (result.fraud ? 1 : 0) }
            : d
        )
      }
      const next = { time: label, transactions: 1, fraud: result.fraud ? 1 : 0 }
      return [...prev.slice(-11), next]
    })
  }, [predict])

  // Auto-score every 3 seconds when live
  useEffect(() => {
    if (!isLive || apiStatus === 'offline') return
    const id = setInterval(scoreNext, 3000)
    return () => clearInterval(id)
  }, [isLive, scoreNext, apiStatus])

  const statCards = [
    { label: 'Transactions scored', value: stats.total.toLocaleString(), icon: Activity, color: 'text-slate-300' },
    { label: 'Fraud flagged',       value: stats.flagged,                 icon: AlertTriangle, color: 'text-danger-400' },
    { label: 'Fraud rate',          value: formatPercent(stats.rate),     icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Model AUC-ROC',       value: stats.auc,                     icon: Shield, color: 'text-electric-400' },
  ]

  return (
    <div className="p-8 animate-fade-in">

      {/* Offline banner */}
      {apiStatus === 'offline' && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Backend offline — start Flask with <code className="font-mono text-xs bg-navy-950 px-1.5 py-0.5 rounded ml-1">python app.py</code>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Live monitoring</p>
          <h1 className="font-display text-2xl font-700">Analyst dashboard</h1>
          {health && (
            <p className="text-xs font-mono text-slate-500 mt-1">
              Mode: {health.models?.mode ?? '—'} · Uptime: {health.uptime ?? '—'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
              isLive
                ? 'bg-electric-500/10 border-electric-500/30 text-electric-400'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-electric-400 animate-pulse' : 'bg-slate-600'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button onClick={scoreNext} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Score one
          </button>
        </div>
      </div>

      {/* Model status pills */}
      {health && (
        <div className="flex gap-2 mb-6">
          {Object.entries(health.models || {}).filter(([k]) => k !== 'errors' && k !== 'mode').map(([key, loaded]) => (
            <span
              key={key}
              className={`px-2.5 py-1 rounded-full text-xs font-mono border ${
                loaded
                  ? 'bg-electric-500/10 border-electric-500/20 text-electric-400'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              {loaded ? '✓' : '✗'} {key}
            </span>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-mono">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`font-display text-2xl font-700 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 col-span-2">
          <p className="section-label mb-4">Transaction volume (live)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="transactions" name="Scored" stroke="#00e67a" strokeWidth={1.5} fill="url(#txGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="section-label mb-4">Fraud detections</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fraud" name="Fraud" fill="#ff4757" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live feed */}
      <div className="card">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <p className="section-label">Live transaction feed</p>
          <p className="text-xs font-mono text-slate-500">{transactions.length} scored</p>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500 text-sm font-mono">
              {apiStatus === 'offline'
                ? 'Backend offline — start Flask to begin scoring'
                : 'Waiting for first transaction to be scored...'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="px-5 py-2 grid grid-cols-12 gap-4 text-xs font-mono text-slate-600">
              <span className="col-span-2">ID</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-3">Fraud prob.</span>
              <span className="col-span-2">Risk</span>
              <span className="col-span-3">Time</span>
            </div>

            <AnimatePresence initial={false}>
              {transactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -16, backgroundColor: tx.fraud ? 'rgba(255,71,87,0.1)' : 'rgba(0,255,136,0.05)' }}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                  transition={{ duration: 0.35 }}
                  className="px-5 py-3 grid grid-cols-12 gap-4 text-sm hover:bg-white/[0.02] transition-colors"
                >
                  <span className="col-span-2 font-mono text-xs text-slate-400">{tx.id}</span>
                  <span className="col-span-2 font-mono text-xs text-slate-200">
                    {formatCurrency(tx.amount)}
                  </span>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 bg-navy-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${tx.probability * 100}%`,
                          backgroundColor: tx.probability > 0.75 ? '#ff4757' : tx.probability > 0.4 ? '#ffb347' : '#00e67a',
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-slate-400 w-10 text-right">
                      {(tx.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="col-span-2">
                    <RiskBadge probability={tx.probability} />
                  </span>
                  <span className="col-span-3 font-mono text-xs text-slate-500">
                    {timeAgo(tx.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}