import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('bcc_token', token)
    localStorage.setItem('bcc_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('bcc_token')
    localStorage.removeItem('bcc_user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem('bcc_token')
    const userStr = localStorage.getItem('bcc_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ token, user, isAuthenticated: true })
      } catch {
        localStorage.removeItem('bcc_token')
        localStorage.removeItem('bcc_user')
        set({ token: null, user: null, isAuthenticated: false })
      }
    }
  }
}))
