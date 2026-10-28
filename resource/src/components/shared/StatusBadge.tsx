import React from 'react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status?: 'UP' | 'DOWN' | 'UNKNOWN' | null
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'UNKNOWN',
  className,
  showText = true,
  size = 'md'
}) => {
  const currentStatus = status || 'UNKNOWN'

  const config = {
    UP: {
      text: '正常在线',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-emerald-500/5',
      dotBg: 'bg-emerald-500',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    },
    DOWN: {
      text: '访问异常',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/90 shadow-rose-500/5',
      dotBg: 'bg-rose-500',
      glow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]'
    },
    UNKNOWN: {
      text: '检测中',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/90 shadow-amber-500/5',
      dotBg: 'bg-amber-500',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]'
    }
  }[currentStatus]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium select-none whitespace-nowrap shrink-0 transition-all shadow-xs',
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-xs',
        size === 'lg' && 'px-3.5 py-1.5 text-sm',
        config.badgeBg,
        className
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {currentStatus === 'UP' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        )}
        {currentStatus === 'DOWN' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dotBg, config.glow)}></span>
      </span>
      {showText && <span className="leading-none tracking-tight whitespace-nowrap">{config.text}</span>}
    </div>
  )
}
