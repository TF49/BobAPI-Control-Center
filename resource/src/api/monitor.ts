import apiClient from './client'
import type { Result, DashboardSummary, MonitorCheckResult, HourlyTrend, PageResult } from '@/types'

export const getDashboardSummary = (): Promise<Result<DashboardSummary>> => {
  return apiClient.get('/admin/dashboard/summary')
}

export const getMonitorHistory = (params: {
  current?: number
  page?: number
  size?: number
  projectId?: number
  isSuccess?: boolean
  triggerType?: string
  startTime?: string
  endTime?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<Result<PageResult<MonitorCheckResult>>> => {
  return apiClient.get('/admin/monitor/history', { params })
}

export const getProjectHistory = (id: number, params: {
  current?: number
  size?: number
  isSuccess?: boolean
  startTime?: string
  endTime?: string
}): Promise<Result<PageResult<MonitorCheckResult>>> => {
  return apiClient.get(`/admin/monitor/projects/${id}/history`, { params })
}

export const getProjectStats = (id: number, days: number = 1): Promise<Result<{ totalChecks: number; successChecks: number; uptime: number; avgLatency: number }>> => {
  return apiClient.get(`/admin/monitor/projects/${id}/stats`, { params: { days } })
}

export const getProjectTrend = (id: number, days: number = 1): Promise<Result<HourlyTrend[]>> => {
  return apiClient.get(`/admin/monitor/projects/${id}/trend`, { params: { days } })
}

export const getGlobalTrend = (days: number = 1): Promise<Result<HourlyTrend[]>> => {
  return apiClient.get('/admin/monitor/summary', { params: { days } })
}
