import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, User, ArrowRight } from 'lucide-react'
import { loginApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.warning('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      const res = await loginApi({ username, password })
      if (res.data && res.data.token) {
        const { token, username: un, nickname, role } = res.data
        setAuth(token, {
          id: 1,
          username: un,
          nickname,
          role,
          status: 1
        })
        toast.success('登录成功，正在进入控制台')
        const redirect = searchParams.get('redirect') || '/admin'
        navigate(redirect, { replace: true })
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-[20%] left-[30%] w-[32rem] h-[32rem] bg-blue-100/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[30%] w-[28rem] h-[28rem] bg-indigo-100/50 rounded-full blur-[140px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-extrabold text-white text-xl shadow-lg shadow-blue-500/20 mb-4">
            BCC
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BobAPI Control Center
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            统一监控审计控制台 · 管理员身份验证
          </p>
        </div>

        <Card className="border-slate-200 bg-white shadow-xl rounded-2xl p-2">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-base font-semibold text-slate-900">登录控制台</h2>
            <p className="text-xs text-slate-500">
              请输入您的管理员账号凭据以继续访问。
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">用户名</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入管理员用户名"
                    className="pl-10 h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs text-slate-900 focus-visible:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">密码</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入登录密码"
                    className="pl-10 h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs text-slate-900 focus-visible:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-center justify-between">
                <span>预置默认账号：</span>
                <span className="font-mono text-blue-700 font-semibold">admin / admin123</span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl gap-2 font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 mt-2"
              >
                <span>{loading ? '正在验证身份...' : '立即安全登录'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            ← 返回公开项目导航站
          </button>
        </div>
      </div>
    </div>
  )
}
