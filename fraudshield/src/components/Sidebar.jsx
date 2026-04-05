import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Terminal, Home, Shield } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { useApi } from '@/hooks/useApi.js'

const navItems = [
  { to: '/',            icon: Home,            label: 'Home',        end: true },
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/batch',       icon: Upload,          label: 'Batch Upload' },
  { to: '/playground',  icon: Terminal,        label: 'API Playground' },
]

export function Sidebar() {
  const { apiStatus } = useApi()

  const statusColor =
    apiStatus === 'online'   ? 'bg-electric-400' :
    apiStatus === 'degraded' ? 'bg-amber-400' :
    apiStatus === 'offline'  ? 'bg-danger-400' :
    'bg-slate-600'

  const statusLabel =
    apiStatus === 'online'   ? 'Online' :
    apiStatus === 'degraded' ? 'Degraded' :
    apiStatus === 'offline'  ? 'Offline' :
    'Checking...'

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-navy-900 border-r border-white/5 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-electric-500/10 border border-electric-500/30 rounded-lg
                          flex items-center justify-center shadow-glow-green">
            <Shield className="w-4 h-4 text-electric-400" />
          </div>
          <div>
            <p className="font-display font-700 text-sm text-white">FraudShield</p>
            <p className="text-xs text-slate-500 font-mono">XGBoost + VAE</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="section-label px-3 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-electric-500/10 text-electric-400 border border-electric-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Real API status */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-950/50">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor} ${apiStatus === 'online' ? 'animate-pulse-slow' : ''}`} />
          <span className="text-xs text-slate-400 font-mono">API: {statusLabel}</span>
        </div>
      </div>
    </aside>
  )
}