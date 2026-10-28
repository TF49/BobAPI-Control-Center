import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg?: string
  trendColor?: 'green' | 'red' | 'blue' | 'amber' | 'neutral'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-primary/10 text-primary border-primary/20',
  trendColor = 'neutral',
  className
}) => {
  const valueColorClass = {
    green: 'text-emerald-600',
    red: 'text-rose-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    neutral: 'text-slate-900'
  }[trendColor]

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-md bg-white border border-slate-200 shadow-sm rounded-2xl',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold tracking-tight font-mono', valueColorClass)}>
              {value}
            </span>
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm', iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
