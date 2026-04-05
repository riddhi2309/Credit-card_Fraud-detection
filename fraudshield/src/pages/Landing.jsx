import { Link } from 'react-router-dom'
import { Shield, Zap, Brain, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: Brain,
    title: 'CTGAN + VAE ensemble',
    desc: 'Dual generative model architecture: CTGAN synthesizes balanced training data, VAE detects novel anomalies via reconstruction error.',
  },
  {
    icon: Zap,
    title: 'Real-time scoring',
    desc: 'Sub-50ms predictions via XGBoost classifier. Single transaction or batch CSV — both via REST API.',
  },
  {
    icon: BarChart3,
    title: 'SHAP explainability',
    desc: 'Every fraud flag comes with a feature-level explanation. Know exactly why a transaction was flagged.',
  },
  {
    icon: Shield,
    title: 'Drift detection',
    desc: 'Automatic monitoring of incoming feature distributions. Get alerted before model performance degrades.',
  },
]

const stats = [
  { label: 'AUC-ROC', value: '0.974' },
  { label: 'F1 Score', value: '0.912' },
  { label: 'Precision', value: '96.1%' },
  { label: 'Recall', value: '87.4%' },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export default function Landing() {
  return (
    <div className="min-h-screen text-white">
      {/* Hero */}
      <section className="relative px-12 pt-20 pb-24 overflow-hidden">
        {/* Glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                        bg-electric-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-electric-500/10 border border-electric-500/20 mb-8">
            <span className="glow-dot bg-electric-400" />
            <span className="text-xs font-mono text-electric-400">
              Powered by CTGAN + VAE + XGBoost
            </span>
          </div>

          <h1 className="font-display text-6xl font-800 leading-tight mb-6">
            AI-powered fraud detection
            <span className="block text-electric-400">built for the real world.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            FraudShield uses generative models to solve class imbalance, trains XGBoost on
            synthetic fraud data, and flags transactions in real time — with full explainability.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/dashboard" className="btn-primary flex items-center gap-2 px-6 py-3 text-base">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/playground" className="btn-secondary flex items-center gap-2 px-6 py-3 text-base">
              <span className="font-mono">{'</>'}</span> API playground
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-navy-900/50">
        <div className="max-w-5xl mx-auto px-12 py-8 grid grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
            >
              <p className="font-display text-3xl font-700 text-electric-400">{stat.value}</p>
              <p className="text-sm text-slate-500 font-mono mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-12 py-20 max-w-5xl mx-auto">
        <motion.div className="mb-12" {...fadeUp}>
          <p className="section-label mb-2">How it works</p>
          <h2 className="font-display text-3xl font-700">The full ML pipeline</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="card-hover p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
            >
              <div className="w-10 h-10 rounded-lg bg-electric-500/10 border border-electric-500/20
                              flex items-center justify-center mb-4">
                <feat.icon className="w-5 h-5 text-electric-400" />
              </div>
              <h3 className="font-display text-base font-600 mb-2">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pipeline diagram strip */}
      <section className="px-12 pb-20 max-w-5xl mx-auto">
        <div className="card p-6">
          <p className="section-label mb-4">Model pipeline</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['Raw CSV', 'MinMaxScaler', 'CTGAN', 'VAE encoder', 'XGBoost', 'Ensemble', 'Flask API'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 flex-shrink-0">
                <div className="px-3 py-1.5 rounded-lg bg-navy-800 border border-white/10 text-xs font-mono text-slate-300">
                  {step}
                </div>
                {i < 6 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-12 pb-20 max-w-5xl mx-auto">
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-electric-500/5 pointer-events-none" />
          <h2 className="font-display text-3xl font-700 mb-3 relative z-10">
            Ready to detect fraud?
          </h2>
          <p className="text-slate-400 mb-8 relative z-10">
            Run the Flask backend, then open the dashboard to start scoring transactions.
          </p>
          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className="font-mono text-xs bg-navy-950 border border-white/10 rounded-lg px-6 py-3 text-electric-400">
              $ python app.py &nbsp;&nbsp; # starts on :5000
            </div>
            <Link to="/dashboard" className="btn-primary flex items-center gap-2 mt-2">
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
