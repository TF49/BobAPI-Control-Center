import React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  History,
  Settings,
  ExternalLink,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const AdminLayout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const navItems = [
    {
      title: '监控仪表盘',
      path: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
    {
      title: '项目服务管理',
      path: '/admin/projects',
      icon: Server,
      exact: false
    },
    {
      title: '监控审计历史',
      path: '/admin/monitor',
      icon: History,
      exact: false
    },
    {
      title: '系统参数设置',
      path: '/admin/settings',
      icon: Settings,
      exact: false
    }
  ]

  const getPageTitle = () => {
    if (location.pathname === '/admin') return '监控管理仪表盘'
    if (location.pathname.startsWith('/admin/projects/')) return '项目监控详情'
    if (location.pathname.startsWith('/admin/projects')) return '项目服务管理'
    if (location.pathname.startsWith('/admin/monitor')) return '监控审计历史记录'
    if (location.pathname.startsWith('/admin/settings')) return '系统全局设置'
    return '管理控制台'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userInitials = (user?.nickname || user?.username || 'BCC').substring(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-md shadow-blue-500/20">
              BCC
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                BobAPI
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                  Control
                </span>
              </div>
              <div className="text-[11px] text-slate-500">网站可用性监控平台</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
              运维与管理
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-transform group-hover:scale-110',
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span>{item.title}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-4 bg-blue-600 rounded-full" />
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
            onClick={() => navigate('/')}
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>访问公开导航门户</span>
          </Button>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              调度引擎运行中
            </span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/90 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="text-slate-400 font-medium">控制台</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 tracking-tight">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-xs font-bold text-blue-700 border border-blue-200/80 shadow-2xs">
                      {userInitials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                  </div>
                  <div className="text-left text-xs hidden sm:block">
                    <div className="font-semibold text-slate-800 leading-tight">
                      {user?.nickname || user?.username || '管理员'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{user?.role || 'Admin'}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white border-slate-200 shadow-xl rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold text-slate-900">{user?.nickname || user?.username}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{user?.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  <span>公开导航站</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  <span>系统全局配置</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
