import { cn, getRiskLevel } from '@/lib/utils.js'

export function RiskBadge({ probability, className }) {
  const level = getRiskLevel(probability)
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border',
      level === 'high' && 'risk-high',
      level === 'medium' && 'risk-medium',
      level === 'low' && 'risk-low',
      className
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        level === 'high' && 'bg-danger-400 animate-pulse',
        level === 'medium' && 'bg-amber-400 animate-pulse',
        level === 'low' && 'bg-electric-400',
      )} />
      {level.toUpperCase()}
    </span>
  )
}