export interface Result<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface Project {
  id: number
  name: string
  code: string
  url: string
  description?: string
  icon?: string
  category?: string
  sortOrder: number
  isEnabled: boolean
  isMonitorEnabled: boolean
  checkInterval: number
  timeoutSeconds: number
  expectedStatusCode: string
  currentStatus: 'UP' | 'DOWN' | 'UNKNOWN'
  lastCheckStatus?: 'UP' | 'DOWN'
  lastCheckTime?: string
  lastResponseTime?: number
  createdAt: string
  updatedAt: string
}

export interface MonitorCheckResult {
  id: number
  projectId: number
  checkTime: string
  endTime?: string
  isSuccess: boolean
  httpStatus?: number
  responseTime?: number
  errorType?: string
  errorSummary?: string
  retryCount: number
  triggerType: 'SCHEDULE' | 'MANUAL'
  createdAt: string
}

export interface DashboardSummary {
  totalProjects: number
  onlineProjects: number
  offlineProjects: number
  unknownProjects: number
  avgResponseTime: number
  lastCheckTime?: string
}

export interface HourlyTrend {
  time: string
  uptime: number
  latency: number
}

export interface Settings {
  defaultCheckInterval: number
  defaultTimeoutSeconds: number
  retryOnFailure: boolean
  publicRefreshInterval: number
  historyRetentionDays: number
  displayTimezone: string
  emailAlertEnabled?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  smtpSslEnabled?: boolean
  smtpFrom?: string
  alertRecipientEmails?: string
}

export interface TestEmailRequest {
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  smtpSslEnabled?: boolean
  smtpFrom?: string
  testRecipient?: string
}

export interface User {
  id: number
  username: string
  nickname?: string
  role: string
  status: number
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
