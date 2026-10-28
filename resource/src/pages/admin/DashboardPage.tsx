import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Timer,
  RefreshCw,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import { getDashboardSummary, getGlobalTrend, getMonitorHistory } from '@/api/monitor'
import type { DashboardSummary, HourlyTrend, MonitorCheckResult } from '@/types'
import { MetricCard } from '@/components/shared/MetricCard'
import { TrendChart } from '@/components/shared/TrendChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatLatency } from '@/lib/utils'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()

  const [summary, setSummary] = useState<DashboardSummary>({
    totalProjects: 0,
    onlineProjects: 0,
    offlineProjects: 0,
    unknownProjects: 0,
    avgResponseTime: 0
  })
  const [trends, setTrends] = useState<HourlyTrend[]>([])
  const [recentChecks, setRecentChecks] = useState<MonitorCheckResult[]>([])
  const [selectedDays, setSelectedDays] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumRes, trendRes, histRes] = await Promise.all([
        getDashboardSummary(),
        getGlobalTrend(selectedDays),
        getMonitorHistory({ current: 1, size: 7 })
      ])

      if (sumRes.data) setSummary(sumRes.data)
      if (trendRes.data) setTrends(trendRes.data)
      if (histRes.data && histRes.data.records) setRecentChecks(histRes.data.records)
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDays])

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>系统监控全景仪表盘</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            实时监控集群全网可用性、SLA在线率以及平均响应延迟趋势
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>刷新数据</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/admin/projects')}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Server className="w-3.5 h-3.5" />
            <span>管理服务</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="监控服务总数"
          value={summary.totalProjects}
          subtitle="已接入系统纳管"
          icon={<Server className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600 border-blue-200"
          trendColor="neutral"
        />
        <MetricCard
          title="正常在线服务"
          value={summary.onlineProjects}
          subtitle="当前可正常访问"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 text-emerald-600 border-emerald-200"
          trendColor="green"
        />
        <MetricCard
          title="异常告警服务"
          value={summary.offlineProjects}
          subtitle="需优先排查恢复"
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
          iconBg="bg-rose-50 text-rose-600 border-rose-200"
          trendColor={summary.offlineProjects > 0 ? 'red' : 'neutral'}
        />
        <MetricCard
          title="平均响应延迟"
          value={formatLatency(summary.avgResponseTime)}
          subtitle="全集群样本加权"
          icon={<Timer className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 text-blue-600 border-blue-200"
          trendColor="blue"
        />
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uptime Trend */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>可用率趋势 (Uptime %)</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">历史周期 SLA 正常在线百分比</p>
            </div>
            {/* Range Toggle */}
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
            <TrendChart data={trends} type="uptime" height={240} />
          </CardContent>
        </Card>

        {/* Latency Trend */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-600" />
                <span>平均响应延迟趋势 (ms)</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">网络往返及服务处理平均耗时波动</p>
            </div>
            <span className="text-xs font-mono text-slate-500 font-medium">周期: {selectedDays}天</span>
          </CardHeader>
          <CardContent className="pt-4">
            <TrendChart data={trends} type="latency" height={240} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-slate-900 font-semibold">最近监控检查动态</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">实时产生的可用性探测结果与审计流水</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/monitor')}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
          >
            <span>查看完整日志</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="border-slate-200">
                  <TableHead className="w-16 text-slate-600 font-semibold">ID</TableHead>
                  <TableHead className="w-28 text-slate-600 font-semibold">检查结果</TableHead>
                  <TableHead className="w-28 text-slate-600 font-semibold">HTTP 状态</TableHead>
                  <TableHead className="w-28 text-slate-600 font-semibold">响应延迟</TableHead>
                  <TableHead className="w-28 text-slate-600 font-semibold">触发方式</TableHead>
                  <TableHead className="text-slate-600 font-semibold">检查时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentChecks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      暂无检查流水记录
                    </TableCell>
                  </TableRow>
                ) : (
                  recentChecks.map((check) => (
                    <TableRow key={check.id} className="border-slate-100 hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs text-slate-500">
                        #{check.id}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.isSuccess ? 'UP' : 'DOWN'} size="sm" />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-xs font-semibold ${
                            check.httpStatus && check.httpStatus >= 200 && check.httpStatus < 300
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {check.httpStatus || '--'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-900 font-medium">
                        {formatLatency(check.responseTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] py-0 px-2 font-normal bg-slate-100 text-slate-600">
                          {check.triggerType === 'MANUAL' ? '手动即时' : '调度计划'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDateTime(check.checkTime)}
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
