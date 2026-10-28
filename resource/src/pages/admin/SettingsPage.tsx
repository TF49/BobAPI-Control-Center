import React, { useState, useEffect } from 'react'
import {
  Save,
  RotateCcw,
  Sliders,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Server,
  Globe,
  Mail,
  Send
} from 'lucide-react'
import { getSettings, updateSettings, sendTestEmail } from '@/api/settings'
import type { Settings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    defaultCheckInterval: 10,
    defaultTimeoutSeconds: 5,
    retryOnFailure: true,
    publicRefreshInterval: 30,
    historyRetentionDays: 30,
    displayTimezone: 'Asia/Shanghai',
    emailAlertEnabled: false,
    smtpHost: '',
    smtpPort: 465,
    smtpUsername: '',
    smtpPassword: '',
    smtpSslEnabled: true,
    smtpFrom: '',
    alertRecipientEmails: ''
  })
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [currentTimePreview, setCurrentTimePreview] = useState<string>('')

  // Update clock preview
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date()
        const formatted = new Intl.DateTimeFormat('zh-CN', {
          timeZone: settings.displayTimezone || 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now)
        setCurrentTimePreview(formatted)
      } catch (e) {
        setCurrentTimePreview('无效时区设置')
      }
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [settings.displayTimezone])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await getSettings()
      if (res.data) {
        setSettings(res.data)
        setInitialSettings(res.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(settings)
      setInitialSettings(settings)
      toast.success('系统全局运行参数已成功保存并即时生效')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.smtpHost) {
      toast.error('请先填写 SMTP 服务器地址')
      return
    }
    if (!settings.smtpUsername) {
      toast.error('请先填写 SMTP 发信账号')
      return
    }
    const targetRecipient =
      testRecipient.trim() ||
      settings.alertRecipientEmails?.split(/[,;，；]/).map((s) => s.trim()).filter((s) => s.includes('@'))[0]

    if (!targetRecipient) {
      toast.error('请填写测试接收邮箱，或在上方配置有效的告警接收人邮箱')
      return
    }

    setTestingEmail(true)
    try {
      await sendTestEmail({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUsername: settings.smtpUsername,
        smtpPassword: settings.smtpPassword,
        smtpSslEnabled: settings.smtpSslEnabled,
        smtpFrom: settings.smtpFrom,
        testRecipient: targetRecipient
      })
      toast.success(`测试邮件已成功发送至 ${targetRecipient}！请前往收件箱查收验证。`)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || '测试邮件发送失败，请检查 SMTP 配置及网络连通性')
    } finally {
      setTestingEmail(false)
    }
  }

  // Restore recommended defaults
  const handleRestoreDefaults = () => {
    setSettings({
      defaultCheckInterval: 10,
      defaultTimeoutSeconds: 5,
      retryOnFailure: true,
      publicRefreshInterval: 30,
      historyRetentionDays: 30,
      displayTimezone: 'Asia/Shanghai',
      emailAlertEnabled: false,
      smtpHost: '',
      smtpPort: 465,
      smtpUsername: '',
      smtpPassword: '',
      smtpSslEnabled: true,
      smtpFrom: '',
      alertRecipientEmails: ''
    })
    toast.info('已载入推荐默认参数，点击下方“保存配置”即可生效')
  }

  const isModified =
    initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">系统全局参数设置</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
              运行中心控制台
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            配置监控调度引擎的探测频次、超时防抖机制、日志归档与公开门户刷新策略
          </p>
        </div>

        {isModified && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              参数存在未保存修改
            </span>
          </div>
        )}
      </div>

      {/* Two-Column Responsive Layout */}
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: System Engine Status & Security Guides (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Status Card */}
            <Card className="border border-slate-200/90 bg-white p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">调度引擎核心状态</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  正常巡检中
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">并发调度核心:</span>
                  <span className="font-semibold text-slate-800">ThreadPoolScheduler</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">探针执行协议:</span>
                  <span className="font-semibold text-slate-800">HTTP/1.1 & HTTPS GET</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">域名白名单校验:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>*.bob-api.com</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">防抖重试防线:</span>
                  <span className="font-semibold text-slate-800">
                    {settings.retryOnFailure ? '已启用 (1秒二次复查)' : '已停用'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">邮件告警通知:</span>
                  <span className="font-semibold">
                    {settings.emailAlertEnabled ? (
                      <span className="text-emerald-600 font-medium">已启用</span>
                    ) : (
                      <span className="text-slate-400 font-normal">未启用</span>
                    )}
                  </span>
                </div>
              </div>
            </Card>

            {/* Strategy Guidelines Card */}
            <Card className="border border-slate-200/90 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/60 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>运维优化推荐指南</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">探测频次均衡:</strong> 建议常规服务设置为 5~15
                    分钟，避免高频请求增加被探测节点负担。
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">超时与防抖联动:</strong>{' '}
                    开启失败复查可有效剔除由于瞬间微小网络闪断导致的误警报。
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">数据归档清理:</strong> 历史审计按需保留 30~90
                    天，后台定期清理可保证数据库查询极致流畅。
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Setting Forms (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Group 1: Probe Engine & Detection Parameters */}
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm text-slate-900 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">监控引擎与探测参数配置</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      定义探针默认发起 HTTP 巡检时的周期策略与超时防线
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Check Interval & Timeout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Default Check Interval */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        默认检查间隔
                      </label>
                      <span className="text-[11px] text-slate-400">新建服务时继承</span>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="1440"
                        value={settings.defaultCheckInterval}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultCheckInterval: parseInt(e.target.value) || 10
                          })
                        }
                        className="h-10 pr-14 text-xs font-mono font-medium border-slate-200 bg-white text-slate-900 rounded-xl focus-visible:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        分钟
                      </span>
                    </div>

                    {/* Quick Interval Pills */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSettings({ ...settings, defaultCheckInterval: mins })}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                            settings.defaultCheckInterval === mins
                              ? 'bg-blue-100 text-blue-700 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Default Timeout Seconds */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        默认 HTTP 超时上限
                      </label>
                      <span className="text-[11px] text-slate-400">连接超时判定</span>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={settings.defaultTimeoutSeconds}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultTimeoutSeconds: parseInt(e.target.value) || 5
                          })
                        }
                        className="h-10 pr-14 text-xs font-mono font-medium border-slate-200 bg-white text-slate-900 rounded-xl focus-visible:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        秒
                      </span>
                    </div>

                    {/* Quick Timeout Pills */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[2, 3, 5, 10, 15].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSettings({ ...settings, defaultTimeoutSeconds: sec })}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                            settings.defaultTimeoutSeconds === sec
                              ? 'bg-blue-100 text-blue-700 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Retry On Failure Box */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-900">
                        探测失败自动复查与防抖动机制 (Debounce Retry)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pr-2">
                      当首次探测检测出现非预期状态码或超时时，立即自动延迟 1 秒发起二次复核。连续两次探测均确认失败才正式判定为
                      DOWN 故障状态，有效杜绝网络瞬间微弱波动产生的误报告警。
                    </p>
                  </div>
                  <Switch
                    checked={settings.retryOnFailure}
                    onCheckedChange={(val) => setSettings({ ...settings, retryOnFailure: val })}
                    className="shrink-0 mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Group 2: Public Display & Data Retention */}
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm text-slate-900 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">数据归档、时区与公开门户策略</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      管理导航公开门户自动刷新周期、审计历史保存时间及系统标准时区
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Public Refresh Interval */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        公开门户倒计时刷新
                      </label>
                      <span className="text-[11px] text-slate-400">公开大屏轮询</span>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min="5"
                        max="300"
                        value={settings.publicRefreshInterval}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            publicRefreshInterval: parseInt(e.target.value) || 30
                          })
                        }
                        className="h-10 pr-14 text-xs font-mono font-medium border-slate-200 bg-white text-slate-900 rounded-xl focus-visible:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        秒
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {[15, 30, 45, 60, 120].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSettings({ ...settings, publicRefreshInterval: sec })}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                            settings.publicRefreshInterval === sec
                              ? 'bg-indigo-100 text-indigo-700 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* History Retention Days */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        审计日志归档周期
                      </label>
                      <span className="text-[11px] text-slate-400">自动清理老旧流水</span>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.historyRetentionDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            historyRetentionDays: parseInt(e.target.value) || 30
                          })
                        }
                        className="h-10 pr-14 text-xs font-mono font-medium border-slate-200 bg-white text-slate-900 rounded-xl focus-visible:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        天
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {[7, 14, 30, 60, 90, 180].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setSettings({ ...settings, historyRetentionDays: days })}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                            settings.historyRetentionDays === days
                              ? 'bg-indigo-100 text-indigo-700 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {days}天
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Display Timezone Field with Live Clock */}
                <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>系统基准展示时区 (Timezone)</span>
                    </label>
                    <div className="text-[11px] text-slate-500 font-mono">
                      当前时区预览: <strong className="text-blue-600 font-bold">{currentTimePreview}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      value={settings.displayTimezone}
                      onChange={(e) => setSettings({ ...settings, displayTimezone: e.target.value })}
                      placeholder="Asia/Shanghai"
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl flex-1"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      {['Asia/Shanghai', 'UTC', 'America/New_York', 'Asia/Tokyo'].map((tz) => (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => setSettings({ ...settings, displayTimezone: tz })}
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-mono transition-colors ${
                            settings.displayTimezone === tz
                              ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tz.split('/')[1] || tz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Group 3: Email Alert & Notification Settings */}
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-900 flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">邮件告警与通知服务 (Email Alerts)</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        当受控网站发生宕机 (DOWN) 或重新恢复 (UP) 时，通过 SMTP 发送告警邮件
                      </div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      {settings.emailAlertEnabled ? '告警已启用' : '告警已停用'}
                    </span>
                    <Switch
                      checked={!!settings.emailAlertEnabled}
                      onCheckedChange={(val) => setSettings({ ...settings, emailAlertEnabled: val })}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* SMTP Presets */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      常用 SMTP 服务商一键预设
                    </span>
                    <span className="text-[11px] text-slate-400">点击自动填充服务器与端口</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[
                      { name: 'QQ 邮箱', host: 'smtp.qq.com', port: 465, ssl: true },
                      { name: '163 网易邮箱', host: 'smtp.163.com', port: 465, ssl: true },
                      { name: '飞书企业邮箱', host: 'smtp.feishu.cn', port: 465, ssl: true },
                      { name: '阿里企业邮箱', host: 'smtp.mxhichina.com', port: 465, ssl: true },
                      { name: 'Gmail', host: 'smtp.gmail.com', port: 587, ssl: false }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setSettings({
                            ...settings,
                            smtpHost: preset.host,
                            smtpPort: preset.port,
                            smtpSslEnabled: preset.ssl
                          })
                          toast.info(`已载入 ${preset.name} 预设: ${preset.host}:${preset.port}`)
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          settings.smtpHost === preset.host
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SMTP Server & Port & SSL */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-xs font-semibold text-slate-800">
                      SMTP 服务器地址
                    </label>
                    <Input
                      placeholder="如 smtp.qq.com 或 smtp.feishu.cn"
                      value={settings.smtpHost || ''}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-semibold text-slate-800">
                      SMTP 端口
                    </label>
                    <Input
                      type="number"
                      placeholder="465"
                      value={settings.smtpPort || ''}
                      onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 465 })}
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-semibold text-slate-800">
                      SSL/TLS 加密传输
                    </label>
                    <div className="h-10 flex items-center justify-between px-3 border border-slate-200 rounded-xl bg-slate-50/50">
                      <span className="text-xs text-slate-600">
                        {settings.smtpSslEnabled ? '开启 (推荐 465)' : '关闭 (STARTTLS 587)'}
                      </span>
                      <Switch
                        checked={settings.smtpSslEnabled ?? true}
                        onCheckedChange={(val) => setSettings({ ...settings, smtpSslEnabled: val })}
                      />
                    </div>
                  </div>
                </div>

                {/* Account & Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-800">
                      发信账号 / 用户名
                    </label>
                    <Input
                      placeholder="如 notice@domain.com 或 123456@qq.com"
                      value={settings.smtpUsername || ''}
                      onChange={(e) => setSettings({ ...settings, smtpUsername: e.target.value })}
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        SMTP 密码 / 客户端授权码
                      </label>
                      <span className="text-[11px] text-slate-400">如 QQ/163 授权码</span>
                    </div>
                    <Input
                      type="password"
                      placeholder={settings.smtpPassword ? '****** (已配置，留空或保持星号不修改)' : '请输入发信密码或授权码'}
                      value={settings.smtpPassword || ''}
                      onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>
                </div>

                {/* From Name & Recipients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        发信人别名 / 地址
                      </label>
                      <span className="text-[11px] text-slate-400">可选，默认使用发信账号</span>
                    </div>
                    <Input
                      placeholder="如 BobAPI 运维监控 <alert@domain.com>"
                      value={settings.smtpFrom || ''}
                      onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                      className="h-10 text-xs border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        告警通知接收人邮箱
                      </label>
                      <span className="text-[11px] text-slate-400">支持多个邮箱，英文逗号分隔</span>
                    </div>
                    <Input
                      placeholder="admin@bob-api.com, ops@domain.com"
                      value={settings.alertRecipientEmails || ''}
                      onChange={(e) => setSettings({ ...settings, alertRecipientEmails: e.target.value })}
                      className="h-10 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                  </div>
                </div>

                {/* Send Test Email Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50/50 via-slate-50 to-blue-50/40 border border-slate-200/90 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-slate-900">
                        SMTP 发信通道即时验证
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      向指定测试邮箱立即派发一封连通性探测邮件，即时校验服务器地址、认证凭据及端口通道是否畅通
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <Input
                      placeholder="留空默认发至接收人邮箱"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="h-9 w-full md:w-56 text-xs font-mono border-slate-200 bg-white text-slate-900 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="h-9 px-4 text-xs font-medium border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 rounded-xl shrink-0 gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testingEmail ? '正在探测中...' : '发送测试邮件'}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Floating/Docked Action Bar */}
            <Card className="border border-slate-200/90 bg-white p-4 shadow-xs rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRestoreDefaults}
                className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>载入推荐默认参数</span>
              </Button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadSettings}
                  disabled={saving}
                  className="h-9 px-4 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>放弃修改 / 还原</span>
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="h-9 px-5 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 font-medium rounded-xl"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? '正在保存中...' : '保存全局运行参数'}</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
