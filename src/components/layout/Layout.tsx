import { Outlet, NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
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
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isTechnician = user?.role === 'technician'
  const nav = isTechnician ? techNav : ownerNav

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden`}
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
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {nav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-solar-50 text-solar-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
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
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-solar-50 text-solar-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
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
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link to="/" className="flex items-center gap-2.5 group" aria-label="SPMS Home">
                <img
                  src={LOGO_URL}
                  alt="SPMS — Solar Performance Monitoring System"
                  className="h-9 w-auto rounded-md object-contain border border-gray-200 shadow-xs group-hover:opacity-90 transition-opacity"
                />
                <span className="font-bold text-solar-700 text-base">SPMS</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
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
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
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
