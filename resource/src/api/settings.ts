import apiClient from './client'
import type { Result, Settings, TestEmailRequest } from '@/types'

export const getSettings = (): Promise<Result<Settings>> => {
  return apiClient.get('/admin/settings')
}

export const updateSettings = (data: Settings): Promise<Result<void>> => {
  return apiClient.put('/admin/settings', data)
}

export const sendTestEmail = (data: TestEmailRequest): Promise<Result<void>> => {
  return apiClient.post('/admin/settings/email/test', data)
}
