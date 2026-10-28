import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bcc_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const res = response.data
    // 如果返回的标准结构且 code 不是 200
    if (res.code !== undefined && res.code !== 200) {
      toast.error(res.message || '请求处理异常')
      if (res.code === 401) {
        useAuthStore.getState().logout()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        }
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  (error) => {
    const status = error.response ? error.response.status : null
    const errorMsg = error.response?.data?.message || error.message || '网络请求失败'

    if (status === 401) {
      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
    } else {
      toast.error(errorMsg)
    }
    return Promise.reject(error)
  }
)

export default apiClient
