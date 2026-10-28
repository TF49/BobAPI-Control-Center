import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  ChevronRight,
  ArrowUpRight,
  User,
  LayoutDashboard
} from 'lucide-react'
import { getPublicProjects, getPublicStatus } from '@/api/public'
import type { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatTimeAgo, formatLatency } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const [projects, setProjects] = useState<Project[]>([])
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    online: 0,
    offline: 0,
    unknown: 0,
    updatedAt: ''
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [countdown, setCountdown] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const [projRes, statRes] = await Promise.all([
        getPublicProjects(),
        getPublicStatus()
      ])
      if (projRes.data) {
        setProjects(projRes.data)
      }
      if (statRes.data) {
        setStatusSummary(statRes.data)
      }
    } catch (err) {
      console.error('Failed to load public portal data', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
      setCountdown(30)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['ALL', ...Array.from(set)]
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.url.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [projects, searchQuery, selectedCategory])

  const openProject = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[-10rem] left-[15%] w-[45rem] h-[30rem] bg-blue-100/50 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5rem] w-[35rem] h-[30rem] bg-indigo-100/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-extrabold text-white text-base shadow-md shadow-blue-500/20">
              BCC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                  BobAPI Control Center
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  LIVE STATUS
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                项目一站式统一导航与高可用网站监控平台
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 hover:text-slate-900 transition-all cursor-pointer select-none shadow-xs"
              title="立即重新获取最新状态"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`}
              />
              <span className="font-mono text-slate-700 font-semibold">{countdown}s</span>
              <span className="hidden sm:inline text-slate-500">自动刷新</span>
            </button>

            {isAuthenticated ? (
              <Button
                onClick={() => navigate('/admin')}
                className="gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>进入控制台</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                size="sm"
              >
                <User className="w-4 h-4" />
                <span>管理员登录</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Status Summary Strip */}
      <section className="relative z-10 pt-10 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Title */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold mb-3 shadow-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>智能双重检测 · 秒级容灾审计</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              BobAPI 核心项目服务导航
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600">
              实时监测子域名集群健康度，提供全天候端到端响应追踪与无缝安全跳转。
            </p>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
              <span className="text-xs font-medium text-slate-500">服务总数</span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
                {statusSummary.total}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center shadow-xs">
              <span className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                正常运行
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-700">
                {statusSummary.online}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-center shadow-xs">
              <span className="text-xs font-semibold text-rose-700 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                访问异常
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-rose-700">
                {statusSummary.offline}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-center shadow-xs">
              <span className="text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                状态检测中
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-amber-700">
                {statusSummary.unknown}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="relative z-10 px-6 pb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
                }`}
              >
                {cat === 'ALL' ? '全部项目' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目名称、地址或描述..."
              className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus-visible:ring-blue-500/20 text-xs text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <main className="relative z-10 flex-1 px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              title="未找到匹配的服务项目"
              description="请尝试调整搜索关键词或分类筛选条件。"
              actionLabel="清除筛选"
              onAction={() => {
                setSearchQuery('')
                setSelectedCategory('ALL')
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => openProject(project.url)}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between cursor-pointer shadow-xs"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-bold transition-transform group-hover:scale-105 shadow-xs">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <StatusBadge status={project.currentStatus} />
                    </div>

                    {/* Title & Desc */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          {project.name}
                          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-blue-600" />
                        </h3>
                        {project.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {project.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {project.description || '暂无描述信息'}
                      </p>
                    </div>

                    {/* URL */}
                    <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 max-w-full truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="truncate">{project.url}</span>
                    </div>
                  </div>

                  {/* Footer Metrics */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] uppercase block text-slate-400">响应延迟</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatLatency(project.lastResponseTime)}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-[10px] uppercase block text-slate-400">上次检测</span>
                        <span className="text-slate-700">
                          {formatTimeAgo(project.lastCheckTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-blue-600 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                      立即访问
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 BobAPI Control Center · 统一监控与安全保障系统</p>
      </footer>
    </div>
  )
}
