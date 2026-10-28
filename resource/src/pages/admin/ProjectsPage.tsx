import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  ExternalLink,
  Play,
  Pencil,
  Trash2,
  RefreshCw,
  Eye,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  X
} from 'lucide-react'
import {
  getProjectsPage,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectEnabled,
  manualTriggerCheck
} from '@/api/project'
import type { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { formatLatency } from '@/lib/utils'
import { toast } from 'sonner'

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DOWN' | 'DISABLED'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Copied state for feedback
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Delete Confirm Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // Checking state map: id -> boolean
  const [checkingMap, setCheckingMap] = useState<Record<number, boolean>>({})

  const [form, setForm] = useState({
    name: '',
    code: '',
    url: '',
    category: '',
    description: '',
    sortOrder: 1,
    isEnabled: true,
    isMonitorEnabled: true,
    checkInterval: 10,
    timeoutSeconds: 5,
    expectedStatusCode: '200'
  })

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await getProjectsPage({
        current: currentPage,
        size: pageSize,
        keyword: keyword.trim() || undefined
      })
      if (res.data) {
        setProjects(res.data.records || [])
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
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadProjects()
  }

  const handleCopyUrl = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation()
    navigator.clipboard.writeText(p.url)
    setCopiedId(p.id)
    toast.success(`已复制 ${p.name} 地址到剪贴板`)
    setTimeout(() => {
      setCopiedId((curr) => (curr === p.id ? null : curr))
    }, 2000)
  }

  // Extract all distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [projects])

  // Compute status counts for top filter tabs
  const statusCounts = useMemo(() => {
    let up = 0
    let down = 0
    let disabled = 0
    projects.forEach((p) => {
      if (!p.isEnabled) disabled++
      if (p.currentStatus === 'UP') up++
      else if (p.currentStatus === 'DOWN') down++
    })
    return { all: projects.length, up, down, disabled }
  }, [projects])

  // Filtered projects based on client filters (status & category)
  const displayedProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === 'UP' && p.currentStatus !== 'UP') return false
      if (statusFilter === 'DOWN' && p.currentStatus !== 'DOWN') return false
      if (statusFilter === 'DISABLED' && p.isEnabled) return false
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false
      return true
    })
  }, [projects, statusFilter, categoryFilter])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setForm({
      name: '',
      code: '',
      url: 'https://',
      category: 'Tools',
      description: '',
      sortOrder: (projects.length + 1) * 10,
      isEnabled: true,
      isMonitorEnabled: true,
      checkInterval: 10,
      timeoutSeconds: 5,
      expectedStatusCode: '200'
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (p: Project) => {
    setIsEditing(true)
    setEditingId(p.id)
    setForm({
      name: p.name,
      code: p.code,
      url: p.url,
      category: p.category || '',
      description: p.description || '',
      sortOrder: p.sortOrder || 1,
      isEnabled: p.isEnabled,
      isMonitorEnabled: p.isMonitorEnabled,
      checkInterval: p.checkInterval || 10,
      timeoutSeconds: p.timeoutSeconds || 5,
      expectedStatusCode: p.expectedStatusCode || '200'
    })
    setDialogOpen(true)
  }

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim() || !form.code.trim()) {
      toast.warning('请填写项目名称、唯一标识与URL地址')
      return
    }

    setFormSubmitting(true)
    try {
      if (isEditing && editingId) {
        await updateProject(editingId, form)
        toast.success('项目配置已成功更新')
      } else {
        await createProject(form)
        toast.success('项目服务已成功接入')
      }
      setDialogOpen(false)
      loadProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleEnabled = async (p: Project) => {
    const nextState = !p.isEnabled
    try {
      await toggleProjectEnabled(p.id, nextState)
      setProjects((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isEnabled: nextState } : item))
      )
      toast.success(`项目 ${p.name} 已${nextState ? '开启' : '关闭'}公开展示`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleTriggerCheck = async (id: number) => {
    setCheckingMap((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await manualTriggerCheck(id)
      toast.success(res.message || '即时探测检测完成')
      loadProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setCheckingMap((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return
    try {
      await deleteProject(projectToDelete.id)
      toast.success(`已删除项目 ${projectToDelete.name}`)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      loadProjects()
    } catch (err) {
      console.error(err)
    }
  }

  // Get latency color style
  const getLatencyStyle = (latency?: number) => {
    if (!latency || latency <= 0) return 'text-slate-400'
    if (latency < 250) return 'text-emerald-600 font-semibold'
    if (latency < 500) return 'text-blue-600 font-semibold'
    return 'text-amber-600 font-semibold'
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">项目服务管理</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
              共 {total} 个纳管服务
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            集中管理平台纳管的所有子域名、配置监控策略、检测频次及公网访问路由
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjects}
            disabled={loading}
            className="h-9 px-3.5 gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>刷新列表</span>
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>接入新项目</span>
          </Button>
        </div>
      </div>

      {/* Control Panel: Status Tabs & Search Toolbar */}
      <Card className="border border-slate-200/90 bg-white p-4 shadow-xs rounded-2xl space-y-4">
        {/* Top Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部服务 ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UP')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'UP'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              正常在线 ({statusCounts.up})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DOWN')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'DOWN'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              访问异常 ({statusCounts.down})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISABLED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'DISABLED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              未公开 ({statusCounts.disabled})
            </button>
          </div>

          {/* Category Filter Tag Pill */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">分类:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                    categoryFilter === 'ALL'
                      ? 'bg-slate-200 text-slate-800'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  全部
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                      categoryFilter === cat
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar Row */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="快速搜索服务名称、项目代号或目标 URL..."
              className="pl-10 pr-9 h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs text-slate-900 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('')
                  loadProjects()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              type="submit"
              size="sm"
              className="h-10 px-5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl"
            >
              检索
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setKeyword('')
                setStatusFilter('ALL')
                setCategoryFilter('ALL')
                setCurrentPage(1)
                loadProjects()
              }}
              className="h-10 px-4 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
            >
              重置
            </Button>
          </div>
        </form>
      </Card>

      {/* Projects Table Card */}
      <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="w-16 text-center text-slate-600 font-semibold text-xs">排序</TableHead>
                <TableHead className="min-w-[220px] text-slate-600 font-semibold text-xs">服务项目</TableHead>
                <TableHead className="min-w-[260px] text-slate-600 font-semibold text-xs">目标地址 (URL)</TableHead>
                <TableHead className="w-36 min-w-[130px] text-slate-600 font-semibold text-xs">实时健康度</TableHead>
                <TableHead className="w-28 text-slate-600 font-semibold text-xs">响应耗时</TableHead>
                <TableHead className="w-28 text-center text-slate-600 font-semibold text-xs">公开展示</TableHead>
                <TableHead className="w-32 text-center text-slate-600 font-semibold text-xs">自动监控</TableHead>
                <TableHead className="w-44 text-right pr-6 text-slate-600 font-semibold text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-medium text-slate-600">正在检索纳管服务列表中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <Globe className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">暂无匹配的服务项目</p>
                      <p className="text-slate-500 text-xs">未找到符合当前筛选条件的项目，请尝试重置筛选或新增服务</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenCreate}
                        className="mt-3 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>接入新项目</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedProjects.map((p) => {
                  const isChecking = checkingMap[p.id] || false
                  return (
                    <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/70 transition-colors">
                      {/* Sort Order */}
                      <TableCell className="text-center font-mono text-xs text-slate-400">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/80 font-medium text-slate-600 text-xs">
                          {p.sortOrder}
                        </span>
                      </TableCell>

                      {/* Service Info */}
                      <TableCell>
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-600 font-bold text-xs shadow-xs tracking-wider">
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                              <span className="truncate">{p.name}</span>
                              {p.category && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium whitespace-nowrap">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">
                              {p.code}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* URL with Quick Copy & Open */}
                      <TableCell>
                        <div className="group/url flex items-center gap-2 max-w-sm">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-slate-700 hover:text-blue-600 hover:underline truncate transition-colors"
                            title={p.url}
                          >
                            {p.url}
                          </a>
                          <div className="flex items-center gap-1 opacity-0 group-hover/url:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleCopyUrl(e, p)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="复制网址"
                            >
                              {copiedId === p.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                              title="新窗口打开"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </TableCell>

                      {/* Live Health Status (Fixed: never wraps!) */}
                      <TableCell>
                        <StatusBadge status={p.currentStatus} size="sm" />
                      </TableCell>

                      {/* Latency */}
                      <TableCell>
                        <div className="font-mono text-xs">
                          <span className={getLatencyStyle(p.lastResponseTime)}>
                            {formatLatency(p.lastResponseTime)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Public Portal Switch */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                          <Switch
                            checked={p.isEnabled}
                            onCheckedChange={() => handleToggleEnabled(p)}
                            title={p.isEnabled ? '公开可见' : '已隐藏'}
                          />
                        </div>
                      </TableCell>

                      {/* Auto Monitoring Indicator */}
                      <TableCell className="text-center">
                        {p.isMonitorEnabled ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium"
                            title={`每 ${p.checkInterval} 分钟探测一次`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{p.checkInterval}m</span>
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px]"
                            title="已暂停自动化监控"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>暂停</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            onClick={() => handleTriggerCheck(p.id)}
                            disabled={isChecking}
                            title="立即发起健康度探测"
                          >
                            <Play className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            onClick={() => navigate(`/admin/projects/${p.id}`)}
                            title="查看监控详情与趋势"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            onClick={() => handleOpenEdit(p)}
                            title="编辑服务配置"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            onClick={() => {
                              setProjectToDelete(p)
                              setDeleteDialogOpen(true)
                            }}
                            title="删除项目"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              显示 {displayedProjects.length} 项 · 共计 <strong className="text-slate-800 font-semibold">{total}</strong> 个监控服务
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] bg-white border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <span>{isEditing ? '编辑服务项目' : '接入新服务项目'}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              配置服务域名地址与健康检查规则，SSRF 防护将严格验证合法白名单。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProject} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">项目名称 *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如: AI Helper 助手"
                  className="h-9 text-xs border-slate-200 bg-white text-slate-900 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">唯一代号 (Code) *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="如: ai-helper"
                  className="h-9 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">目标监控地址 (URL) *</label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://ai.bob-api.com/"
                className="h-9 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                required
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>必须为 HTTPS 协议，且属于白名单子域名 (*.bob-api.com)。</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">所属分类标签</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="如: 常用工具, AI平台, VPN"
                  className="h-9 text-xs border-slate-200 bg-white text-slate-900 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">展示排序权重</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">服务简述</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="简短描述该服务的主要能力与定位..."
                className="h-9 text-xs border-slate-200 bg-white text-slate-900 rounded-xl"
              />
            </div>

            {/* Probe Strategy Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>自动化探测策略</span>
                <span className="text-slate-400 font-normal">HTTP GET 巡检</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">检测间隔 (分)</label>
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={form.checkInterval}
                    onChange={(e) => setForm({ ...form, checkInterval: parseInt(e.target.value) || 10 })}
                    className="h-8 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">超时时限 (秒)</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={form.timeoutSeconds}
                    onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 5 })}
                    className="h-8 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">期望状态码</label>
                  <Input
                    value={form.expectedStatusCode}
                    onChange={(e) => setForm({ ...form, expectedStatusCode: e.target.value })}
                    placeholder="200"
                    className="h-8 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-700 font-medium">公开门户展示</span>
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(val) => setForm({ ...form, isEnabled: val })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-700 font-medium">启用定时监控</span>
                <Switch
                  checked={form.isMonitorEnabled}
                  onCheckedChange={(val) => setForm({ ...form, isMonitorEnabled: val })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="border-slate-200 rounded-xl"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                {formSubmitting ? '保存中...' : isEditing ? '保存修改' : '确认新增'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>确认彻底删除？</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs leading-relaxed pt-2">
              确定要永久删除项目「<strong className="text-slate-800">{projectToDelete?.name}</strong>」吗？
              删除后历史监控日志与状态数据将同步清理且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-200 rounded-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
            >
              确认彻底删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
