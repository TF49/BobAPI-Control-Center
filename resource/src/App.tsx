import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { HomePage } from '@/pages/public/HomePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { ProjectsPage } from '@/pages/admin/ProjectsPage'
import { ProjectDetailPage } from '@/pages/admin/ProjectDetailPage'
import { MonitorHistoryPage } from '@/pages/admin/MonitorHistoryPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'

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

export const App: React.FC = () => {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Portal */}
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
