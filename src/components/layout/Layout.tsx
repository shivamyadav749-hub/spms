import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Menu,
  LogOut,
  LayoutDashboard,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  Wrench,
  History,
  Building2,
  Bot,
  Shield,
  ArrowRightLeft,
  Bell,
  BrainCircuit,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { appStore } from '../../services/store'
import { Button } from '../ui'

const LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-11-11_at_1.59.36_PM_3c8e8888.jpeg'

const ownerNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/installations', label: 'Installations', icon: Building2 },
  { path: '/analytics', label: 'Analytics', icon: FileText },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Bot },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/warranties', label: 'Warranties', icon: Shield },
  { path: '/technicians', label: 'Technicians', icon: Users },
  { path: '/service-requests', label: 'Service Requests', icon: Wrench },
  { path: '/service-history', label: 'Service History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const techNav = [
  { path: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/technician/requests', label: 'Requests', icon: FileText },
  { path: '/technician/service-history', label: 'History', icon: History },
  { path: '/technician/profile', label: 'Profile', icon: Settings },
]

export function Layout() {
  const { user, signOut, loginAsDemo } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [alertSummary, setAlertSummary] = useState(() => appStore.getAllActiveAlertsSummary())
  const isTechnician = user?.role === 'technician'
  const nav = isTechnician ? techNav : ownerNav

  useEffect(() => {
    const refreshAlerts = () => {
      setAlertSummary(appStore.getAllActiveAlertsSummary())
    }
    refreshAlerts()
    window.addEventListener('spms-alerts-updated', refreshAlerts)
    return () => window.removeEventListener('spms-alerts-updated', refreshAlerts)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <img
                src={LOGO_URL}
                alt="SPMS Logo"
                className="h-10 w-auto rounded-lg object-contain border border-gray-200 shadow-xs"
              />
              <div>
                <h1 className="text-lg font-bold text-solar-700 leading-none">SPMS</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">Solar Monitoring</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {nav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-solar-50 text-solar-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </span>
                {item.path === '/alerts' && alertSummary.totalActive > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                    {alertSummary.totalActive}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => loginAsDemo(isTechnician ? 'owner' : 'technician')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-solar-700 bg-solar-50 border border-solar-200 rounded-lg hover:bg-solar-100"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Switch to {isTechnician ? 'Homeowner' : 'Technician'}
            </button>
            <Button variant="outline" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 bg-white border-r border-gray-200 lg:flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={LOGO_URL}
              alt="SPMS Logo"
              className="h-11 w-auto rounded-lg object-contain border border-gray-200 shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <div>
              <h1 className="text-xl font-bold text-solar-700 leading-none">SPMS</h1>
              <p className="text-[11px] text-gray-500 mt-1">Solar Performance Monitoring</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-solar-50 text-solar-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
              {item.path === '/alerts' && alertSummary.totalActive > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                  {alertSummary.totalActive}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Role switcher & Signout */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => loginAsDemo(isTechnician ? 'owner' : 'technician')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-solar-700 bg-solar-50 border border-solar-200 rounded-lg hover:bg-solar-100 transition-colors"
            title="Toggle between Homeowner and Technician personas"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Switch to {isTechnician ? 'Homeowner' : 'Technician'}
          </button>
          <Button variant="outline" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                className="lg:hidden p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0" aria-label="SPMS Home">
                <img
                  src={LOGO_URL}
                  alt="SPMS — Solar Performance Monitoring System"
                  className="h-8 sm:h-9 w-auto rounded-md object-contain border border-gray-200 shadow-xs group-hover:opacity-90 transition-opacity flex-shrink-0"
                />
                <span className="font-bold text-solar-700 text-sm sm:text-base truncate">SPMS</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 relative flex-shrink-0">
              {!isTechnician && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen(prev => !prev)}
                    className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Alert notifications"
                    title="Active & ML predictive alerts"
                  >
                    <Bell className="h-5 w-5" />
                    {alertSummary.totalActive > 0 && (
                      <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {alertSummary.totalActive}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNotifOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                        <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900">
                            Active Notifications ({alertSummary.totalActive})
                          </span>
                          {alertSummary.predictiveActive > 0 && (
                            <span className="text-[11px] font-medium text-deepblue-700 flex items-center gap-1">
                              <BrainCircuit className="h-3.5 w-3.5" />
                              {alertSummary.predictiveActive} ML
                            </span>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                        {alertSummary.recentActive.length === 0 ? (
                          <p className="p-4 text-xs text-gray-500 text-center">
                            No active alerts. All diagnostics normal.
                          </p>
                        ) : (
                          alertSummary.recentActive.map(a => (
                            <Link
                              key={a.id}
                              to="/alerts"
                              onClick={() => setNotifOpen(false)}
                              className="block px-3.5 py-2.5 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-gray-900 truncate">
                                  {a.title}
                                </span>
                                {a.source === 'ml_predictive' && (
                                  <span className="text-[10px] font-semibold text-deepblue-700 bg-deepblue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                    ML
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                                {a.message}
                              </p>
                            </Link>
                          ))
                        )}
                      </div>
                      <Link
                        to="/alerts"
                        onClick={() => setNotifOpen(false)}
                        className="block text-center py-2.5 text-xs font-medium text-solar-700 bg-gray-50 border-t border-gray-100 hover:bg-gray-100"
                      >
                        Open Alerts & ML Diagnostics
                      </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
              <span className="hidden sm:inline-block text-xs bg-solar-50 text-solar-700 px-2.5 py-1 rounded-full font-medium border border-solar-200">
                Demo Mode
              </span>
              <span className="hidden sm:block text-sm text-gray-700 font-medium">
                {user?.full_name || user?.email}
              </span>
              <span
                className={`badge uppercase tracking-wider text-[10px] font-semibold ${
                  user?.role === 'technician' ? 'badge-warning' : 'badge-info'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
