import apiClient from './client'
import type { Result, Project } from '@/types'

export const getPublicProjects = (): Promise<Result<Project[]>> => {
  return apiClient.get('/public/projects')
}

export const getPublicStatus = (): Promise<Result<{ total: number; online: number; offline: number; unknown: number; updatedAt: string }>> => {
  return apiClient.get('/public/status')
}

export const getPublicProjectStatus = (id: number): Promise<Result<Project>> => {
  return apiClient.get(`/public/projects/${id}/status`)
}
