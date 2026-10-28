import apiClient from './client'
import type { Result, User } from '@/types'

export const loginApi = (data: { username: string; password: string }): Promise<Result<{ token: string; tokenType: string; username: string; nickname?: string; role: string }>> => {
  return apiClient.post('/auth/login', data)
}

export const logoutApi = (): Promise<Result<void>> => {
  return apiClient.post('/auth/logout')
}

export const getMeApi = (): Promise<Result<User>> => {
  return apiClient.get('/auth/me')
}
