import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Installations } from './pages/Installations'
import { InstallationDetail } from './pages/InstallationDetail'
import { Analytics } from './pages/Analytics'
import { AIAssistant } from './pages/AIAssistant'
import { Alerts } from './pages/Alerts'
import { Warranties } from './pages/Warranties'
import { Technicians } from './pages/Technicians'
import { ServiceRequests } from './pages/ServiceRequests'
import { ServiceHistory } from './pages/ServiceHistory'
import { Settings } from './pages/Settings'
import { TechnicianDashboard } from './pages/TechnicianDashboard'
import { TechnicianRequests } from './pages/TechnicianRequests'
import { TechnicianRequestDetail } from './pages/TechnicianRequestDetail'
import { TechnicianServiceHistory } from './pages/TechnicianServiceHistory'
import { TechnicianProfile } from './pages/TechnicianProfile'
import { Layout } from './components/layout/Layout'
import { LoadingScreen } from './components/ui/LoadingScreen'

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'technician' ? '/technician/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    return <Navigate to={user.role === 'technician' ? '/technician/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />

      {/* Owner Portal */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="installations" element={<Installations />} />
        <Route path="installations/:id" element={<InstallationDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="warranties" element={<Warranties />} />
        <Route path="technicians" element={<Technicians />} />
        <Route path="service-requests" element={<ServiceRequests />} />
        <Route path="service-history" element={<ServiceHistory />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Technician Portal */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['technician']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="technician/requests" element={<TechnicianRequests />} />
        <Route path="technician/requests/:id" element={<TechnicianRequestDetail />} />
        <Route path="technician/service-history" element={<TechnicianServiceHistory />} />
        <Route path="technician/profile" element={<TechnicianProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
