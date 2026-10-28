import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '--'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d).replace(/\//g, '-')
  } catch {
    return dateStr
  }
}

export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '从未检查'
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    if (diffMs < 0) return '刚刚'
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return `${diffSec}秒前`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}天前`
  } catch {
    return dateStr
  }
}

export function formatLatency(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '--'
  return `${Math.round(ms)}ms`
}

export function getStatusText(status?: 'UP' | 'DOWN' | 'UNKNOWN' | null): string {
  switch (status) {
    case 'UP':
      return '正常在线'
    case 'DOWN':
      return '访问异常'
    case 'UNKNOWN':
    default:
      return '检测中'
  }
}
