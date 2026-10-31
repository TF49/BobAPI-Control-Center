import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { HomePage } from '@/pages/public/HomePage'

// Lazy load non-homepage routes to significantly reduce initial bundle size & load time
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then(m => ({ default: m.AdminLayout })))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProjectsPage = lazy(() => import('@/pages/admin/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('@/pages/admin/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const MonitorHistoryPage = lazy(() => import('@/pages/admin/MonitorHistoryPage').then(m => ({ default: m.MonitorHistoryPage })))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30
    }
  }
})

// Protected Route Guard
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}

// Fallback spinner when lazy loading backoffice routes
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-slate-500 font-medium">模块载入中...</span>
    </div>
  </div>
)

export const App: React.FC = () => {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Portal (Synchronous zero-delay render) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Backoffice Protected Routes */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="monitor" element={<MonitorHistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      {/* Global Notifications */}
      <Toaster
        theme="light"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }
        }}
      />
    </QueryClientProvider>
  )
}

export default App
