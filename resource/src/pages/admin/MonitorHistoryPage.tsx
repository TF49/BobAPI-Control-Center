import React, { useState, useEffect, useMemo } from 'react'
import {
  RefreshCw,
  Eye,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Zap,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  XCircle,
  Hash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal
} from 'lucide-react'
import { getMonitorHistory } from '@/api/monitor'
import { getProjectsPage } from '@/api/project'
import type { MonitorCheckResult, Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { formatDateTime, formatLatency } from '@/lib/utils'

export const MonitorHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<MonitorCheckResult[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [triggerFilter, setTriggerFilter] = useState<string>('ALL')

  // Sorting
  const [sortBy, setSortBy] = useState<'id' | 'checkTime'>('checkTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Detail Modal
  const [detailItem, setDetailItem] = useState<MonitorCheckResult | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadProjects = async () => {
    try {
      const res = await getProjectsPage({ current: 1, size: 100 })
      if (res.data) setProjects(res.data.records || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadHistory = async () => {
    setLoading(true)
    try {
      const isSuccess =
        statusFilter === 'UP' ? true : statusFilter === 'DOWN' ? false : undefined
      const triggerType = triggerFilter !== 'ALL' ? triggerFilter : undefined

      const res = await getMonitorHistory({
        current: currentPage,
        page: currentPage,
        size: pageSize,
        projectId: selectedProjectId,
        isSuccess,
        triggerType,
        sortBy,
        sortOrder
      })

      if (res.data) {
        setLogs(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [currentPage, selectedProjectId, statusFilter, triggerFilter, sortBy, sortOrder])

  const handleSortToggle = (col: 'id' | 'checkTime') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortOrder(col === 'id' ? 'asc' : 'desc')
    }
    setCurrentPage(1)
  }

  const renderSortIndicator = (col: 'id' | 'checkTime') => {
    if (sortBy !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    }
    return <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
  }

  const projectMap = useMemo(() => {
    const map: Record<number, Project> = {}
    projects.forEach((p) => {
      map[p.id] = p
    })
    return map
  }, [projects])

  // Compute live overview metrics from loaded logs
  const metrics = useMemo(() => {
    if (logs.length === 0) {
      return { successRate: '100%', avgLatency: 0, failCount: 0 }
    }
    const successCount = logs.filter((l) => l.isSuccess).length
    const failCount = logs.length - successCount
    const totalLatency = logs.reduce((acc, l) => acc + (l.responseTime || 0), 0)
    const avgLatency = Math.round(totalLatency / logs.length)
    const successRate = ((successCount / logs.length) * 100).toFixed(1) + '%'
    return { successRate, avgLatency, failCount }
  }, [logs])

  // Helper for HTTP status badges
  const renderHttpStatusBadge = (code?: number) => {
    if (!code) {
      return <span className="font-mono text-xs text-slate-400">--</span>
    }
    if (code >= 200 && code < 300) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {code}
        </span>
      )
    }
    if (code >= 300 && code < 400) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {code}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        {code}
      </span>
    )
  }

  // Latency styling
  const getLatencyStyle = (latency?: number) => {
    if (!latency) return 'text-slate-400'
    if (latency < 250) return 'text-emerald-600 font-semibold'
    if (latency < 500) return 'text-blue-600 font-semibold'
    return 'text-amber-600 font-semibold'
  }

  const hasActiveFilter =
    selectedProjectId !== undefined || statusFilter !== 'ALL' || triggerFilter !== 'ALL'

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">监控审计历史</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
              共累计 {total} 次审计记录
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            全量记录系统探针发起的每次健康检测结果、HTTP 状态码、耗时流水与故障排查上下文
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
            className="h-9 px-4 gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>刷新流水</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/90 bg-white p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">当前查询总审计数</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>当前筛选过滤后的全量日志</span>
          </div>
        </Card>

        <Card className="border border-slate-200/90 bg-white p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">当前批次可用率</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{metrics.successRate}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>本页正常在线探测占比</span>
          </div>
        </Card>

        <Card className="border border-slate-200/90 bg-white p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">平均网络探测响应</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatLatency(metrics.avgLatency)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>HTTP 探针端到端网络耗时</span>
          </div>
        </Card>

        <Card className="border border-slate-200/90 bg-white p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">本批次异常故障数</p>
              <h3 className={`text-2xl font-bold mt-1 font-mono ${metrics.failCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {metrics.failCount} 次
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metrics.failCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${metrics.failCount > 0 ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
            <span>{metrics.failCount > 0 ? '存在网络或服务故障' : '运行状态健康稳定'}</span>
          </div>
        </Card>
      </div>

      {/* Advanced Filter Toolbar */}
      <Card className="border border-slate-200/90 bg-white p-4 shadow-xs rounded-2xl">
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>服务项目:</span>
            </span>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : undefined
                setSelectedProjectId(val)
                setCurrentPage(1)
              }}
              className="h-9 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">全部纳管项目 ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>探测状态:</span>
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="ALL">全部状态结果</option>
              <option value="UP">正常在线 (UP)</option>
              <option value="DOWN">访问异常 (DOWN)</option>
            </select>
          </div>

          {/* Trigger Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span>触发方式:</span>
            </span>
            <select
              value={triggerFilter}
              onChange={(e) => {
                setTriggerFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="ALL">全部触发方式</option>
              <option value="SCHEDULE">调度系统定时触发</option>
              <option value="MANUAL">管理员手动检测</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">排序:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newBy, newOrder] = e.target.value.split('-') as ['id' | 'checkTime', 'asc' | 'desc']
                setSortBy(newBy)
                setSortOrder(newOrder)
                setCurrentPage(1)
              }}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="checkTime-desc">检查时间 (从新到旧)</option>
              <option value="checkTime-asc">检查时间 (从旧到新)</option>
              <option value="id-desc">ID 降序 (大到小)</option>
              <option value="id-asc">ID 升序 (小到大)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedProjectId(undefined)
                setStatusFilter('ALL')
                setTriggerFilter('ALL')
                setSortBy('checkTime')
                setSortOrder('desc')
                setCurrentPage(1)
              }}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9 px-3 rounded-xl ml-auto gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>清空筛选条件</span>
            </Button>
          )}
        </div>
      </Card>

      {/* History Table */}
      <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="w-24 text-slate-600 font-semibold text-xs">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('id')}
                    className="group inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors focus:outline-none"
                    title="点击切换ID排序"
                  >
                    <span>ID</span>
                    {renderSortIndicator('id')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[200px] text-slate-600 font-semibold text-xs">关联服务项目</TableHead>
                <TableHead className="w-36 min-w-[130px] text-slate-600 font-semibold text-xs">探测状态</TableHead>
                <TableHead className="w-28 text-slate-600 font-semibold text-xs">HTTP 状态码</TableHead>
                <TableHead className="w-28 text-slate-600 font-semibold text-xs">耗时</TableHead>
                <TableHead className="w-32 text-slate-600 font-semibold text-xs">触发方式</TableHead>
                <TableHead className="w-20 text-center text-slate-600 font-semibold text-xs">重试数</TableHead>
                <TableHead className="min-w-[220px] text-slate-600 font-semibold text-xs">检测摘要与诊断</TableHead>
                <TableHead className="w-44 text-slate-600 font-semibold text-xs">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('checkTime')}
                    className="group inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors focus:outline-none"
                    title="点击切换检查时间排序"
                  >
                    <span>检查时间</span>
                    {renderSortIndicator('checkTime')}
                  </button>
                </TableHead>
                <TableHead className="w-16 text-right pr-6 text-slate-600 font-semibold text-xs">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-medium text-slate-600">正在调取监控历史流水...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <Activity className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">暂无审计记录</p>
                      <p className="text-slate-500 text-xs">在选定筛选范围内未查询到任何探针日志，可点击右上角刷新</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const proj = projectMap[log.projectId]
                  return (
                    <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50/70 transition-colors">
                      {/* ID */}
                      <TableCell className="font-mono text-xs text-slate-500">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          #{log.id}
                        </span>
                      </TableCell>

                      {/* Associated Service */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                              <span>{proj ? proj.name : `项目 #${log.projectId}`}</span>
                              {proj?.category && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 font-normal">
                                  {proj.category}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] mt-0.5">
                              {proj?.url || '--'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status (Guaranteed never wraps) */}
                      <TableCell>
                        <StatusBadge status={log.isSuccess ? 'UP' : 'DOWN'} size="sm" />
                      </TableCell>

                      {/* HTTP Status Code */}
                      <TableCell>
                        {renderHttpStatusBadge(log.httpStatus)}
                      </TableCell>

                      {/* Latency */}
                      <TableCell>
                        <span className={`font-mono text-xs ${getLatencyStyle(log.responseTime)}`}>
                          {formatLatency(log.responseTime)}
                        </span>
                      </TableCell>

                      {/* Trigger Type */}
                      <TableCell>
                        {log.triggerType === 'MANUAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-medium">
                            <Zap className="w-3 h-3 text-blue-600" />
                            <span>手动触发</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>定时调度</span>
                          </span>
                        )}
                      </TableCell>

                      {/* Retry Count */}
                      <TableCell className="text-center font-mono text-xs">
                        {log.retryCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                            {log.retryCount} 次
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </TableCell>

                      {/* Summary / Diagnosis */}
                      <TableCell>
                        {log.isSuccess ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[240px]">
                              {log.errorSummary || '探测正常通过 (HTTP 200)'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[240px]" title={log.errorSummary}>
                              {log.errorSummary || '服务连接超时或异常'}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-xs text-slate-500 font-mono whitespace-nowrap">
                        {formatDateTime(log.checkTime)}
                      </TableCell>

                      {/* Action Detail */}
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          onClick={() => {
                            setDetailItem(log)
                            setDetailOpen(true)
                          }}
                          title="查看完整抓包详情"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              显示 {logs.length} 条记录 · 共记录 <strong className="text-slate-800 font-semibold">{total}</strong> 条审计日志
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              上一页
            </Button>
            <div className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-mono text-xs text-slate-700 font-medium">
              第 {currentPage} 页 / 共 {Math.ceil(total / pageSize) || 1} 页
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= Math.ceil(total / pageSize)}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {/* Advanced Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-slate-900 text-lg">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span>审计流水详情 #{detailItem?.id}</span>
              </div>
              {detailItem && <StatusBadge status={detailItem.isSuccess ? 'UP' : 'DOWN'} size="sm" />}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              探针发起请求并捕获的完整网络链路元数据
            </DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">目标纳管服务</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {projectMap[detailItem.projectId]?.name || `#${detailItem.projectId}`}
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {projectMap[detailItem.projectId]?.url || '--'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">HTTP 返回状态码</span>
                  <div className="mt-1">{renderHttpStatusBadge(detailItem.httpStatus)}</div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">探针往返耗时 (RTT)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatLatency(detailItem.responseTime)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">触发检测模式</span>
                  <span className="text-slate-800 font-medium">
                    {detailItem.triggerType === 'MANUAL' ? '管理员手动即时检测' : '后台调度引擎定时巡检'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">防抖重试次数</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {detailItem.retryCount > 0 ? `${detailItem.retryCount} 次复核` : '首次探测通过'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">探测发起时间</span>
                  <span className="font-mono text-slate-700">{formatDateTime(detailItem.checkTime)}</span>
                </div>
              </div>

              {/* Error Stack or Diagnostics */}
              {detailItem.errorType ? (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 space-y-1">
                  <div className="font-semibold text-xs flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>故障类型: {detailItem.errorType}</span>
                  </div>
                  <div className="font-mono text-xs break-all leading-relaxed bg-white/70 p-2.5 rounded-lg border border-rose-200/60 text-rose-900">
                    {detailItem.errorSummary || '未记录到详细堆栈信息'}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs">该次探测成功，目标网络与状态码符合预期规格。</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
