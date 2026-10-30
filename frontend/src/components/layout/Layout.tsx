import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, Sun, Moon, LogOut, LayoutDashboard, Settings, Home, Users, AlertTriangle, FileText, Wrench, History, Building2, Bot } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui'

const ownerNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/installations', label: 'Installations', icon: Building2 },
  { path: '/analytics', label: 'Analytics', icon: FileText },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Bot },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/warranties', label: 'Warranties', icon: FileText },
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
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const nav = user?.role === 'technician' ? techNav : ownerNav

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-solar-700">SPMS</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {nav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-solar-50 text-solar-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
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
          <h1 className="text-xl font-bold text-solar-700">SPMS</h1>
          <p className="text-xs text-gray-500 mt-1">Solar Performance Monitoring</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-solar-50 text-solar-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
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
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 lg:hidden"></div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-600">
                {user?.full_name || user?.email}
              </span>
              <span className={`badge ${user?.role === 'technician' ? 'badge-warning' : 'badge-info'}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}