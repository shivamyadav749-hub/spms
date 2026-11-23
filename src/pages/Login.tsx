import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Mail, Lock, AlertCircle, User, Wrench } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/ui'

const LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-11-11_at_1.59.36_PM_3c8e8888.jpeg'

export function Login() {
  const navigate = useNavigate()
  const { signIn, loginAsDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err.message)
    else navigate('/dashboard')
  }

  function handleQuickLogin(role: 'owner' | 'technician') {
    loginAsDemo(role)
    navigate(role === 'technician' ? '/technician/dashboard' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-3 group" aria-label="SPMS Home">
          <img
            src={LOGO_URL}
            alt="SPMS — Solar Performance Monitoring System"
            className="h-10 w-auto rounded-lg object-contain border border-gray-200 shadow-xs group-hover:opacity-90 transition-opacity"
          />
          <span className="text-lg font-bold text-solar-700">SPMS</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Link to="/" className="inline-flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="SPMS Logo"
                className="h-16 sm:h-20 w-auto rounded-xl object-contain border border-gray-200 shadow-sm"
              />
            </Link>
            <h1 className="mt-4 sm:mt-5 text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-2 text-gray-600 text-sm">Sign in to monitor your solar system</p>
          </div>

        {/* Demo Quick Logins */}
        <div className="card p-4 sm:p-5 mb-5 sm:mb-6 bg-solar-50 border-solar-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-solar-800 mb-3">
            Quick Demo Access (1-Click)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-solar-300 text-solar-900 hover:bg-solar-100 text-left transition-colors shadow-xs"
            >
              <User className="h-5 w-5 text-solar-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Homeowner</p>
                <p className="text-[10px] text-gray-500">demo-owner</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('technician')}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-deepblue-300 text-deepblue-900 hover:bg-deepblue-50 text-left transition-colors shadow-xs"
            >
              <Wrench className="h-5 w-5 text-deepblue-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Technician</p>
                <p className="text-[10px] text-gray-500">demo-tech</p>
              </div>
            </button>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-solar-600 focus:ring-solar-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-solar-600 hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-solar-600 hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
