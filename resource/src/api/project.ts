import apiClient from './client'
import type { Result, Project, PageResult } from '@/types'

export const getProjectsPage = (params: {
  current?: number
  page?: number
  size?: number
  keyword?: string
  category?: string
  status?: string
  isEnabled?: boolean
  isMonitorEnabled?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<Result<PageResult<Project>>> => {
  return apiClient.get('/admin/projects', { params })
}

export const getProjectById = (id: number): Promise<Result<Project>> => {
  return apiClient.get(`/admin/projects/${id}`)
}

export const createProject = (data: Partial<Project>): Promise<Result<Project>> => {
  return apiClient.post('/admin/projects', data)
}

export const updateProject = (id: number, data: Partial<Project>): Promise<Result<Project>> => {
  return apiClient.put(`/admin/projects/${id}`, data)
}

export const deleteProject = (id: number): Promise<Result<void>> => {
  return apiClient.delete(`/admin/projects/${id}`)
}

export const toggleProjectEnabled = (id: number, enabled: boolean): Promise<Result<void>> => {
  return apiClient.patch(`/admin/projects/${id}/enabled`, { enabled })
}

export const manualTriggerCheck = (id: number): Promise<Result<any>> => {
  // 手动触发探测时可能包含最长 60s 探测 + 1s 复查间隔 + 60s 重试，设置专用长超时
  return apiClient.post(`/admin/projects/${id}/check`, null, { timeout: 130000 })
}
