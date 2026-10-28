import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import type { HourlyTrend } from '@/types'

interface TrendChartProps {
  data: HourlyTrend[]
  type?: 'uptime' | 'latency'
  height?: number
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  type = 'uptime',
  height = 240
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50"
        style={{ height }}
      >
        暂无趋势波动数据
      </div>
    )
  }

  const isUptime = type === 'uptime'
  const strokeColor = isUptime ? '#059669' : '#2563eb'
  const fillColor = isUptime ? '#10b981' : '#3b82f6'
  const dataKey = isUptime ? 'uptime' : 'latency'
  const unit = isUptime ? '%' : 'ms'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(val: string) => {
              if (!val) return ''
              const parts = val.split(' ')
              return parts.length === 2 ? parts[1] : val
            }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            domain={isUptime ? [0, 100] : ['auto', 'auto']}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(val) => `${val}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              fontSize: '12px',
              color: '#0f172a'
            }}
            labelFormatter={(label: any) => `时间点: ${label}`}
            formatter={(value: any) => [
              `${value}${unit}`,
              isUptime ? '可用率' : '平均延迟'
            ]}
            labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 500 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#gradient-${type})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
