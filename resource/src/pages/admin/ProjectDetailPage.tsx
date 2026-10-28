import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  ExternalLink,
  TrendingUp,
  Timer,
  CheckCircle2,
  Globe
} from 'lucide-react'
import { getProjectById, manualTriggerCheck } from '@/api/project'
import { getProjectStats, getProjectTrend, getProjectHistory } from '@/api/monitor'
import type { Project, HourlyTrend, MonitorCheckResult } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MetricCard } from '@/components/shared/MetricCard'
import { TrendChart } from '@/components/shared/TrendChart'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatLatency } from '@/lib/utils'
import { toast } from 'sonner'

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = parseInt(id || '0')

  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState({
    totalChecks: 0,
    successChecks: 0,
    uptime: 100,
    avgLatency: 0
  })
  const [trend, setTrend] = useState<HourlyTrend[]>([])
  const [history, setHistory] = useState<MonitorCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number>(1)

  const loadProjectData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [projRes, statsRes, trendRes, histRes] = await Promise.all([
        getProjectById(projectId),
        getProjectStats(projectId, selectedDays),
        getProjectTrend(projectId, selectedDays),
        getProjectHistory(projectId, { current: 1, size: 10 })
      ])

      if (projRes.data) setProject(projRes.data)
      if (statsRes.data) setStats(statsRes.data)
      if (trendRes.data) setTrend(trendRes.data)
      if (histRes.data && histRes.data.records) setHistory(histRes.data.records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjectData()
  }, [projectId, selectedDays])

  const handleTriggerCheck = async () => {
    if (!projectId) return
    setChecking(true)
    try {
      const res = await manualTriggerCheck(projectId)
      toast.success(res.message || '即时探测完成')
      loadProjectData()
    } catch (err) {
      console.error(err)
    } finally {
      setChecking(false)
    }
  }

  if (!project && !loading) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">未找到该服务项目</h2>
        <Button variant="outline" onClick={() => navigate('/admin/projects')}>
          返回项目列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
            onClick={() => navigate('/admin/projects')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project?.name}</h1>
              <StatusBadge status={project?.currentStatus} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={project?.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>{project?.url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {project?.category && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-slate-100 text-slate-600 border border-slate-200">
                  {project.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerCheck}
            disabled={checking}
            className="gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>立即即时检测</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SLA 在线可用率"
          value={`${stats.uptime ?? 100}%`}
          subtitle={`样本加权 (${selectedDays}天周期)`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 text-emerald-600 border-emerald-200"
          trendColor="green"
        />
        <MetricCard
          title="平均响应耗时"
          value={formatLatency(stats.avgLatency)}
          subtitle="网络延迟+端侧响应"
          icon={<Timer className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 text-blue-600 border-blue-200"
          trendColor="blue"
        />
        <MetricCard
          title="总检测频次"
          value={stats.totalChecks}
          subtitle={`成功 ${stats.successChecks} 次`}
          icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 text-blue-600 border-blue-200"
          trendColor="neutral"
        />
        <MetricCard
          title="检测配置策略"
          value={`每 ${project?.checkInterval || 10} 分钟`}
          subtitle={`超时 ${project?.timeoutSeconds || 5} 秒 · 期望 ${project?.expectedStatusCode || '200'}`}
          icon={<Globe className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50 text-amber-600 border-amber-200"
          trendColor="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">服务可用率趋势 (Uptime %)</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">该服务的波动健康趋势</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {[
                { label: '24小时', days: 1 },
                { label: '7天', days: 7 },
                { label: '30天', days: 30 }
              ].map((item) => (
                <button
                  key={item.days}
                  onClick={() => setSelectedDays(item.days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedDays === item.days
                      ? 'bg-white text-blue-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <TrendChart data={trend} type="uptime" height={240} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">响应时间波动 (ms)</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">服务响应耗时指标曲线</p>
            </div>
            <span className="text-xs font-mono text-slate-500 font-medium">统计周期: {selectedDays}天</span>
          </CardHeader>
          <CardContent className="pt-4">
            <TrendChart data={trend} type="latency" height={240} />
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900 font-semibold">最近健康检查明细</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">单项目全量历史探测记录与异常摘要</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="border-slate-200">
                  <TableHead className="w-16 text-slate-600 font-semibold">ID</TableHead>
                  <TableHead className="w-28 text-slate-600 font-semibold">状态</TableHead>
                  <TableHead className="w-24 text-slate-600 font-semibold">HTTP Code</TableHead>
                  <TableHead className="w-24 text-slate-600 font-semibold">响应耗时</TableHead>
                  <TableHead className="w-24 text-slate-600 font-semibold">触发类型</TableHead>
                  <TableHead className="text-slate-600 font-semibold">错误原因与摘要</TableHead>
                  <TableHead className="w-44 text-slate-600 font-semibold">检查时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      暂无检查记录
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id} className="border-slate-100 hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs text-slate-500">
                        #{h.id}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={h.isSuccess ? 'UP' : 'DOWN'} size="sm" />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-xs font-semibold ${
                            h.httpStatus && h.httpStatus >= 200 && h.httpStatus < 300
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {h.httpStatus || '--'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-900 font-medium">
                        {formatLatency(h.responseTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-slate-100 text-slate-600">
                          {h.triggerType === 'MANUAL' ? '手动' : '计划'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                        {h.errorSummary || (h.isSuccess ? '检测通过' : '未知异常')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDateTime(h.checkTime)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
